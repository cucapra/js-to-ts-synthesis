import {Validator} from "../Validator";
import {LatticeElement} from "./Lattice";

type Variants = string[];

export interface RoundUpParameters {
    /** If this flag is set, type components will always try to round up, even if so value was seen. */
    roundUpFromBottom: boolean;
}

export interface TypeComponent<T> extends LatticeElement<[Validator, RoundUpParameters]> {
    include(value: T): this;
    includeType(type: this): this;
    isSubtypeOf(type: this): boolean;
}