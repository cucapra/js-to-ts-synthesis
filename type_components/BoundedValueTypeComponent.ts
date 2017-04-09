import {Validator} from "../Validator";
import {pair, RoundUpParameters, TypeComponent} from "./TypeComponent";

// Uses a slightly more complex implementation to allow for booleans as well as null and undefined.
export abstract class BoundedValueTypeComponent<T> implements TypeComponent<T> {
    private allowedValues: [T, boolean][];

    constructor(allowedValues: T[]) {
        this.allowedValues = allowedValues.map(e => pair(e, false));
    }

    include(value: T) {
        for (let entry of this.allowedValues) {
            if (entry[0] === value)
                entry[1] = true;
        }
    }

    includeType(other: this) {
        // Indexes should match here.
        for (let i = 0; i < this.allowedValues.length; i++) {
            if (other.allowedValues[i][1])
                this.allowedValues[i][1] = true;
        }
    }

    includeAll() {
        for (let entry of this.allowedValues) {
            entry[1] = true;
        }
    }

    excludeAll() {
        for (let entry of this.allowedValues) {
            entry[1] = false;
        }
    }

    isTop() {
        return this.allowedValues.every(entry => entry[1]);
    }

    isBottom() {
        return this.allowedValues.every(entry => !entry[1]);
    }

    toDefinition() {
        if (this.isTop())
            return [this.getName()];

        return this.allowedValues.filter(entry => entry[1]).map(entry => this.nameFor(entry[0]));
    }

    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters) {
        if (!parameters.roundUpFromBottom && this.isBottom() && !superType.isBottom())
            return false;

        return this.allowedValues.every(([value, allowed], i) => allowed || !superType.allowedValues[i][1] || validator.validate({singleValue: true, value: () => value}));
    }

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        if (parameters.roundUpFromBottom || !this.isBottom()) {
            for (let entry of this.allowedValues) {
                if (!entry[1] && validator.validate({singleValue: true, value: () => entry[0]}))
                    entry[1] = true;
            }
        }
    }

    protected abstract getName(): string;
    protected abstract nameFor(value: T): string;
}