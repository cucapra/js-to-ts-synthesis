import {Validator} from "../Validator";
import {LatticeElement} from "./Lattice";

type Variants = string[];

// Typescript struggles with this for some reason.
export function pair<T1, T2>(k: T1, v: T2): [T1, T2] {
    return [k, v];
}

export interface RoundUpParameters {
    /**
     * If this flag is set, type components will always try to round up, even if so value was seen.
     */
    roundUpFromBottom: boolean;
}

export interface TypeComponent<T> extends LatticeElement<TypeComponent<T>, [Validator, RoundUpParameters]> {
    include(value: T): this;
    includeType(type: this): this;

    isTop(): boolean;
    isBottom(): boolean;

    /**
     * Returns an array of options. Concatenating these together with a "|" gives the Typescript definition for this type component.
     */
    toDefinition(): Variants;

    /**
     * Tries values that are valid values of `superType` but not of this type.
     * Return true if (heuristically) the two types can be considered equivalent.
     */
    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters): boolean;

    roundUp(validator: Validator, parameters: RoundUpParameters): this;
}