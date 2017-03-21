import {Set, Map} from "es6-shim";

type Variants = string[];

export interface TypeComponent<T> {
    include(value: T): this;
    includeAll(): this;
    excludeAll(): this;

    isTop(): boolean;
    toDefinition(): Variants;
}

export class NullTypeComponent implements TypeComponent<null> {
    private canBeNull: boolean = false;

    include(value: null) {
        this.canBeNull = true;
        return this;
    }

    includeAll() {
        this.canBeNull = true;
        return this;
    }

    excludeAll() {
        this.canBeNull = false;
        return this;
    }

    isTop() {
        return this.canBeNull;
    }

    toDefinition() {
        return this.canBeNull ? ["null"] : [];
    }
}

export class UndefinedTypeComponent implements TypeComponent<undefined> {
    private canBeUndefined: boolean = false;

    include(value: undefined) {
        this.canBeUndefined = true;
        return this;
    }

    includeAll() {
        this.canBeUndefined = true;
        return this;
    }

    excludeAll() {
        this.canBeUndefined = false;
        return this;
    }

    isTop() {
        return this.canBeUndefined;
    }

    toDefinition() {
        return this.canBeUndefined ? ["undefined"] : [];
    }
}

export class BooleanTypeComponent implements TypeComponent<boolean> {
    private canBeTrue: boolean = false;
    private canBeFalse: boolean = false;

    include(value: boolean) {
        if (value)
            this.canBeTrue = true;
        else
            this.canBeFalse = true;
        return this;
    }

    includeAll() {
        this.canBeTrue = this.canBeFalse = true;
        return this;
    }

    excludeAll() {
        this.canBeFalse = this.canBeFalse = false;
        return this;
    }

    isTop() {
        return this.canBeTrue && this.canBeFalse;
    }

    toDefinition() {
        if (this.canBeTrue) {
            if (this.canBeFalse)
                return ["boolean"];
            else
                return ["true"];
        }
        else if (this.canBeFalse) {
            return ["false"];
        }
        return [];
    }
}

export class NumberTypeComponent implements TypeComponent<number> {
    private values: true | Set<number> = new Set<number>();

    include(value: number) {
        if (this.values !== true)
            this.values.add(value);
        return this;
    }

    includeAll() {
        this.values = true;
        return this;
    }

    excludeAll() {
        this.values = new Set<number>();
        return this;
    }

    isTop() {
        return this.values === true;
    }

    toDefinition() {
        if (this.values === true)
            return ["number"];
        return Array.from(this.values).map(n => JSON.stringify(n));
    }
}


export class StringTypeComponent implements TypeComponent<string> {
    private values: true | Set<string> = new Set<string>();

    include(value: string) {
        if (this.values !== true)
            this.values.add(value);
        return this;
    }

    includeAll() {
        this.values = true;
        return this;
    }

    excludeAll() {
        this.values = new Set<string>();
        return this;
    }

    isTop() {
        return this.values === true;
    }

    toDefinition() {
        if (this.values === true)
            return ["string"];

        return Array.from(this.values).map(n => JSON.stringify(n));
    }
}

// TODO: Implement better
export class FunctionTypeComponent implements TypeComponent<Function> {
    private canBeFunction: boolean = false;

    include(f: Function) {
        this.canBeFunction = true;
        return this;
    }

    includeAll() {
        this.canBeFunction = true;
        return this;
    }

    excludeAll() {
        this.canBeFunction = false;
        return this;
    }

    isTop() {
        return this.canBeFunction;
    }

    toDefinition() {
        return this.canBeFunction ? ["((...args: any[]) => any)"] : [];
    }
}


type TupleType = Type[];

export class ArrayOrTupleTypeComponent implements TypeComponent<any[]> {
    // Empty arrays need to handled specially. Typescript doesn't allow them in tuple definitions.
    private allowedTypes: true | { array: Type[], tuple: TupleType[], hasEmptyArrays: boolean } = {array: [], tuple: [], hasEmptyArrays: false };

    include(value: any[]) {
        if (this.allowedTypes !== true) {
            if (value.length === 0)
                this.allowedTypes.hasEmptyArrays = true;
            else
                this.allowedTypes.tuple.push(value.map(element => new Type("bottom").extend(element)));
        }
        return this;
    }

    includeAll() {
        this.allowedTypes = true;
        return this;
    }

    excludeAll() {
        this.allowedTypes = {array: [], tuple: [], hasEmptyArrays: false };
        return this;
    }

    isTop() {
        return this.allowedTypes === true;
    }

    toDefinition() {
        if (this.allowedTypes === true)
            return ["{}[]"];

        let arrayValues = this.allowedTypes.array.map(type => `${type.toDefinition()}[]`);
        let tupleValues = this.allowedTypes.tuple.map(tupleType => "[" + tupleType.map(type => type.toDefinition()).join(", ") + "]");
        let values = arrayValues.concat(tupleValues);

        if (values.length === 0 && this.allowedTypes.hasEmptyArrays)
            values.push("undefined[]");
        return values;
    }
}

export class ObjectTypeComponent implements TypeComponent<{[key: string]: any}> {
    private allowedTypes: true | Map<string, Type>[] = [];

    include(value: {[key: string]: any}) {
        if (this.allowedTypes !== true) {
            let type = new Map<string, Type>();
            for (let key in value) {
                type.set(key, new Type("bottom").extend(value[key]));
            }
            this.allowedTypes.push(type);
        }
        return this;
    }

    includeAll() {
        this.allowedTypes = true;
        return this;
    }

    excludeAll() {
        this.allowedTypes = [];
        return this;
    }

    isTop() {
        return this.allowedTypes === true;
    }

    toDefinition() {
        if (this.allowedTypes === true)
            return ["object"];

        return this.allowedTypes.map(type => "{" + Array.from(type.entries()).map(entry => `${entry[0]}: ${entry[1].toDefinition()}`).join(", ") + "}");
    }
}

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