import {Type, LowerBoundType, bottom} from "./Type";
import {FunctionCalls} from "./ExecutionTracer";

export interface ArgumentType<T extends Type> {
    name: string;
    type: T;
}

export interface FunctionTypeDefinition {
    name: string;
    argTypes: ArgumentType<Type>[];
    returnValueType: Type;
}

export abstract class TypeDeducer {
    getAllTypeDefinitions(executions: { [functionName: string]: FunctionCalls }): { [sourceFile: string]: FunctionTypeDefinition[] } {
        let result: { [sourceFile: string]: FunctionTypeDefinition[] } = {};

        for (let functionName in executions) {
            let file = executions[functionName].file;
            if (!(file in result))
                result[file] = [];
            result[file].push(this.getTypeFor(functionName, executions[functionName]));
        }

        return result;
    }

    protected static initializeArgTypesArray(calls: FunctionCalls): ArgumentType<LowerBoundType>[] {
        let numArgs = 0;
        for (let call of calls.calls){
            numArgs = Math.max(numArgs, call.args.length);
        }

        let argTypes: ArgumentType<LowerBoundType>[] = [];
        for (let i = 0; i < numArgs; i++) {
            // Get the name if it's provided. Otherwise make one up.
            let name = (i < calls.argDefs.length) ? calls.argDefs[i].name : `arg${i}`;
            argTypes.push({name: name, type: bottom()});
        }
        return argTypes;
    }

    protected abstract getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition;
}