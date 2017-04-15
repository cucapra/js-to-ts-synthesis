
import * as fs from "fs";
import * as path from "path";

import {Map} from "immutable";
import * as hooks from "./instrumentation/hooks";
import {fileForTag, FunctionInfo, FunctionsMap, FunctionTag} from "./Module";
import {Workspace} from "./Workspace";

// No definition file for this one.
let LineReaderSync = require("line-reader-sync");

export interface FunctionCall {
    args: {}[];
    returnValue: {};
}

export interface FunctionCalls {
    info: FunctionInfo;
    calls: FunctionCall[];
}

export interface ArgDef {
    name: string;
    typeofChecks: {"===": string[], "!==": string[]};
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

    trace(): FunctionsMap<FunctionCalls> {
        // Disable linter. These warnings aren't meaningful for instrumented code.
        this.disableLinter();

        this.workspace.runTests();
        return this.readInstrumentationOutput(this.workspace.instrumentationOutputFile, this.workspace.module.exportedFunctions);
    }

    private disableLinter() {
        fs.appendFileSync(path.join(this.workspace.directory, ".eslintignore"), "\n**/*.js");
    }

    private readInstrumentationOutput(instrumentationOutputFile: string, exportedFunctions: FunctionsMap<FunctionInfo>): FunctionsMap<FunctionCalls> {

        let calls0 = Map<FunctionTag, FunctionCall[]>().withMutations(calls => {
            let lrs = new LineReaderSync(instrumentationOutputFile);

            while (true) {
                let line = lrs.readline();
                if (line == null) break;
                let lineObj = <hooks.InstrumentationLine>JSON.parse(line);

                switch (lineObj.type) {
                    case "FunctionCall":
                        // If this is the first instance of this function, pull in the arg names as well.
                        if (!calls.has(lineObj.tag))
                            calls.set(lineObj.tag, []);
                        calls.get(lineObj.tag).push({args: lineObj.args, returnValue: lineObj.returnValue});
                        break;
                    case "UnbalancedEntryExit":
                        throw new UnbalancedEntryExitError(lineObj);
                }
            }
        });

        console.log(`Read instrumentation for ${calls0.size} functions.`);

        let calls = calls0
            .groupBy((value, tag) => fileForTag(tag, exportedFunctions))
            .map((seq, sourceFile) => seq.map((calls, tag) => ({
                info: exportedFunctions.get(sourceFile).get(tag),
                calls: calls
            })).toMap()).toMap();

        this.checkCoverage(calls, exportedFunctions);
        this.extendAllArgs(calls);

        return calls;
    }

    private checkCoverage(calls: FunctionsMap<FunctionCalls>, exportedFunctions: FunctionsMap<FunctionInfo>) {
        let exportedFunctionsWithNoTests = 0;
        for (let f of exportedFunctions.keySeq().toArray()) {
            if (!calls.has(f)) {
                console.log(`Note: ${f} has no tests, and thus will have no type signature.`);
                exportedFunctionsWithNoTests++;
            }
        }
        if (exportedFunctionsWithNoTests > 0)
            console.log(`${exportedFunctionsWithNoTests}/${exportedFunctions.size} have no tests.`);
    }

    private extendAllArgs(calls: FunctionsMap<FunctionCalls>) {
        for (let m of calls.valueSeq().toArray()) {
            for (let e of m.valueSeq().toArray()) {
                let numArgs = 0;
                for (let call of e.calls) {
                    if (call.args.length > numArgs)
                        numArgs = call.args.length;
                }
                e.info.extendArgs(numArgs);
            }
        }
    }
}
