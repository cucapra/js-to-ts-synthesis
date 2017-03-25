import {Validator} from "../Validator";

type Variants = string[];

export interface TypeComponent<T> {
    include(value: T): this;
    includeType(type: this): this;
    includeAll(): this;
    excludeAll(): this;

    isTop(): boolean;
    toDefinition(): Variants;

    generalize(validator: Validator): void;
}