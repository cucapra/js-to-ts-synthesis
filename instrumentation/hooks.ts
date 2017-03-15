import * as fs from "fs";
import * as esprima from "esprima";

// _meta_ is the global this sets later.
declare var _meta_: {};

// These two are assumed to be there.
declare var instrumentationOutputFile: string;
declare var exportedFunctions: string[];
declare var mainFile: string;

// Not sure why name doesn't appear in the Function class. This works fine in node.
type FunctionWithName = Function & {name: string};

export interface FunctionEntry {
    name: string;
    file: string;
    argNames: string[];
    args: any; /*Dictionary<number, any>*/
}

export interface FunctionExit {
    name: string;
    file: string;
    returnValue: any;
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

    function argNames(fct: Function): string[] {
        let node = esprima.parse(fct.toString()).body[0];
        if (node.type !== "FunctionDeclaration")
            throw new Error(`Top-level node ${node.type} not FunctionDeclaration`);

        let argNames: string[] = [];
        for (let param of node.params){
            if (param.type === "Identifier")
                argNames.push(param.name);
        }

        return argNames;
    }

    _meta_ = {
        apply: function (fct: FunctionWithName, thisObj: any, args: any[]) {
            if (exportedFunctions.indexOf(fct.name) > -1) {
                callStack.push({name: fct.name, file: mainFile, argNames: argNames(fct), args: args});
            }
            return fct.apply(thisObj, args);
        },
        return: function (returnValue: any) {
            let caller = <FunctionWithName>arguments.callee.caller;
            let exit = {name: caller.name, file: mainFile, returnValue: returnValue};
            if (exportedFunctions.indexOf(caller.name) > -1) {
                while (true) {
                    let entry = callStack.pop();
                    if (entry === undefined) {
                        writeInstrumentationLine({type: "UnbalancedEntryExit", exit: exit});
                        break;
                    }
                    else if (entry.name === exit.name && entry.file === exit.file) {
                        writeInstrumentationLine({type: "FunctionCall", name: entry.name, file: entry.file, argNames: entry.argNames, args: entry.args, returnValue: exit.returnValue});
                        break;
                    }
                }
            }
            return returnValue;
        }
    };
})();