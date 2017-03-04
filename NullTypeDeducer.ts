

import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = TypeDeducer.initializeArgTypesArray(calls);
        for (let i = 0; i < argTypes.length; i++) {
            let type = argTypes[i].type;
            if (type.kind === "restricted")
                type.nullType = true;
        }

        return {name: name, argTypes: argTypes, returnValueType: {kind: "restricted", nullType: true}};
    }
}