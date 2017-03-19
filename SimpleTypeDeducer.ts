import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition, ArgumentType} from "./TypeDeducer";
import {Type} from "./Type";

export class SimpleTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes: ArgumentType<Type>[] = TypeDeducer.argNames(calls).map(name => ({name: name, type: new Type("bottom")}));
        let returnValueType = new Type("bottom");

        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].type.extendSimple(arg);
            });

            returnValueType.extendSimple(call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }
}