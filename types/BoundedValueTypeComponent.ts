import {List, Map} from "immutable";
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
        let m = this.allowedValues;
        for (let key of other.allowedValues.keySeq().toArray()) {
            if (other.allowedValues.get(key))
                m = m.set(key, true);
        }
        return this.newInstance(m);
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

        return this.allowedValues.filter((allowed, value) => allowed).map((allowed, value) => this.nameFor(value)).toArray();
    }

    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters) {
        if (!parameters.roundUpFromBottom && this.isBottom() && !superType.isBottom())
            return false;

        return this.allowedValues.every((allowed, value) => allowed || !superType.allowedValues.get(value) || validator.validate({singleValue: true, value: () => value}));
    }

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        if (this.isBottom() && !parameters.roundUpFromBottom)
            return this;

        return this.newInstance(this.allowedValues.map((allowed, value) => allowed || validator.validate({singleValue: true, value: () => value})).toMap());
    }

    ascendingPaths(params: [Validator, RoundUpParameters]) {
        return List<this>();
    }

    protected abstract getName(): string;
    protected abstract nameFor(value: T): string;
}