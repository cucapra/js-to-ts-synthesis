

import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {bottom} from "./Type";

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = TypeDeducer.initializeArgTypesArray(calls);
        for (let i = 0; i < argTypes.length; i++) {
            argTypes[i].type.nullType = true;
        }

        let returnValueType = bottom();
        returnValueType.nullType = true;
        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }
}