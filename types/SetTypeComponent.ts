import {List, Set} from "immutable";
import {Validator} from "../Validator";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

export abstract class SetTypeComponent<T> implements TypeComponent<T> {
    constructor(private readonly values: true | Set<T>) {
    }

    abstract newInstance(values: true | Set<T>): this;

    include(value: T) {
        return (this.values === true) ? this : this.newInstance(this.values.add(value));
    }

    includeType(other: this) {
        if (other.values === true || this.values === true) {
            return this.newInstance(true);
        }
        return this.newInstance(this.values.union(other.values));
    }

    isSubtypeOf(other: this) {
        return other.values === true || (this.values !== true && this.values.isSubset(other.values));
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
        return this.values.sort().map(n => JSON.stringify(n)).toArray();
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

    ascendingPaths([validator, params]: [Validator, RoundUpParameters]) {
        if ((this.isBottom() && !params.roundUpFromBottom) || this.values === true)
            return List<[this, boolean, string, {}[]]>();

        return List([undefined]).toSeq()
            .map(() => {
                let [valid, examples] = validator.validate({value: () => this.valueNotInSet()});
                return <[this, boolean, string, {}[]]>[this.newInstance(true), valid, "ROUND-TO-TOP", examples];
            });
    }
}