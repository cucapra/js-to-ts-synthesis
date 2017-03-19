import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {Type} from "./Type";

export class NullTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = TypeDeducer.argNames(calls).map(name => ({name: name, type: new Type("bottom")}));
        for (let i = 0; i < argTypes.length; i++) {
            argTypes[i].type.extend(null);
        }

        let returnValueType = new Type("bottom").extend(null);
        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }
}