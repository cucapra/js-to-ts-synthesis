import {Map} from "immutable";
import {FunctionCalls} from "./ExecutionTracer";
import {Type} from "./Type";

export interface ArgumentType<T extends Type> {
    name: string;
    type: T;
}

export interface FunctionTypeDefinition {
    name: string;
    argTypes: ArgumentType<Type>[];
    returnValueType: Type;
}

export type SourceFile = string;

export abstract class TypeDeducer {
    getAllTypeDefinitions(executions: Map<string, FunctionCalls>): Map<SourceFile, FunctionTypeDefinition[]> {
        return Map<SourceFile, FunctionTypeDefinition[]>().withMutations(result => {
            for (let functionName of executions.keySeq().toArray()) {
                let file = executions.get(functionName).file;
                if (!result.has(file))
                    result.set(file, []);
                result.get(file).push(this.getTypeFor(functionName, executions.get(functionName)));
            }
        });
    }

    protected static argNames(calls: FunctionCalls): string[] {
        let numArgs = 0;
        for (let call of calls.calls){
            numArgs = Math.max(numArgs, call.args.length);
        }

        let argTypes: string[] = [];
        for (let i = 0; i < numArgs; i++) {
            // Get the name if it's provided. Otherwise make one up.
            let name = (i < calls.functionInfo.args.length) ? calls.functionInfo.args[i].name : `arg${i}`;
            argTypes.push(name);
        }
        return argTypes;
    }

    protected abstract getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition;
}