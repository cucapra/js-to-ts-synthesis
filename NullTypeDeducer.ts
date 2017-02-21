import {Dictionary, Set, MultiDictionary, DefaultDictionary} from 'typescript-collections';

import {FunctionCall} from './ExecutionTracer'
import {TypeDeducer, Type, FunctionTypeDefinition} from './TypeDeducer'
import {SetDictionary} from './Utils';

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCall[]): FunctionTypeDefinition {

        var argTypes = TypeDeducer.initializeArgTypesArray(calls);
        for (var i=0; i<argTypes.length; i++){
            argTypes[i].add(Type.NULL);
        }

        var returnValueType = new Set<Type>();
        returnValueType.add(Type.NULL);

        return new FunctionTypeDefinition(name, argTypes, returnValueType);
    }
}