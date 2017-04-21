import {Iterable, List, Map} from "immutable";
import {Validator} from "../Validator";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

// Uses a slightly more complex implementation to allow for booleans as well as null and undefined.
export abstract class BoundedValueTypeComponent<T> implements TypeComponent<T> {

    constructor(private readonly allowedValues: Map<T, boolean>) {
    }

    abstract newInstance(allowedValues: Map<T, boolean>): this;

    include(value: T) {
        return this.newInstance(this.allowedValues.set(value, true));
    }

    includeType(other: this) {
        return this.newInstance(this.allowedValues.map((allowed, value) => allowed || other.allowedValues.get(value)).toMap());
    }

    isSubtypeOf(other: this) {
        return this.allowedValues.every((allowed, value) => !allowed || other.allowedValues.get(value));
    }

    includeAll() {
        return this.newInstance(this.allowedValues.map(() => true).toMap());
    }

    excludeAll() {
        return this.newInstance(this.allowedValues.map(() => false).toMap());
    }

    isTop() {
        return this.allowedValues.every(allowed => allowed);
    }

    isBottom() {
        return this.allowedValues.every(allowed => !allowed);
    }

    toDefinition() {
        if (this.isTop())
            return [this.getName()];
        return this.allowedValues.filter(allowed => allowed).map((allowed, value) => this.nameFor(value)).toArray();
    }

    ascendingPaths([validator, params]: [Validator, RoundUpParameters]): Iterable<{}, [this, boolean, string, {}[]]> {
        if (this.isBottom() && !params.roundUpFromBottom)
            return List<[this, boolean, string, {}[]]>();
        return this.allowedValues
            .filter(allowed => !allowed)
            .map((allowed, value) => {
                let [valid, examples] = validator.validate({singleValue: true, value: () => value});
                return <[this, boolean, string, {}[]]>[this.include(value), valid, "INCLUDE-VALUE", examples];
            });
    }

    protected abstract getName(): string;
    protected abstract nameFor(value: T): string;
}