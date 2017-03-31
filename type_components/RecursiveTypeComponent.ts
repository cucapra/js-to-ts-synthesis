import {List, Map} from "immutable";
import {Type} from "../Type";
import {Validator} from "../Validator";
import {TypeComponent} from "./TypeComponent";

// Use this to group tuples together.
// Make sure these are sorted and immutable so they map be used as the key to a map
type IndexForTupleLike<IndexT> = List<IndexT>;

// The entries in this array should correspond to the entries in the IndexForTupleLike
type TupleType = List<Type>;

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T, null> {
    /**
     * These types can be in one of two styles.
     * 1) Tuple-like, where there is a type condition on the prefix of the type.
     * 2) Array-like, where there is a type condition on every element in the type.
     *
     * This common implementation supports arrays/tuples and objects.
     * In general, this can be a union of these, or the top type (any[] or object)
     */
    private allowedTypes: true | { arrayLike: Type[], tupleLike: Map<IndexForTupleLike<IndexT>, TupleType[]>} = this.empty();

    private empty() {
        return {arrayLike: [], tupleLike: Map<IndexForTupleLike<IndexT>, TupleType[]>().asMutable()};
    }

    protected abstract typeFor(value: T): /* Sorted by index */ [IndexT, Type][];
    protected abstract definitionOfTopType(): string;
    protected abstract definitionOfArrayLikeType(type: Type): string;
    protected abstract definitionOfTupleLikeType(indices: List<IndexT>, types: List<Type>): string;

    protected abstract emptyValue(): T;

    include(value: T) {
        if (this.allowedTypes !== true) {
            let type = this.typeFor(value);
            let indices = List(type.map(e => e[0]));
            let types = List(type.map(e => e[1]));
            if (!this.allowedTypes.tupleLike.has(indices))
                this.allowedTypes.tupleLike.set(indices, []);
            this.allowedTypes.tupleLike.get(indices).push(types);
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
            for (let key of other.allowedTypes.tupleLike.keySeq().toArray()) {
                if (!this.allowedTypes.tupleLike.has(key))
                    this.allowedTypes.tupleLike.set(key, []);
                for (let entry of other.allowedTypes.tupleLike.get(key)) {
                    this.allowedTypes.tupleLike.get(key).push(entry);
                }
            }
        }

        return this;
    }

    includeAll() {
        this.allowedTypes = true;
        return this;
    }

    excludeAll() {
        this.allowedTypes = this.empty();
        return this;
    }

    isTop() {
        return this.allowedTypes === true;
    }

    toDefinition() {
        if (this.allowedTypes === true)
            return [this.definitionOfTopType()];

        let definitions = [];
        for (let entry of this.allowedTypes.arrayLike) {
            definitions.push(this.definitionOfArrayLikeType(entry));
        }

        for (let key of this.allowedTypes.tupleLike.keySeq().toArray()) {
            for (let entry of this.allowedTypes.tupleLike.get(key)) {
                definitions.push(this.definitionOfTupleLikeType(key, entry));
            }
        }

        return definitions;
    }

    generalize(validator: Validator) {
        this.generalizeTypesRecursively(validator);
    }

    /**
     * Generalize the underlying types of this type component.
     */
    private generalizeTypesRecursively(validator: Validator) {
        if (this.allowedTypes !== true) {
            // TODO: Find a way to generalize array types

            for (let indices of this.allowedTypes.tupleLike.keySeq().toArray()) {
                for (let tuple of this.allowedTypes.tupleLike.get(indices)) {
                    for (let i = 0; i < indices.size; i++) {
                        tuple.get(i).generalize(validator.forSubExpression(indices.get(i)));
                    }
                }
            }
        }
    }
}