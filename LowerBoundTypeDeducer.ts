import {FunctionCalls} from "./ExecutionTracer";
import {TypeDeducer, FunctionTypeDefinition} from "./TypeDeducer";
import {LowerBoundType, Map, StringSet} from "./Type";

export class LowerBoundTypeDeducer extends TypeDeducer {
    getTypeFor(name: string, calls: FunctionCalls): FunctionTypeDefinition {
        let argTypes = TypeDeducer.initializeArgTypesArray(calls);
        let returnValueType: LowerBoundType = {kind: "restricted"};
        for (let call of calls.calls){
            call.args.forEach((arg, i) => {
                this.extend(argTypes[i].type, arg);
            });

            this.extend(returnValueType, call.returnValue);
        }

        return {name: name, argTypes: argTypes, returnValueType: returnValueType};
    }

    private extend(type: LowerBoundType, value: any) {
        if (type.kind === "restricted") {
            if (value === null) {
                type.nullType = true;
            }
            switch (typeof value) {
                case "undefined":
                    type.undefinedType = true;
                    break;
                case "boolean":
                    if (value)
                        type.booleanTrueType = true;
                    else
                        type.booleanFalseType = true;
                    break;
                case "number":
                    if (type.numberType === undefined)
                        type.numberType = {};
                    type.numberType[value] = true;
                    break;
                case "string":
                    if (type.stringType === undefined)
                        type.stringType = {};
                    type.stringType[value] = true;
                    break;
                case "function":
                    type.functionType = true;
                    break;
                case "object":
                    if (Array.isArray(value)) {
                        if (type.arrayOrTupleType === undefined) {
                            let tupleType = value.map(arg => {
                                let argType: LowerBoundType = {kind: "restricted"};
                                this.extend(argType, arg);
                                return argType;
                            });
                            type.arrayOrTupleType = {kind: "tuple", type: tupleType};
                        }
                        else {
                            this.mergeIntoTupleLowerBound(type.arrayOrTupleType.type, value);
                        }
                    }
                    else {
                        if (type.objectType === undefined) {
                            type.objectType = {};
                            for (let k in value) {
                                let kType: LowerBoundType = {kind: "restricted"};
                                this.extend(kType, value[k]);
                                type.objectType[k] = kType;
                            }
                        }
                        else {
                            this.mergeIntoObjectLowerBound(type.objectType, value);
                        }
                    }
                    break;
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
            }
        }
    }

    private mergeIntoTupleLowerBound(target: LowerBoundType[], source: any[]) {
        let numEntries = Math.max(target.length, source.length);
        for (let i = 0; i < numEntries; i++) {
            if (i < target.length) {
                // `source` has this, which means it's optional.
                target.push({kind: "restricted", undefinedType: true});
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
                target[k] = {kind: "restricted", undefinedType: true};
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