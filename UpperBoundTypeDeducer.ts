import {FunctionCalls} from "./ExecutionTracer";
import {Type} from "./Type";
import {FunctionTypeDefinition, TypeDeducer} from "./TypeDeducer";

export class UpperBoundTypeDeducer extends TypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {

        let argTypes = calls.info.args.map(arg => {
            if (arg.typeofChecks["==="].length > 0)
                return new Type("bottom").include(arg.typeofChecks["==="]).exclude(arg.typeofChecks["!=="]);
            else
                return new Type("top").exclude(arg.typeofChecks["!=="]);
        });
        let returnValueType = new Type("top");

        return new FunctionTypeDefinition(calls, argTypes, returnValueType);
    }
}