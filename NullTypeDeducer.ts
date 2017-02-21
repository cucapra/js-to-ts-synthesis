import {Dictionary, Set, MultiDictionary, DefaultDictionary} from 'typescript-collections';

import {FunctionCall} from './ExecutionTracer'
import {TypeDeducer, Type, FunctionTypeDefinition} from './TypeDeducer'
import {SetDictionary} from './Utils';

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCall[]): FunctionTypeDefinition {

        var argTypes = new SetDictionary<number, Type>();
        argTypes.getValue(0).add(Type.NULL);

        var returnValueType = new Set<Type>();
        returnValueType.add(Type.NULL);

        return new FunctionTypeDefinition(name, argTypes, returnValueType);
    }
}