import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {LowerBoundType, Map, StringSet, bottom} from "./Type";

export class LowerBoundTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = TypeDeducer.initializeArgTypesArray(calls);
        let returnValueType = bottom();
        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                argTypes[i].type = this.extend(argTypes[i].type, arg);
            });

            returnValueType = this.extend(returnValueType, call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }

    private extend(type: LowerBoundType, value: any): LowerBoundType {
        if (value === null) {
            type.nullType = true;
            return type;
        }
        switch (typeof value) {
            case "undefined":
                type.undefinedType = true;
                return type;
            case "boolean":
                if (value)
                    type.booleanType.true = true;
                else
                    type.booleanType.false = true;
                return type;
            case "number":
                type.numberType[value] = true;
                return type;
            case "string":
                type.stringType[value] = true;
                return type;
            case "function":
                type.functionType = true;
                return type;
            case "object":
                if (Array.isArray(value)) {
                    if (!type.arrayOrTupleType) {
                        let tupleType = value.map(arg => this.extend(bottom(), arg) );
                        type.arrayOrTupleType = {kind: "tuple", type: tupleType};
                        return type;
                    }
                    else {
                        this.mergeIntoTupleLowerBound(type.arrayOrTupleType.type, value);
                        return type;
                    }
                }
                else {
                    if (!type.objectType) {
                        type.objectType = {};
                        for (let k in value) {
                            type.objectType[k] = this.extend(bottom(), value[k]);
                        }
                        return type;
                    }
                    else {
                        this.mergeIntoObjectLowerBound(type.objectType, value);
                        return type;
                    }
                }
            default:
                throw new Error(`Cannot convert ${typeof value}: ${value}`);
        }
    }

    private mergeIntoTupleLowerBound(target: LowerBoundType[], source: any[]) {
        let numEntries = Math.max(target.length, source.length);
        for (let i = 0; i < numEntries; i++) {
            if (i < target.length) {
                // `source` has this, which means it's optional.
                let type = bottom();
                type.undefinedType = true;
                target.push(type);
                this.extend(target[i], source[i]);
            }
            else if (i < source.length) {
                // `source` doesn't have this, which means it's optional.
                target[i].undefinedType = true;
            }
            else {
                this.extend(target[i], source[i]);
            }
        }
    }

    private mergeIntoObjectLowerBound(target: Map<LowerBoundType>, source: any) {
        let keys: StringSet = {};
        for (let k of Object.keys(target)) {
            keys[k] = true;
        }
        for (let k in source) {
            keys[k] = true;
        }

        for (let k of Object.keys(keys)) {
            if (!(k in target)) {
                // `source` has this, which means it's optional.
                let type = bottom();
                type.undefinedType = true;
                target[k] = type;
                this.extend(target[k], source[k]);
            }
            else if (!(k in source)) {
                // `source` doesn't have this, which means it's optional.
                target[k].undefinedType = true;
            }
            else {
                this.extend(target[k], source[k]);
            }
        }
    }
}