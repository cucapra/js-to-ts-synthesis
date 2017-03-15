import * as path from "path";
import * as fs from "fs";
import { transformFileSync } from "babel-core";

import {Workspace} from "./Workspace";
import * as hooks from "./instrumentation/hooks";

// No definition file for this one.
let LineReaderSync = require("line-reader-sync");
let Aran = require("aran");
let js_beautify = require("js-beautify").js_beautify;


let INSTRUMENTATION_CODE = fs.readFileSync(path.join(__dirname, "instrumentation", "hooks.js"), "utf-8");

export interface FunctionCall {
    args: any[];
    returnValue: any;
}

export interface ArgDef {
    name: string;
    typeofChecks: {"===": string[], "!==": string[]};
}

export interface FunctionCalls {
    file: string; // The file where the function is defined.
    argDefs: ArgDef[];
    calls: FunctionCall[];
}

class UnbalancedEntryExitError extends Error {
  constructor(details: hooks.UnbalancedEntryExit) {
    super(`Unbalanced entry/exit: ${details}`);
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

        // Add some code to trace function inputs and outputs.
        this.injectInstrumentation(this.workspace.mainFile);

        for (let testFile of this.workspace.testFiles) {
            if (path.extname(testFile) === ".js")
                this.injectInstrumentation(testFile, {instrumentationOutputFile: instrumentationOutputFile, exportedFunctions: exportedFunctions});
        }

        // Disable linter. These warnings aren't meaningful for instrumented code.
        this.disableLinter();

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

        fs.writeFileSync(sourceFile, source);
    }

    private disableLinter() {
        fs.appendFileSync(path.join(this.workspace.directory, ".eslintignore"), "\n**/*.js");
    }

    private readInstrumentationOutput(instrumentationOutputFile: string, exportedFunctions: string[]): { [functionName: string]: FunctionCalls } {
        let calls: { [filename: string]: FunctionCalls } = {};

        let lrs = new LineReaderSync(instrumentationOutputFile);

        while (true) {
            let line = lrs.readline();
            if (line == null) break;
            let lineObj = <hooks.InstrumentationLine>JSON.parse(line);

            switch (lineObj.type) {
                case "FunctionCall":
                    // If this is the first instance of this function, pull in the arg names as well.
                    if (!(lineObj.name in calls)) {
                        calls[lineObj.name] = {file: lineObj.file, argDefs: lineObj.argDefs, calls: []};
                    }
                    calls[lineObj.name].calls.push({args: lineObj.args, returnValue: lineObj.returnValue});
                    break;
                case "UnbalancedEntryExit":
                    throw new UnbalancedEntryExitError(lineObj);
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
        if (exportedFunctionsWithNoTests > 0)
            console.log(`${exportedFunctionsWithNoTests}/${exportedFunctions.length} have no tests.`);
    }
}
