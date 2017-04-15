import {Set} from "immutable";
import {FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";
import {Type} from "./types/Type";

export class UpperBoundTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = calls.info.args.map(arg => {
            if (arg.typeofChecks["==="].length > 0)
                return Type.bottom.includeAll(Set(arg.typeofChecks["==="])).excludeAll(Set(arg.typeofChecks["!=="]));
            else
                return Type.top.excludeAll(Set(arg.typeofChecks["!=="]));
        });
        let returnValueType = Type.top;

        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}