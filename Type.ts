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

export interface AnyType {
    kind: "any";
}

export interface RestrictedType {
    kind: "restricted";
    nullType?: true;
    undefinedType?: true;
    booleanTrueType?: true;
    booleanFalseType?: true;
    numberType?: true | NumberSet;
    stringType?: true | StringSet;
    functionType?: true;
    arrayOrTupleType?: {kind: "array", type: Type} | {kind: "tuple", type: Type[]};
    objectType?: true | Map<Type>;
}

export type Type = AnyType | RestrictedType;

export interface LowerBoundType {
    kind: "restricted";
    nullType?: true;
    undefinedType?: true;
    booleanTrueType?: true;
    booleanFalseType?: true;
    numberType?: NumberSet;
    stringType?: StringSet;
    functionType?: true;
    arrayOrTupleType?: {kind: "tuple", type: LowerBoundType[]};
    objectType?: Map<LowerBoundType>;
}

function toString(value: any): string {
    return JSON.stringify(value);
}

export function toDefinition(type: Type): string {
    if (type.kind === "any")
        return "any";

    let pieces: string[] = [];
    if (type.nullType !== undefined)
        pieces.push("null");

    if (type.undefinedType !== undefined)
        pieces.push("undefined");

    if (type.booleanTrueType !== undefined) {
        if (type.booleanFalseType !== undefined)
            pieces.push("boolean");
        else
            pieces.push("true");
    }
    else if (type.booleanFalseType !== undefined) {
        pieces.push("false");
    }

    if (type.numberType !== undefined) {
        if (type.numberType === true)
            pieces.push("number");
        else
            pieces.push(Object.keys(type.numberType).map(toString).join("|"));
    }

    if (type.stringType !== undefined) {
        if (type.stringType === true)
            pieces.push("string");
        else
            pieces.push(Object.keys(type.stringType).map(toString).join("|"));
    }

    if (type.functionType !== undefined)
        pieces.push("(...args: any[]) => any");

    if (type.arrayOrTupleType !== undefined) {
        switch (type.arrayOrTupleType.kind) {
            case "tuple":
                pieces.push("[" + type.arrayOrTupleType.type.map(toDefinition).join(", ") + "]");
                break;
            case "array":
                pieces.push(toDefinition(type.arrayOrTupleType.type) + "[]");
                break;
        }
    }

    if (type.objectType !== undefined) {
        if (type.objectType === true) {
            pieces.push("any");
        }
        else {
            let d = type.objectType;
            pieces.push("{" + Object.keys(d).map(k => `${k}: ${toDefinition(d[k])}`).join(", ") + "}");
        }
    }

    return pieces.join("|");
}