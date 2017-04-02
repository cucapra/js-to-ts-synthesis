import { transformFileSync } from "babel-core";
import * as fs from "fs";
import * as path from "path";

import {Map} from "immutable";
import * as hooks from "./instrumentation/hooks";
import {FunctionInfo} from "./Module";
import {Workspace} from "./Workspace";

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
    functionInfo: FunctionInfo;
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

    trace(): Map<string, FunctionCalls> {
        let exportedFunctions = this.workspace.getModule().exportedFunctions;
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

    private injectInstrumentation(sourceFile: string, hooks?: {instrumentationOutputFile: string, exportedFunctions: Map<string, FunctionInfo>}) {
        // Aran struggles with const expressions for some reason. Use babel to get rid of those.
        // Also gives us a smaller subset of JS to work with.
        let source = transformFileSync(sourceFile, {presets: ["env"]}).code;

        // Clean up the js to ease with debugging.
        source = js_beautify(Aran({namespace: "_meta_", traps: ["apply", "return"]}).instrument(source));

        if (hooks) {
            source =
`
var instrumentationOutputFile = '${hooks.instrumentationOutputFile}';
var exportedFunctions = ${JSON.stringify(hooks.exportedFunctions.keySeq().toArray())};
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

    private readInstrumentationOutput(instrumentationOutputFile: string, exportedFunctions: Map<string, FunctionInfo>): Map<string, FunctionCalls> {

        let calls = Map<string, FunctionCalls>().withMutations(calls => {
            let lrs = new LineReaderSync(instrumentationOutputFile);

            while (true) {
                let line = lrs.readline();
                if (line == null) break;
                let lineObj = <hooks.InstrumentationLine>JSON.parse(line);

                switch (lineObj.type) {
                    case "FunctionCall":
                        // If this is the first instance of this function, pull in the arg names as well.
                        if (!calls.has(lineObj.name))
                            calls.set(lineObj.name, {file: lineObj.file, functionInfo: exportedFunctions.get(lineObj.name), calls: []});
                        calls.get(lineObj.name).calls.push({args: lineObj.args, returnValue: lineObj.returnValue});
                        break;
                    case "UnbalancedEntryExit":
                        throw new UnbalancedEntryExitError(lineObj);
                }
            }
        });

        console.log(`Read instrumentation for ${calls.size} functions.`);

        this.checkCoverage(calls, exportedFunctions);

        return calls;
    }

    private checkCoverage(calls: Map<string, FunctionCalls>, exportedFunctions: Map<string, FunctionInfo>) {
        let exportedFunctionsWithNoTests = 0;
        for (let f in exportedFunctions.keySeq().toArray()) {
            if (!calls.has(f)) {
                console.log(`Note: ${f} has no tests, and thus will have no type signature.`);
                exportedFunctionsWithNoTests++;
            }
        }
        if (exportedFunctionsWithNoTests > 0)
            console.log(`${exportedFunctionsWithNoTests}/${exportedFunctions.size} have no tests.`);
    }
}
