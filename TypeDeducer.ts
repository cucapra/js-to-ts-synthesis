import {Set, Dictionary} from 'typescript-collections';

import {FunctionCall, FunctionCalls} from './ExecutionTracer'
import {SetDictionary, ListDictionary} from './Utils';

export enum Type {
    NULL, UNDEFINED, BOOLEAN, NUMBER, STRING, FUNCTION, OBJECT
}

export interface ArgumentType {
    name: string;
    type: Set<Type>;
}

export interface FunctionTypeDefinition {
    name: string;
    argTypes: ArgumentType[];
    returnValueType: Set<Type>;
}

export abstract class TypeDeducer {
    getAllTypeDefinitions(executions: Dictionary<string, FunctionCalls>): ListDictionary<string, FunctionTypeDefinition> {
        var result = new ListDictionary<string, FunctionTypeDefinition>();

        executions.forEach((name, funcExecutions) => {
            result.getValue(funcExecutions.file).push(this.getTypeFor(name, funcExecutions));
        });

        return result;
    }

    protected static initializeArgTypesArray(calls: FunctionCalls): ArgumentType[]{
        var numArgs = 0;
        for (var call of calls.calls){
            numArgs = Math.max(numArgs, call.args.length);
        }

        var argTypes : ArgumentType[] = [];
        for (var i=0; i<numArgs; i++){
            // Get the name if it's provided. Otherwise make one up.
            var name = (i < calls.argNames.length) ? calls.argNames[i] : `arg${i}`;
            argTypes.push({name: name, type: new Set<Type>()});
        }
        return argTypes;
    }

    protected abstract getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition;
}