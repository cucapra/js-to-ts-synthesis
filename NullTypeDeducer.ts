import {FunctionCalls} from "./ExecutionTracer";
import {Type} from "./Type";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = calls.info.args.map(a => new Type("bottom"));
        for (let i = 0; i < argTypes.length; i++) {
            argTypes[i].extend(null);
        }

        let returnValueType = new Type("bottom").extend(null);
        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}