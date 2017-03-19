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

export interface Type {
    nullType: boolean;
    undefinedType: boolean;
    booleanType: {true: boolean, false: boolean};
    numberType: true | NumberSet;
    stringType: true | StringSet;
    functionType: boolean;
    arrayOrTupleType: {kind: "array", type: Type} | {kind: "tuple", type: Type[]} | false;
    objectType: Map<Type> | false;
};

export interface LowerBoundType {
    nullType: boolean;
    undefinedType: boolean;
    booleanType: {true: boolean, false: boolean};
    numberType: NumberSet;
    stringType: StringSet;
    functionType: boolean;
    arrayOrTupleType: {kind: "tuple", type: LowerBoundType[]} | false;
    objectType: Map<LowerBoundType> | false;
}

// Convenience method. Gets the bottom type (nothing can be assigned to this)
export function bottom(): LowerBoundType {
    return {
        nullType: false,
        undefinedType: false,
        booleanType: {true: false, false: false},
        numberType: {},
        stringType: {},
        functionType: false,
        arrayOrTupleType: false,
        objectType: false
    };
}

function toString(value: any): string {
    return JSON.stringify(value);
}

export function toDefinition(type: Type): string {
    /*if (type === "top") {
        return "{}";
    }*/

    let pieces: string[] = [];
    if (type.nullType)
        pieces.push("null");

    if (type.undefinedType)
        pieces.push("undefined");

    if (type.booleanType.true) {
        if (type.booleanType.false)
            pieces.push("boolean");
        else
            pieces.push("true");
    }
    else if (type.booleanType.false) {
        pieces.push("false");
    }

    if (type.numberType === true) {
        pieces.push("number");
    }
    else {
        let values = Object.keys(type.numberType).map(toString);
        if (values.length > 0)
            pieces.push(values.join("|"));
    }


    if (type.stringType === true) {
        pieces.push("string");
    }
    else {
        let values = Object.keys(type.stringType).map(toString);
        if (values.length > 0)
            pieces.push(values.join("|"));
    }

    if (type.functionType)
        pieces.push("(...args: any[]) => any");

    if (type.arrayOrTupleType) {
        switch (type.arrayOrTupleType.kind) {
            case "tuple":
                pieces.push("[" + type.arrayOrTupleType.type.map(toDefinition).join(", ") + "]");
                break;
            case "array":
                pieces.push(toDefinition(type.arrayOrTupleType.type) + "[]");
                break;
        }
    }

    if (type.objectType) {
        let d = type.objectType;
        pieces.push("{" + Object.keys(d).map(k => `${k}: ${toDefinition(d[k])}`).join(", ") + "}");
    }

    return pieces.join("|");
}