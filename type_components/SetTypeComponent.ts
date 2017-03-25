import {TypeComponent} from "./TypeComponent";
import {Validator} from "../Validator";

export abstract class SetTypeComponent<T> implements TypeComponent<T> {
    private values: true | Set<T> = new Set<T>();

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
            for (let value of Array.from(other.values.values())) {
                this.values.add(value);
            }
        }

        return this;
    }

    includeAll() {
        this.values = true;
        return this;
    }

    excludeAll() {
        this.values = new Set<T>();
        return this;
    }

    isTop() {
        return this.values === true;
    }

    toDefinition() {
        if (this.values === true)
            return [this.getName()];
        return Array.from(this.values).map(n => JSON.stringify(n));
    }

    generalize(validator: Validator) {
        if (this.values !== true && validator.validate({value: () => this.valueNotInSet()}))
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