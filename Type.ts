
import {Validator} from "./Validator";
import {NullTypeComponent} from "./type_components/NullTypeComponent";
import {UndefinedTypeComponent} from "./type_components/UndefinedTypeComponent";
import {BooleanTypeComponent} from "./type_components/BooleanTypeComponent";
import {NumberTypeComponent} from "./type_components/NumberTypeComponent";
import {StringTypeComponent} from "./type_components/StringTypeComponent";
import {ArrayOrTupleTypeComponent} from "./type_components/ArrayOrTupleTypeComponent";
import {ObjectTypeComponent} from "./type_components/ObjectTypeComponent";
import {FunctionTypeComponent} from "./type_components/FunctionTypeComponent";

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
    private nullType: NullTypeComponent;
    private undefinedType: UndefinedTypeComponent;
    private booleanType: BooleanTypeComponent;
    private numberType: NumberTypeComponent;
    private stringType: StringTypeComponent;
    private functionType: FunctionTypeComponent;
    private arrayOrTupleType: ArrayOrTupleTypeComponent;
    private objectType: ObjectTypeComponent;

    constructor(of: "bottom"|"top") {
        switch (of) {
            case "bottom":
                this.nullType = new NullTypeComponent();
                this.undefinedType = new UndefinedTypeComponent();
                this.booleanType = new BooleanTypeComponent();
                this.numberType = new NumberTypeComponent();
                this.stringType = new StringTypeComponent();
                this.functionType = new FunctionTypeComponent();
                this.arrayOrTupleType = new ArrayOrTupleTypeComponent();
                this.objectType = new ObjectTypeComponent();
                break;
            case "top":
                this.nullType = new NullTypeComponent().includeAll();
                this.undefinedType = new UndefinedTypeComponent().includeAll();
                this.booleanType = new BooleanTypeComponent().includeAll();
                this.numberType = new NumberTypeComponent().includeAll();
                this.stringType = new StringTypeComponent().includeAll();
                this.functionType = new FunctionTypeComponent().includeAll();
                this.arrayOrTupleType = new ArrayOrTupleTypeComponent().includeAll();
                this.objectType = new ObjectTypeComponent().includeAll();
                break;
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

    generalize(validator: Validator) {
        this.nullType.generalize(validator);
        this.undefinedType.generalize(validator);
        this.booleanType.generalize(validator);
        this.numberType.generalize(validator);
        this.stringType.generalize(validator);
        this.functionType.generalize(validator);
        this.arrayOrTupleType.generalize(validator);
        this.objectType.generalize(validator);
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