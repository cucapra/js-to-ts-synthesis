import {FunctionCalls} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {TypeLattice} from "./types/Type";
import {ArgValidator, NoopValidator} from "./Validator";

export class SimpleTypeDeducer extends LowerBoundTypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let definition = super.getTypeFor(calls);
        let lattice = new TypeLattice();
        for (let i = 0; i < definition.argTypes.length; i++) {
            definition.argTypes[i] = lattice.walk(definition.argTypes[i], [new ArgValidator(calls.info, calls.calls, i), this.parameters]);
        }

        definition.returnValueType = lattice.walk(definition.returnValueType, [new NoopValidator(), this.parameters]);
        return definition;
    }
}