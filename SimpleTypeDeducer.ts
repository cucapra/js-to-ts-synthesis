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

        return new FunctionTypeDefinition(name, argTypes, returnValueType);
    }

    private typeOf(value: any): Type {
        if (typeof value == 'string') {
            return Type.STRING;
        }
        throw new Error(`Cannot convert ${typeof value}: ${value}`);
    }
}