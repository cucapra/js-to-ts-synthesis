import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {Type} from "./Type";

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