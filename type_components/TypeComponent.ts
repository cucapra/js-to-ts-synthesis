import {Validator} from "../Validator";

type Variants = string[];

// Typescript struggles with this for some reason.
export function pair<T1, T2>(k: T1, v: T2): [T1, T2] {
    return [k, v];
}

export interface TypeComponent<T, ConstraintT> {
    include(value: T): this;
    includeType(type: this): this;
    includeAll(): this;
    excludeAll(): this;

    isTop(): boolean;

    /**
     * Returns an array of options. Concatenating these together with a "|" gives the Typescript definition for this type component.
     */
    toDefinition(): Variants;

    /**
     * Returns a set of constraints, one of which that must be met, for a value to satisfy this type.
     * If all of these are falsified, a value cannot be of this type.
     *
     * For example, "a"|"b" has two constraints, x: "a" and x: "b"
     */
    // toConstraints(): ConstraintT[];

    generalize(validator: Validator): void;
}