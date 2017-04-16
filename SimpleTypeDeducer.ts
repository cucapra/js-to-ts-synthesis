import {FunctionCalls} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {Lattice} from "./types/Lattice";
import {Type} from "./types/Type";
import {RoundUpParameters} from "./types/TypeComponent";
import {ArgValidator, NoopValidator, Validator} from "./Validator";

export class SimpleTypeDeducer extends LowerBoundTypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let definition = super.getTypeFor(calls);
        let lattice = new Lattice<Type, [Validator, RoundUpParameters]>(this.fileToWriteDebugging);

        for (let i = 0; i < definition.argTypes.length; i++) {
            definition.argTypes[i] = lattice.walk(definition.argTypes[i], [new ArgValidator(calls.info, calls.calls, i), this.parameters], definition.calls.info.args[i].name);
        }

        definition.returnValueType = lattice.walk(definition.returnValueType, [new NoopValidator(), this.parameters], "<return>");
        return definition;
    }
}