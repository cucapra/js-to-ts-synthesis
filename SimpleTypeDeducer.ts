

import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {Type} from "./Type";

export class SimpleTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = TypeDeducer.initializeArgTypesArray(calls);
        let returnValueType: Type = {kind: "restricted"};

        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                this.extend(argTypes[i].type, arg);
            });

            this.extend(returnValueType, call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }

    private extend(type: Type, value: any) {
        if (type.kind === "restricted") {
            if (value === null) {
                type.nullType = true;
            }
            switch (typeof value) {
                case "undefined":
                    type.undefinedType = true;
                    break;
                case "boolean":
                    type.booleanTrueType = true;
                    type.booleanFalseType = true;
                    break;
                case "number":
                    type.numberType = true;
                    break;
                case "string":
                    type.stringType = true;
                    break;
                case "function":
                    type.functionType = true;
                    break;
                case "object":
                    if (Array.isArray(value)) {
                        let elementType: Type = {kind: "restricted"};
                        for (let e of value){
                            this.extend(elementType, e);
                        }
                        type.arrayOrTupleType = {kind: "array", type: elementType};
                    }
                    else {
                        type.objectType = true;
                    }

                    break;
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
            }
        }
    }
}