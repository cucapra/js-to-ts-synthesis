import {ArrayOrTupleTypeComponent} from "./type_components/ArrayOrTupleTypeComponent";
import {BooleanTypeComponent} from "./type_components/BooleanTypeComponent";
import {FunctionTypeComponent} from "./type_components/FunctionTypeComponent";
import {NullTypeComponent} from "./type_components/NullTypeComponent";
import {NumberTypeComponent} from "./type_components/NumberTypeComponent";
import {ObjectTypeComponent} from "./type_components/ObjectTypeComponent";
import {StringTypeComponent} from "./type_components/StringTypeComponent";
import {RoundUpParameters} from "./type_components/TypeComponent";
import {UndefinedTypeComponent} from "./type_components/UndefinedTypeComponent";
import {Validator} from "./Validator";

class TypeDefinitionBuilder {
    private pieces: string[] = [];

    add(pieces: string[]) {
        for (let p of pieces) {
            this.pieces.push(p);
        }
        return this;
    }

    toDefinition() {
        return (this.pieces.length > 0) ? this.pieces.join("|") : "never";
    }
}

export class Type {
    private nullType = new NullTypeComponent();
    private undefinedType = new UndefinedTypeComponent();
    private booleanType = new BooleanTypeComponent();
    private numberType = new NumberTypeComponent();
    private stringType = new StringTypeComponent();
    private functionType = new FunctionTypeComponent();
    private arrayOrTupleType = new ArrayOrTupleTypeComponent();
    private objectType = new ObjectTypeComponent();

    constructor(of: "bottom"|"top") {
        if (of === "top") {
            this.nullType.includeAll();
            this.undefinedType.includeAll();
            this.booleanType.includeAll();
            this.numberType.includeAll();
            this.stringType.includeAll();
            this.functionType.includeAll();
            this.arrayOrTupleType.includeAll();
            this.objectType.includeAll();
        }
    }

    exclude(markers: string[]): this {
        for (let typeofMarker of markers) {
            switch (typeofMarker) {
                case "undefined":
                    this.undefinedType.excludeAll();
                    break;
                case "object":
                    this.nullType.excludeAll();
                    this.objectType.excludeAll();
                    this.arrayOrTupleType.excludeAll();
                    break;
                case "boolean":
                    this.booleanType.excludeAll();
                    break;
                case "number":
                    this.numberType.excludeAll();
                    break;
                case "string":
                    this.stringType.excludeAll();
                    break;
                case "function":
                    this.functionType.excludeAll();
                    break;
            }
        }
        return this;
    }

    include(markers: string[]): this {
        for (let typeofMarker of markers) {
            switch (typeofMarker) {
                case "undefined":
                    this.undefinedType.includeAll();
                    break;
                case "object":
                    this.nullType.includeAll();
                    this.objectType.includeAll();
                    this.arrayOrTupleType.includeAll();
                    break;
                case "boolean":
                    this.booleanType.includeAll();
                    break;
                case "number":
                    this.numberType.includeAll();
                    break;
                case "string":
                    this.stringType.includeAll();
                    break;
                case "function":
                    this.functionType.includeAll();
                    break;
            }
        }
        return this;
    }

    includeType(other: Type) {
        this.nullType.includeType(other.nullType);
        this.undefinedType.includeType(other.undefinedType);
        this.booleanType.includeType(other.booleanType);
        this.numberType.includeType(other.numberType);
        this.stringType.includeType(other.stringType);
        this.functionType.includeType(other.functionType);
        this.arrayOrTupleType.includeType(other.arrayOrTupleType);
        this.objectType.includeType(other.objectType);
    }

    toDefinition(): string {
        if (this.nullType.isTop()
                && this.undefinedType.isTop()
                && this.booleanType.isTop()
                && this.numberType.isTop()
                && this.stringType.isTop()
                && this.functionType.isTop()
                && this.arrayOrTupleType.isTop()
                && this.objectType.isTop())
            return "{}";

        return new TypeDefinitionBuilder()
            .add(this.nullType.toDefinition())
            .add(this.undefinedType.toDefinition())
            .add(this.booleanType.toDefinition())
            .add(this.numberType.toDefinition())
            .add(this.stringType.toDefinition())
            .add(this.functionType.toDefinition())
            .add(this.arrayOrTupleType.toDefinition())
            .add(this.objectType.toDefinition())
            .toDefinition();
    }

    extend(value: any): this {

        if (value === null) {
            this.nullType.include(value);
        }
        else {
            switch (typeof value) {
                case "undefined":
                    this.undefinedType.include(value);
                    break;
                case "boolean":
                    this.booleanType.include(value);
                    break;
                case "number":
                    this.numberType.include(value);
                    break;
                case "string":
                    this.stringType.include(value);
                    break;
                case "function":
                    this.functionType.include(value);
                    break;
                case "object":
                    if (Array.isArray(value))
                        this.arrayOrTupleType.include(value);
                    else
                        this.objectType.include(value);
                    break;
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
            }
        }
        return this;
    }

    canRoundUp(validator: Validator, topType: Type, parameters: RoundUpParameters) {
        return this.nullType.canRoundUp(validator, topType.nullType, parameters)
            && this.undefinedType.canRoundUp(validator, topType.undefinedType, parameters)
            && this.booleanType.canRoundUp(validator, topType.booleanType, parameters)
            && this.numberType.canRoundUp(validator, topType.numberType, parameters)
            && this.stringType.canRoundUp(validator, topType.stringType, parameters)
            && this.functionType.canRoundUp(validator, topType.functionType, parameters)
            && this.arrayOrTupleType.canRoundUp(validator, topType.arrayOrTupleType, parameters)
            && this.objectType.canRoundUp(validator, topType.objectType, parameters);
    }

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        this.nullType.roundUp(validator, parameters);
        this.undefinedType.roundUp(validator, parameters);
        this.booleanType.roundUp(validator, parameters);
        this.numberType.roundUp(validator, parameters);
        this.stringType.roundUp(validator, parameters);
        this.functionType.roundUp(validator, parameters);
        this.arrayOrTupleType.roundUp(validator, parameters);
        this.objectType.roundUp(validator, parameters);
    }



/*
    private static mergeIntoTupleLowerBound(target: Type[], source: any[]) {
        let numEntries = Math.max(target.length, source.length);
        for (let i = 0; i < numEntries; i++) {
            if (i >= target.length) {
                // `source` has this, which means it's optional.
                let type = new Type("bottom");
                type.undefinedType.include(undefined);
                target[i] = type.extend(source[i]);
            }
            else if (i >= source.length) {
                // `source` doesn't have this, which means it's optional.
                target[i].undefinedType.include(undefined);
            }
            else {
                target[i].extend(source[i]);
            }
        }
    }

    private static mergeIntoObjectLowerBound(target: Map<Type>, source: any) {
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
                let type = new Type("bottom");
                type.undefinedType.include(undefined);
                target[k] = type.extend(source[k]);
            }
            else if (!(k in source)) {
                // `source` doesn't have this, which means it's optional.
                target[k].undefinedType.include(undefined);
            }
            else {
                target[k].extend(source[k]);
            }
        }
    }*/
};