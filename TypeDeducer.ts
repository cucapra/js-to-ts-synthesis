import {Set, Dictionary} from 'typescript-collections';

import {Function, FunctionCall, FunctionCalls} from './ExecutionTracer'
import {SetDictionary, ListDictionary} from './Utils';

export enum Type {
    NULL, UNDEFINED, BOOLEAN, NUMBER, STRING, FUNCTION, OBJECT
}

export class ArgumentType {
    name: string;
    type: Set<Type>;
    constructor (name: string, type: Set<Type>){
        this.name = name;
        this.type = type;
    }
}

export class FunctionTypeDefinition {
    name: string;
    argTypes: ArgumentType[];
    returnValueType: Set<Type>;
    constructor(name: string, argTypes: ArgumentType[], returnValueType: Set<Type>){
        this.name = name;
        this.argTypes = argTypes;
        this.returnValueType = returnValueType;
    }
}

export abstract class TypeDeducer {
    getAllTypeDefinitions(executions: Dictionary<Function, FunctionCalls>): ListDictionary<string, FunctionTypeDefinition> {
        var result = new ListDictionary<string, FunctionTypeDefinition>();

        executions.forEach((func, funcExecutions) => {
            result.getValue(func.file).push(this.getTypeFor(func.name, funcExecutions));
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
            argTypes.push(new ArgumentType(name, new Set<Type>()));
        }
        return argTypes;
    }

    protected abstract getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition;
}