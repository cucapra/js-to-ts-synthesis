import {FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";
import {Type} from "./types/Type";

export class LowerBoundTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = calls.info.args.map(a => Type.bottom);
        let returnValueType = Type.bottom;
        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i] = argTypes[i].include(arg);
            });

            returnValueType = returnValueType.include(call.returnValue);
        }

        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}