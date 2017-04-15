import {FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";
import {Type} from "./types/Type";

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = calls.info.args.map(a => Type.bottom);
        for (let i = 0; i < argTypes.length; i++) {
            argTypes[i].extend(null);
        }

        let returnValueType = Type.bottom.includeAll(null);
        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}