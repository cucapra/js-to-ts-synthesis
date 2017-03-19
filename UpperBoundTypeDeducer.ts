import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {Type} from "./Type";

export class UpperBoundTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argChecks: {[name: string]: {"===": string[], "!==": string[]}} = {};
        for (let a of calls.argDefs){
            argChecks[a.name] = a.typeofChecks;
        }

        let argTypes = TypeDeducer.argNames(calls).map(name => {
            if (argChecks[name]["==="].length > 0)
                return {name: name, type: new Type("bottom").include(argChecks[name]["==="]).exclude(argChecks[name]["!=="])};
            else
                return {name: name, type: new Type("top").exclude(argChecks[name]["!=="])};
        });
        let returnValueType = new Type("top");

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }
}