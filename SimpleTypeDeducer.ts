

import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition, ArgumentType} from "./TypeDeducer";
import {Type, bottom} from "./Type";

export class SimpleTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes: ArgumentType<Type>[] = TypeDeducer.initializeArgTypesArray(calls);
        let returnValueType: Type = bottom();

        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].type = this.extend(argTypes[i].type, arg);
            });

            returnValueType = this.extend(returnValueType, call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }

    private extend(type: Type, value: any): Type {
        if (type === "top") {
            return type;
        }

        if (value === null) {
            type.nullType = true;
            return type;
        }
        switch (typeof value) {
            case "undefined":
                type.undefinedType = true;
                return type;
            case "boolean":
                type.booleanType = {true: true, false: true};
                return type;
            case "number":
                type.numberType = true;
                return type;
            case "string":
                type.stringType = true;
                return type;
            case "function":
                type.functionType = true;
                return type;
            case "object":
                if (Array.isArray(value)) {
                    let elementType: Type = bottom();
                    for (let e of value){
                        elementType = this.extend(elementType, e);
                    }
                    type.arrayOrTupleType = {kind: "array", type: elementType};
                    return type;
                }
                else {
                    return "top";
                }
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
        }
    }
}