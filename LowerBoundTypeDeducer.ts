import {FunctionCalls} from "./ExecutionTracer";
import {Type} from "./Type";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";

export class LowerBoundTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = calls.info.args.map(a => new Type("bottom"));
        let returnValueType = new Type("bottom");
        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].extend(arg);
            });

            returnValueType.extend(call.returnValue);
        }

        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}