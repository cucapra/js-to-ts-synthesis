import {List, Map} from "immutable";
import {val} from "../Module";
import {Type} from "../Type";
import {Validator} from "../Validator";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

// Use this to group tuples together.
// Make sure these are sorted and immutable so they map be used as the key to a map
type IndexForTupleLike<IndexT> = List<IndexT>;

// The entries in this array should correspond to the entries in the IndexForTupleLike
type TupleType = List<Type>;

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T> {
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
    }

    includeAll() {
        this.allowedTypes = true;
    }

    excludeAll() {
        this.allowedTypes = this.empty();
    }

    isTop() {
        return this.allowedTypes === true;
    }

    isBottom() {
        return this.allowedTypes !== true && this.allowedTypes.arrayLike.length === 0 && this.allowedTypes.tupleLike.size === 0;
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

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        this.roundUpTypesRecursively(validator, parameters);
        this.mergeTupleTypes(validator, parameters);
    }

    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters) {
        if (this.allowedTypes === true)
            return true;
        if (!parameters.roundUpFromBottom && this.isBottom() && !superType.isBottom())
            return false;

        // TODO: Make more general.
        if (superType.allowedTypes !== true && superType.allowedTypes.arrayLike.length === 0 && superType.allowedTypes.tupleLike.size === 0)
            return true;

        throw Error("No support yet");
    }

    /**
     * Generalize the underlying types of this type component.
     */
    private roundUpTypesRecursively(validator: Validator, parameters: RoundUpParameters) {
        if (this.allowedTypes !== true) {
            // TODO: Find a way to generalize array types

            for (let indices of this.allowedTypes.tupleLike.keySeq().toArray()) {
                for (let tuple of this.allowedTypes.tupleLike.get(indices)) {
                    for (let i = 0; i < indices.size; i++) {
                        tuple.get(i).roundUp(validator.forSubExpression(indices.get(i)), parameters);
                    }
                }
            }
        }
    }

    /**
     * Combine tuple types when possible.
     */
    private mergeTupleTypes(validator: Validator, parameters: RoundUpParameters) {
        if (this.allowedTypes !== true) {
            for (let indices of this.allowedTypes.tupleLike.keySeq().toArray()) {
                let tuples = this.allowedTypes.tupleLike.get(indices);
                let top = lowestUpperBound(indices, tuples);
                if (tuples.every(tuple => canRoundUpTuple(validator, tuple, top, parameters)))
                    // Combine these to the top type.
                    this.allowedTypes.tupleLike.set(indices, [top]);
            }
        }
    }
}

function lowestUpperBound<T>(indices: IndexForTupleLike<T>, tuples: TupleType[]) {
    return indices.map((_, index) => {
        let type = new Type("bottom");
        for (let tuple of tuples) {
            type.includeType(tuple.get(val(index)));
        }
        return type;
    }).toList();
}

function canRoundUpTuple(validator: Validator, tuple: TupleType, top: TupleType, parameters: RoundUpParameters) {
    return tuple.every((type, index) => val(type).canRoundUp(validator.forSubExpression(val(index)), top.get(val(index)), parameters));
}