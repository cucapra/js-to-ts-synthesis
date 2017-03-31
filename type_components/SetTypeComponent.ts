import {Set} from "immutable";
import {Validator} from "../Validator";
import {TypeComponent} from "./TypeComponent";

type AnyConstraint = undefined;

export abstract class SetTypeComponent<T> implements TypeComponent<T, T | AnyConstraint> {
    private values: true | Set<T> = Set<T>().asMutable();

    include(value: T) {
        if (this.values !== true)
            this.values.add(value);
        return this;
    }

    includeType(other: this) {
        if (other.values === true) {
            this.values = true;
        }
        else if (this.values !== true) {
            this.values.merge(other.values);
        }

        return this;
    }

    includeAll() {
        this.values = true;
        return this;
    }

    excludeAll() {
        this.values = Set<T>().asMutable();
        return this;
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

    toConstraints() {
        if (this.values === true)
            return [undefined];
        return this.values.toArray();
    }

    generalize(validator: Validator) {
        if (!this.isBottom() && !this.isTop() && validator.validate({value: () => this.valueNotInSet()}))
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