import {Set} from 'typescript-collections';

import {FunctionCall, FunctionCalls} from './ExecutionTracer'
import {TypeDeducer, Type, FunctionTypeDefinition} from './TypeDeducer'
import {SetDictionary} from './Utils';

export class SimpleTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        var argTypes = TypeDeducer.initializeArgTypesArray(calls);
        var returnValueType = new Set<Type>();

        for (var call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].type.add(this.typeOf(arg));
            });

            returnValueType.add(this.typeOf(call.returnValue));
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }

    private typeOf(value: any): Type {
        if (value==null){
            return Type.NULL;
        }
        switch (typeof value){
            case 'undefined':
                return Type.UNDEFINED;
            case 'boolean':
                return Type.BOOLEAN;
            case 'number':
                return Type.NUMBER;
            case 'string':
                return Type.STRING;
            case 'function':
                return Type.FUNCTION;
            case 'object':
                return Type.OBJECT;
        }
        throw new Error(`Cannot convert ${typeof value}: ${value}`);
    }
}