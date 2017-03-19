

// Third party Sets and Maps don't work well with the assertion library. Use our own.
export type NumberSet = {[key: number]: true};
export type StringSet = {[key: string]: true};
export type Map<V> = { [key: string]: V };

export function toNumberSet(...arr: number[]): NumberSet {
    let set: NumberSet = {};
    for (let e of arr) {
        set[e] = true;
    }
    return set;
}

export function toStringSet(...arr: string[]): StringSet {
    let set: StringSet = {};
    for (let e of arr) {
        set[e] = true;
    }
    return set;
}

export class Type {
    private nullType: boolean;
    private undefinedType: boolean;
    private booleanType: {true: boolean, false: boolean};
    private numberType: true | NumberSet;
    private stringType: true | StringSet;
    private functionType: boolean;
    private arrayOrTupleType: {kind: "array", type: Type} | {kind: "array-of-top"} | {kind: "tuple", type: Type[]} | false;
    private objectType: Map<Type> | false;

    constructor(of: "bottom"|"top") {
        switch (of) {
            case "bottom":
                this.nullType = false;
                this.undefinedType = false;
                this.booleanType = {true: false, false: false};
                this.numberType = {};
                this.stringType = {};
                this.functionType = false;
                this.arrayOrTupleType = false;
                this.objectType = false;
                break;
            case "top":
                this.nullType = true;
                this.undefinedType = true;
                this.booleanType = {true: true, false: true};
                this.numberType = true;
                this.stringType = true;
                this.functionType = true;
                this.arrayOrTupleType = {kind: "array-of-top"};
                this.objectType = {};
                break;
        }
    }

    exclude(markers: string[]): this {
        for (let typeofMarker of markers) {
            switch (typeofMarker) {
                case "undefined":
                    this.undefinedType = false;
                    break;
                case "object":
                    this.nullType = false;
                    this.objectType = false;
                    this.arrayOrTupleType = false;
                    break;
                case "boolean":
                    this.booleanType.true = this.booleanType.false = false;
                    break;
                case "number":
                    this.numberType = {};
                    break;
                case "string":
                    this.stringType = {};
                    break;
                case "function":
                    this.functionType = false;
                    break;
            }
        }
        return this;
    }

    include(markers: string[]): this {
        for (let typeofMarker of markers) {
            switch (typeofMarker) {
                case "undefined":
                    this.undefinedType = true;
                    break;
                case "object":
                    this.nullType = true;
                    if (this.objectType === false)
                        this.objectType = {};
                    if (this.arrayOrTupleType === false)
                        this.arrayOrTupleType = {kind: "array-of-top"};
                    break;
                case "boolean":
                    if (!this.booleanType.false && !this.booleanType.true)
                        this.booleanType.true = this.booleanType.false = true;
                    break;
                case "number":
                    if (this.numberType !== true && Object.keys(this.numberType).length === 0)
                        this.numberType = true;
                    break;
                case "string":
                    if (this.stringType !== true && Object.keys(this.stringType).length === 0)
                        this.stringType = true;
                    break;
                case "function":
                    this.functionType = true;
                    break;
            }
        }
        return this;
    }

    toDefinition(): string {
        let pieces: string[] = [];
        if (this.nullType)
            pieces.push("null");

        if (this.undefinedType)
            pieces.push("undefined");

        if (this.booleanType.true) {
            if (this.booleanType.false)
                pieces.push("boolean");
            else
                pieces.push("true");
        }
        else if (this.booleanType.false) {
            pieces.push("false");
        }

        if (this.numberType === true) {
            pieces.push("number");
        }
        else {
            let values = Object.keys(this.numberType).map(n => JSON.stringify(n));
            if (values.length > 0)
                pieces.push(values.join("|"));
        }

        if (this.stringType === true) {
            pieces.push("string");
        }
        else {
            let values = Object.keys(this.stringType).map(s => JSON.stringify(s));
            if (values.length > 0)
                pieces.push(values.join("|"));
        }

        if (this.functionType)
            pieces.push("((...args: any[]) => any)");

        if (this.arrayOrTupleType) {
            switch (this.arrayOrTupleType.kind) {
                case "tuple":
                    pieces.push("[" + this.arrayOrTupleType.type.map(t => t.toDefinition()).join(", ") + "]");
                    break;
                case "array":
                    pieces.push(this.arrayOrTupleType.type.toDefinition() + "[]");
                    break;
                case "array-of-top":
                    pieces.push("{}[]");
                    break;
            }
        }

        if (this.objectType !== false) {
            let d = this.objectType;
            if (Object.keys(d).length > 0)
                pieces.push("{" + Object.keys(d).map(k => `${k}: ${d[k].toDefinition()}`).join(", ") + "}");
            else
                pieces.push("object");
        }

        let definition = pieces.join("|");
        return (definition === "null|undefined|boolean|number|string|((...args: any[]) => any)|{}[]|object") ? "{}" : definition;
    }

    extendSimple(value: any): this {
        if (value === null) {
            this.nullType = true;
        }
        else {
            switch (typeof value) {
                case "undefined":
                    this.undefinedType = true;
                    break;
                case "boolean":
                    this.booleanType = {true: true, false: true};
                    break;
                case "number":
                    this.numberType = true;
                    break;
                case "string":
                    this.stringType = true;
                    break;
                case "function":
                    this.functionType = true;
                    break;
                case "object":
                    if (Array.isArray(value)) {
                        let elementType = new Type("bottom");
                        for (let e of value){
                            elementType.extendSimple(e);
                        }
                        this.arrayOrTupleType = {kind: "array", type: elementType};
                    }
                    else {
                        this.objectType = {};
                    }
                    break;
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
            }
        }
        return this;
    }

    extend(value: any): this {

        if (value === null) {
            this.nullType = true;
        }
        else {
            switch (typeof value) {
                case "undefined":
                    this.undefinedType = true;
                    break;
                case "boolean":
                    if (value)
                        this.booleanType.true = true;
                    else
                        this.booleanType.false = true;
                    break;
                case "number":
                    if (this.numberType !== true)
                        this.numberType[value] = true;
                    break;
                case "string":
                    if (this.stringType !== true)
                        this.stringType[value] = true;
                    break;
                case "function":
                    this.functionType = true;
                    break;
                case "object":
                    if (Array.isArray(value)) {
                        if (!this.arrayOrTupleType) {
                            let tupleType = value.map(arg => new Type("bottom").extend(arg));
                            this.arrayOrTupleType = {kind: "tuple", type: tupleType};
                        }
                        else if (this.arrayOrTupleType.kind === "array") {
                            for (let v of value){
                                this.arrayOrTupleType.type.extend(v);
                            }
                        }
                        else if (this.arrayOrTupleType.kind === "tuple") {
                            Type.mergeIntoTupleLowerBound(this.arrayOrTupleType.type, value);
                        }
                    }
                    else {
                        if (!this.objectType) {
                            this.objectType = {};
                            for (let k in value) {
                                this.objectType[k] = new Type("bottom").extend(value[k]);
                            }
                        }
                        else {
                            Type.mergeIntoObjectLowerBound(this.objectType, value);
                        }
                    }
                    break;
                default:
                    throw new Error(`Cannot convert ${typeof value}: ${value}`);
            }
        }
        return this;
    }

    private static mergeIntoTupleLowerBound(target: Type[], source: any[]) {
        let numEntries = Math.max(target.length, source.length);
        for (let i = 0; i < numEntries; i++) {
            if (i >= target.length) {
                // `source` has this, which means it's optional.
                let type = new Type("bottom");
                type.undefinedType = true;
                target[i] = type.extend(source[i]);
            }
            else if (i >= source.length) {
                // `source` doesn't have this, which means it's optional.
                target[i].undefinedType = true;
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
                type.undefinedType = true;
                target[k] = type.extend(source[k]);
            }
            else if (!(k in source)) {
                // `source` doesn't have this, which means it's optional.
                target[k].undefinedType = true;
            }
            else {
                target[k].extend(source[k]);
            }
        }
    }
};