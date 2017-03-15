import * as path from "path";
import * as fs from "fs";
import { transformFileSync } from "babel-core";

import {Workspace} from "./Workspace";
import {FunctionEntry, FunctionExit, InstrumentationLine} from "./instrumentation/hooks";

// No definition file for this one.
let LineReaderSync = require("line-reader-sync");
let Aran = require("aran");
let js_beautify = require("js-beautify").js_beautify;

let INSTRUMENTATION_CODE = fs.readFileSync(path.join(__dirname, "instrumentation", "hooks.js"), "utf-8");

export interface FunctionCall {
    args: any[];
    returnValue: any;
}

export interface FunctionCalls {
    file: string; // The file where the function is defined.
    argNames: string[];
    calls: FunctionCall[];
}

class UnbalancedEntryExitError extends Error {
  constructor(entry: FunctionEntry | undefined, exit: FunctionExit) {
    super("Entered " + entry + ", but exited " + exit);
  }
}

export class ExecutionTracer {

    private workspace: Workspace;

    constructor(workspace: Workspace) {
        this.workspace = workspace;
    }

    trace(): { [functionName: string]: FunctionCalls } {
        let exportedFunctions = this.workspace.getExportedFunctions();
        let instrumentationOutputFile = path.join(this.workspace.directory, "instrumentation_output.txt");
        let testDirectory = this.workspace.testDirectory;

        // Add some code to trace function inputs and outputs.
        this.injectInstrumentation(this.workspace.mainFile);

        for (let testFile of fs.readdirSync(testDirectory)) {
            testFile = path.join(testDirectory, testFile);
            if (path.extname(testFile) === ".js")
                this.injectInstrumentation(testFile, {instrumentationOutputFile: instrumentationOutputFile, exportedFunctions: exportedFunctions});
        }

        this.workspace.runTests();
        return this.readInstrumentationOutput(instrumentationOutputFile, exportedFunctions);
    }

    private injectInstrumentation(sourceFile: string, hooks?: {instrumentationOutputFile: string, exportedFunctions: string[]}) {
        // Aran struggles with const expressions for some reason. Use babel to get rid of those.
        // Also gives us a smaller subset of JS to work with.
        let source = transformFileSync(sourceFile, {presets: ["env"]}).code;

        // Clean up the js to ease with debugging.
        source = js_beautify(Aran({namespace: "_meta_", traps: ["apply", "return"]}).instrument(source));

        if (hooks) {
            source =
`
var instrumentationOutputFile = '${hooks.instrumentationOutputFile}';
var exportedFunctions = ${JSON.stringify(hooks.exportedFunctions)};
var mainFile = '${this.workspace.mainFile}';
${INSTRUMENTATION_CODE}
${source}
`;
        }

        // Disable linter. These warnings aren't meaningful for instrumented code.
        source = `
/* eslint-disable */
${source}`;

        fs.writeFileSync(sourceFile, source);
    }

    private readInstrumentationOutput(instrumentationOutputFile: string, exportedFunctions: string[]): { [functionName: string]: FunctionCalls } {
        let calls: { [filename: string]: FunctionCalls } = {};
        let callStack: FunctionEntry[] = [];

        let lrs = new LineReaderSync(instrumentationOutputFile);

        while (true) {
            let line = lrs.readline();
            if (line == null) break;
            let lineObj = <InstrumentationLine>JSON.parse(line);
            if (lineObj.type === "entry") {
                callStack.push(lineObj);
            }
            else {
                let exit = lineObj;
                let entry = callStack.pop();

                if (entry === undefined || entry.name !== exit.name || entry.file !== exit.file) {
                    throw new UnbalancedEntryExitError(entry, exit);
                }

                let numArgs = Object.keys(entry.args).length;

                let argsList = [];
                for (let i = 0; i < numArgs; i++) {
                    argsList.push(entry.args[i]);
                }

                // If this is the first instance of this function, pull in the arg names as well.
                if (!(entry.name in calls)) {
                    calls[entry.name] = {file: entry.file, argNames: entry.argNames, calls: []};
                }
                calls[entry.name].calls.push({args: argsList, returnValue: exit.returnValue});
            }
        }

        console.log(`Read instrumentation for ${Object.keys(calls).length} functions.`);

        this.checkCoverage(calls, exportedFunctions);

        return calls;
    }

    private checkCoverage(calls: { [functionName: string]: FunctionCalls }, exportedFunctions: string[]) {
        let exportedFunctionsWithNoTests = 0;
        for (let f of exportedFunctions){
            if (!(f in calls)) {
                console.log(`Note: ${f} has no tests, and thus will have no type signature.`);
                exportedFunctionsWithNoTests++;
            }
        }
        console.log(`${exportedFunctionsWithNoTests}/${exportedFunctions.length} have no tests.`);
    }
}
