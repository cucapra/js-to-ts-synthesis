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
    type: "entry";
    name: string;
    file: string;
    argNames: string[];
    args: any; /*Dictionary<number, any>*/
}

export interface FunctionExit {
    type: "exit";
    name: string;
    file: string;
    returnValue: any;
}

export type InstrumentationLine = FunctionEntry | FunctionExit;

// The following will get copied over to each test, so it can be instrumented.
(function (){
    let outFd = fs.openSync(instrumentationOutputFile, "a");
    function writeInstrumentationLine(line: InstrumentationLine) {
        fs.writeSync(outFd, JSON.stringify(line) + "\n");
    }

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
            if (exportedFunctions.indexOf(fct.name) > -1)
                writeInstrumentationLine({type: "entry", name: fct.name, file: mainFile, argNames: argNames(fct), args: args});
            return fct.apply(thisObj, args);
        },
        return: function (returnValue: any) {
            let caller = <FunctionWithName>arguments.callee.caller;
            if (exportedFunctions.indexOf(caller.name) > -1)
                writeInstrumentationLine({type: "exit", name: caller.name, file: mainFile, returnValue: returnValue});
            return returnValue;
        }
    };
})();