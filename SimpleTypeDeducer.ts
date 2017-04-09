import {FunctionCalls} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {ArgValidator, NoopValidator} from "./Validator";

export class SimpleTypeDeducer extends LowerBoundTypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let definition = super.getTypeFor(calls);
        for (let i = 0; i < definition.argTypes.length; i++) {
            definition.argTypes[i].roundUp(new ArgValidator(calls.info, calls.calls, i), this.parameters);
        }

        definition.returnValueType.roundUp(new NoopValidator(), this.parameters);
        return definition;
    }
}