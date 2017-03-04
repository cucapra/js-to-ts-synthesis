import * as path from "path";
import * as fs from "fs";

import {Workspace} from "./Workspace";

// No definition file for this one.
let LineReaderSync = require("line-reader-sync");

interface FunctionEntry {
    name: string;
    file: string;
    argNames: string[];
    args: any; /*Dictionary<number, any>*/
}

interface FunctionExit {
    name: string;
    file: string;
    // exception: boolean; (Might be useful later)
    returnValue: any;
}

interface InstrumentationLine {
    // Exactly one of these will be set.

    entry: FunctionEntry;
    exit: FunctionExit;
}

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
    private static FUNCTIONS_TO_IGNORE = ["[Anonymous]"];

    private workspace: Workspace;


    constructor(workspace: Workspace) {
        this.workspace = workspace;
    }

    trace(): { [functionName: string]: FunctionCalls } {
        let exportedFunctions = this.workspace.getExportedFunctions();
        let instrumentationOutputFile = path.join(this.workspace.directory, "instrumentation_output.txt");

        // Add some code to trace function inputs and outputs, using https://www.npmjs.com/package/njstrace
        // This extra logic to prepended to each test file.
        let testDirectory = this.workspace.testDirectory;
        let es6Enabled = this.workspace.es6Enabled;
        for (let testFile of fs.readdirSync(testDirectory)) {
            testFile = path.join(testDirectory, testFile);
            if (path.extname(testFile) === ".js") {

                let source = fs.readFileSync(testFile, "utf-8");
                let useStrict = source.indexOf("'use strict';\n") === 0;
                if (useStrict)
                    source = source.substr("'use strict';\n".length);

                fs.writeFileSync(testFile, `
${useStrict ? "'use strict';" : ""}
/*eslint-disable */
${es6Enabled ? "require('babel-register');" : ""}
var Formatter = require('njstrace/lib/formatter.js');
var fs = require('fs');
var outFd = fs.openSync('${instrumentationOutputFile}', 'a');
var exportedFunctions = ${JSON.stringify(exportedFunctions)};
function MyFormatter() {}
require('util').inherits(MyFormatter, Formatter);
MyFormatter.prototype.onEntry = function(args) {if (exportedFunctions.indexOf(args.name)>-1) { fs.writeSync(outFd, JSON.stringify({'entry': args}) + '\\n'); }};
MyFormatter.prototype.onExit = function(args) {if (exportedFunctions.indexOf(args.name)>-1) { fs.writeSync(outFd, JSON.stringify({'exit': args}) + '\\n'); }};
var njstrace = require('njstrace').inject({ formatter: new MyFormatter() });
/*eslint-enable */
`);

                fs.appendFileSync(testFile, source);
            }
        }

        this.workspace.runTests();
        return this.readInstrumentationOutput(instrumentationOutputFile, exportedFunctions);
    }

    private readInstrumentationOutput(instrumentationOutputFile: string, exportedFunctions: string[]): { [functionName: string]: FunctionCalls } {
        let calls: { [filename: string]: FunctionCalls } = {};
        let callStack = [];

        let lrs = new LineReaderSync(instrumentationOutputFile);

        while (true) {
            let line = lrs.readline();
            if (line == null) break;
            let lineObj = <InstrumentationLine>JSON.parse(line);
            if (lineObj.entry != null) {
                callStack.push(lineObj.entry);
            }
            else {
                let exit = lineObj.exit;
                let entry = callStack.pop();

                if (entry === undefined || entry.name !== exit.name || entry.file !== exit.file) {
                    throw new UnbalancedEntryExitError(entry, exit);
                }

                if (ExecutionTracer.FUNCTIONS_TO_IGNORE.indexOf(entry.name) === -1) {

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
