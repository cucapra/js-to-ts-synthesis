import {Set} from "immutable";
import {Validator} from "../Validator";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

export abstract class SetTypeComponent<T> implements TypeComponent<T> {
    private values: true | Set<T> = Set<T>().asMutable();

    include(value: T) {
        if (this.values !== true)
            this.values.add(value);
    }

    includeType(other: this) {
        if (other.values === true) {
            this.values = true;
        }
        else if (this.values !== true) {
            this.values.merge(other.values);
        }
    }

    includeAll() {
        this.values = true;
    }

    excludeAll() {
        this.values = Set<T>().asMutable();
    }

    isTop() {
        return this.values === true;
    }

    isBottom() {
        return this.values !== true && this.values.size === 0;
    }

    toDefinition() {
        if (this.values === true)
            return [this.getName()];
        return this.values.toArray().map(n => JSON.stringify(n));
    }

    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters) {
        if (this.values === true)
            return true;
        if (!parameters.roundUpFromBottom && this.isBottom() && !superType.isBottom())
            return false;

        let myValues = this.values;

        return superType.values === true
            ? validator.validate({value: () => this.valueNotInSet()}) // Check a few random values values outside of this set
              /* TODO use subtract */
            : superType.values.toArray().filter(el => !myValues.has(el)).every(value => validator.validate({singleValue: true, value: () => value})); // Check all values in the top type, but not in this set.
    }

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        if ((parameters.roundUpFromBottom || !this.isBottom()) && this.values !== true && validator.validate({value: () => this.valueNotInSet()}))
            this.values = true;
    }

    private valueNotInSet(): T {
        if (this.values === true) {
            throw Error("No such value");
        }
        let v: T;
        do {
            v = this.randomValue();
        }
        while (this.values.has(v));
        return v;
    }

    protected abstract getName(): string;
    protected abstract randomValue(): T;

}