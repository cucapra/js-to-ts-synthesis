import * as fs from "fs";

// _meta_ is the global this sets later.
declare var _meta_: {};

// These are assumed to be there.
declare var tagFor: (fct: Function) => number;
declare var instrumentationOutputFile: string;
declare var exportedFunctions: number[];

export interface FunctionEntry {
    tag: number;
    args: {}[];
}

export interface FunctionExit {
    returnValue: {};
}

export interface FunctionCall extends FunctionEntry, FunctionExit {
    type: "FunctionCall";
};

export interface UnbalancedEntryExit {
    type: "UnbalancedEntryExit";
    entry?: FunctionEntry;
    exit: FunctionExit;
}

export type InstrumentationLine = FunctionCall | UnbalancedEntryExit;

// The following will get copied over to each test, so it can be instrumented.
(function (){
    let outFd = fs.openSync(instrumentationOutputFile, "a");
    function writeInstrumentationLine(line: InstrumentationLine) {
        fs.writeSync(outFd, JSON.stringify(line) + "\n");
    }

    let callStack: FunctionEntry[] = [];

    _meta_ = {
        apply: function (fct: Function, thisObj: {}, args: {}[]) {
            let tag = tagFor(fct);
            if (exportedFunctions.indexOf(tag) > -1) {
                callStack.push({tag: tag, args: args});
            }
            return fct.apply(thisObj, args);
        },
        return: function (returnValue: {}) {
            let tag = tagFor(arguments.callee.caller);
            // let exit = {name: caller.name, file: mainFile, returnValue: returnValue};
            if (exportedFunctions.indexOf(tag) > -1) {
                while (true) {
                    let entry = callStack.pop();
                    if (entry === undefined) {
                        writeInstrumentationLine({type: "UnbalancedEntryExit", exit: {returnValue: returnValue}});
                        break;
                    }
                    else if (entry.tag = tag) {
                        writeInstrumentationLine({
                            type: "FunctionCall",
                            tag: tag,
                            args: entry.args,
                            returnValue: returnValue});
                        break;
                    }
                }
            }
            return returnValue;
        }
    };
})();