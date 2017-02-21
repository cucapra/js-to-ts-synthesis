import {Set} from 'typescript-collections';

import {Function, FunctionCall} from './ExecutionTracer'
import {SetDictionary, ListDictionary} from './Utils';

export enum Type {
    NULL, UNDEFINED, BOOLEAN, NUMBER, STRING, FUNCTION, OBJECT
}

export class FunctionTypeDefinition {
    name: string;
    argTypes: SetDictionary<number, Type>;
    returnValueType: Set<Type>;
    constructor(name: string, argTypes: SetDictionary<number, Type>, returnValueType: Set<Type>){
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

    protected abstract getTypeFor(name: string, calls: FunctionCall[]): FunctionTypeDefinition;
}