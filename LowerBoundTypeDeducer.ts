import {FunctionCalls} from "./ExecutionTracer";
import {Type} from "./Type";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";

export class LowerBoundTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = TypeDeducer.argNames(calls).map(name => ({name: name, type: new Type("bottom")}));
        let returnValueType = new Type("bottom");
        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].type.extend(arg);
            });

            returnValueType.extend(call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }
}