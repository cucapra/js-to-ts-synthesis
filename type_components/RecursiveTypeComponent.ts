import {TypeComponent} from "./TypeComponent";
import {Type} from "../Type";
import {Validator} from "../Validator";

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T> {

    /**
     * These types can be in one of two styles.
     * 1) Tuple-like, where there is a type condition on the prefix of the type.
     * 2) Array-like, where there is a type condition on every element in the type.
     *
     * This common implementation supports arrays/tuples and objects.
     * In general, this can be a union of these, or the top type (any[] or object)
     */
    private allowedTypes: true | { arrayLike: Type[], tupleLike: Map<IndexT, Type>[]} = {arrayLike: [], tupleLike: []};

    protected abstract typeFor(value: T): Map<IndexT, Type>;
    protected abstract definitionOfTopType(): string;
    protected abstract definitionOfArrayLikeType(type: Type): string;
    protected abstract definitionOfTupleLikeType(type: Map<IndexT, Type>): string;

    protected abstract emptyValue(): T;

    include(value: T) {
        if (this.allowedTypes !== true) {
            this.allowedTypes.tupleLike.push(this.typeFor(value));
        }
        return this;
    }

    includeType(other: this) {
        if (other.allowedTypes === true) {
            this.allowedTypes = true;
        }
        else if (this.allowedTypes !== true) {
            for (let entry of other.allowedTypes.arrayLike) {
                this.allowedTypes.arrayLike.push(entry);
            }
            for (let entry of other.allowedTypes.tupleLike) {
                this.allowedTypes.tupleLike.push(entry);
            }
        }

        return this;
    }

    includeAll() {
        this.allowedTypes = true;
        return this;
    }

    excludeAll() {
        this.allowedTypes = {arrayLike: [], tupleLike: []};
        return this;
    }

    isTop() {
        return this.allowedTypes === true;
    }

    toDefinition() {
        if (this.allowedTypes === true)
            return [this.definitionOfTopType()];

        let arrayValues = this.allowedTypes.arrayLike.map(this.definitionOfArrayLikeType);
        let tupleValues = this.allowedTypes.tupleLike.map(this.definitionOfTupleLikeType);
        return arrayValues.concat(tupleValues);
    }

    generalize(validator: Validator) {
        this.generalizeTrivially(validator);
        this.generalizeTypesRecursively(validator);
    }

    private generalizeTrivially(validator: Validator) {
        // If an empty value works, anything should work.
        if (this.allowedTypes !== true && validator.validate({singleValue: true, value: () => this.emptyValue()}))
            this.allowedTypes = true;
    }

    private generalizeTypesRecursively(validator: Validator) {
        if (this.allowedTypes !== true) {
            // TODO: Find a way to generalize array types

            for (let tupleLike of this.allowedTypes.tupleLike) {
                for (let [index, type] of Array.from(tupleLike.entries())) {
                    type.generalize(validator.forSubExpression(index));
                }
            }
        }
    }
}