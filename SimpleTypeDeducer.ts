import {Set} from 'typescript-collections';

import {FunctionCall} from './ExecutionTracer'
import {TypeDeducer, Type, FunctionTypeDefinition} from './TypeDeducer'
import {SetDictionary} from './Utils';

export class SimpleTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCall[]): FunctionTypeDefinition {
        var argTypes = new SetDictionary<number, Type>();
        var returnValueType = new Set<Type>();

        for (var call of calls){
            for (var arg of call.args.keys()){
                argTypes.getValue(arg).add(this.typeOf(call.args.getValue(arg)));
            }
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