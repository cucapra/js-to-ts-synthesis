import {Set} from 'typescript-collections';

import {Function, FunctionCall} from './ExecutionTracer'
import {SetDictionary, ListDictionary} from './Utils';

export enum Type {
    NULL, UNDEFINED, BOOLEAN, NUMBER, STRING, FUNCTION, OBJECT
}

export class FunctionTypeDefinition {
    name: string;
    argTypes: Set<Type>[];
    returnValueType: Set<Type>;
    constructor(name: string, argTypes: Set<Type>[], returnValueType: Set<Type>){
        this.name = name;
        this.argTypes = argTypes;
        this.returnValueType = returnValueType;
    }
}

export abstract class TypeDeducer {
    getAllTypeDefinitions(executions: ListDictionary<Function, FunctionCall>): ListDictionary<string, FunctionTypeDefinition> {
        var result = new ListDictionary<string, FunctionTypeDefinition>();

        executions.forEach((func, funcExecutions) => {
            result.getValue(func.file).push(this.getTypeFor(func.name, funcExecutions));
        });

        return result;
    }

    protected static initializeArgTypesArray(calls: FunctionCall[]): Set<Type>[]{
        var numArgs = 0;
        for (var call of calls){
            numArgs = Math.max(numArgs, call.args.length);
        }

        var argTypes : Set<Type>[] = [];
        for (var i=0; i<numArgs; i++){
            argTypes.push(new Set<Type>());
        }
        return argTypes;
    }

    protected abstract getTypeFor(name: string, calls: FunctionCall[]): FunctionTypeDefinition;
}