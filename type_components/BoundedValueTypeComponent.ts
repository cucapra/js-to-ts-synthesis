import {TypeComponent} from "./TypeComponent";
import {Validator} from "../Validator";

export abstract class BoundedValueTypeComponent<T> implements TypeComponent<T> {
    private allowedValues: {value: T, allowed: boolean}[];

    constructor(allowedValues: T[]) {
        this.allowedValues = allowedValues.map(e => ({value: e, allowed: false}));
    }

    include(value: T) {
        for (let entry of this.allowedValues) {
            if (entry.value === value)
                entry.allowed = true;
        }
        return this;
    }

    includeType(other: this) {
        // Indexes should match here.
        for (let i = 0; i < this.allowedValues.length; i++) {
            if (other.allowedValues[i].allowed)
                this.allowedValues[i].allowed = true;
        }
        return this;
    }

    includeAll() {
        for (let entry of this.allowedValues) {
            entry.allowed = true;
        }
        return this;
    }

    excludeAll() {
        for (let entry of this.allowedValues) {
            entry.allowed = false;
        }
        return this;
    }

    isTop() {
        return this.allowedValues.every(entry => entry.allowed);
    }

    toDefinition() {
        if (this.isTop())
            return [this.getName()];

        return this.allowedValues.filter(entry => entry.allowed).map(entry => this.nameFor(entry.value));
    }

    generalize(validator: Validator) {
        for (let entry of this.allowedValues) {
            if (!entry.allowed && validator.validate({singleValue: true, value: () => entry.value}))
                entry.allowed = true;
        }
    }

    protected abstract getName(): string;
    protected abstract nameFor(value: T): string;
}