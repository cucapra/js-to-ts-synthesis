import {FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {ArgValidator} from "./Validator";

export class SimpleTypeDeducer extends LowerBoundTypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let definition = super.getTypeFor(name, calls);
        for (let i = 0; i < definition.argTypes.length; i++) {
            definition.argTypes[i].type.generalize(new ArgValidator(calls.functionInfo, calls.calls, i));
        }
        definition.returnValueType.generalize(new ArgValidator(calls.functionInfo, calls.calls, undefined));
        return definition;
    }
}