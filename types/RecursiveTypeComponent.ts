import {List, Map} from "immutable";
import {Validator} from "../Validator";
import {Type} from "./Type";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

// Use this to group tuples together.
// Make sure these are sorted and immutable so they map be used as the key to a map
export type IndexForTupleLike<IndexT> = List<IndexT>;

// The entries in this array should correspond to the entries in the IndexForTupleLike
export type TupleType = List<Type>;

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T> {
    /**
     * These types can be in one of two styles.
     * 1) Tuple-like, where there is a type condition on the prefix of the type.
     * 2) Array-like, where there is a type condition on every element in the type.
     *
     * This common implementation supports arrays/tuples and objects.
     * In general, this can be a union of these, or the top type (any[] or object)
     */
    constructor(private readonly allowedTypes: true | { readonly arrayLike: List<Type>, tupleLike: Map<IndexForTupleLike<IndexT>, List<TupleType>>}) {
    }

    abstract newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, tupleLike: Map<IndexForTupleLike<IndexT>, List<TupleType>>}): this;

    protected abstract typeFor(value: T): /* Sorted by index */ [IndexT, Type][];
    protected abstract definitionOfTopType(): string;
    protected abstract definitionOfArrayLikeType(type: Type): string;
    protected abstract definitionOfTupleLikeType(indices: List<IndexT>, types: List<Type>): string;

    protected abstract emptyValue(): T;

    include(value: T) {
        if (this.allowedTypes === true)
            return this;

        let type = this.typeFor(value);
        let indices = List(type.map(e => e[0]));
        let types = List(type.map(e => e[1]));
        let tupleLike = this.allowedTypes.tupleLike;
        if (!tupleLike.has(indices))
            tupleLike = tupleLike.set(indices, List<TupleType>());
        tupleLike = tupleLike.update(indices, t => t.push(types));

        return this.newInstance({arrayLike: this.allowedTypes.arrayLike, tupleLike: tupleLike});
    }

    includeType(other: this) {
        if (other.allowedTypes === true) {
            return this.newInstance(true);
        }
        else if (this.allowedTypes !== true) {
            let arrayLike = this.allowedTypes.arrayLike;
            let tupleLike = this.allowedTypes.tupleLike;

            for (let entry of other.allowedTypes.arrayLike.toArray()) {
                arrayLike = arrayLike.push(entry);
            }
            for (let key of other.allowedTypes.tupleLike.keySeq().toArray()) {
                if (!this.allowedTypes.tupleLike.has(key))
                    tupleLike = tupleLike.set(key, List<TupleType>());
                for (let entry of other.allowedTypes.tupleLike.get(key).toArray()) {
                    tupleLike = tupleLike.update(key, a => a.push(entry)); ;
                }
            }
            return this.newInstance({arrayLike: arrayLike, tupleLike: tupleLike});
        }
        return this;

    }

    includeAll() {
        return this.newInstance(true);
    }

    excludeAll() {
        return this.newInstance({arrayLike: List<Type>(), tupleLike: Map<IndexForTupleLike<IndexT>, List<TupleType>>()});
    }

    isTop() {
        return this.allowedTypes === true;
    }

    isBottom() {
        return this.allowedTypes !== true && this.allowedTypes.arrayLike.size === 0 && this.allowedTypes.tupleLike.size === 0;
    }

    toDefinition() {
        if (this.allowedTypes === true)
            return [this.definitionOfTopType()];

        let definitions = [];
        for (let entry of this.allowedTypes.arrayLike.toArray()) {
            definitions.push(this.definitionOfArrayLikeType(entry));
        }

        for (let key of this.allowedTypes.tupleLike.keySeq().toArray()) {
            for (let entry of this.allowedTypes.tupleLike.get(key).toArray()) {
                definitions.push(this.definitionOfTupleLikeType(key, entry));
            }
        }

        return definitions;
    }

    roundUp(validator: Validator, parameters: RoundUpParameters) {
        return this.roundUpTypesRecursively(validator, parameters).mergeTupleTypes(validator, parameters);
    }

    canRoundUp(validator: Validator, superType: this, parameters: RoundUpParameters) {
        if (this.allowedTypes === true)
            return true;
        if (!parameters.roundUpFromBottom && this.isBottom() && !superType.isBottom())
            return false;

        // TODO: Make more general.
        if (superType.allowedTypes !== true && superType.allowedTypes.arrayLike.size === 0 && superType.allowedTypes.tupleLike.size === 0)
            return true;

        throw Error("No support yet");
    }

    /**
     * Generalize the underlying types of this type component.
     */
    private roundUpTypesRecursively(validator: Validator, parameters: RoundUpParameters) {
        if (this.allowedTypes !== true) {
            return this.newInstance({arrayLike: this.allowedTypes.arrayLike, tupleLike: this.allowedTypes.tupleLike.map(
                tuples => tuples.map(
                    tuple => tuple.map(type => type.roundUp(validator, parameters)).toList()
                    ).toList()).toMap()});
        }
        return this;
    }

    /**
     * Combine tuple types when possible.
     */
    private mergeTupleTypes(validator: Validator, parameters: RoundUpParameters) {
        /*if (this.allowedTypes !== true) {
            for (let indices of this.allowedTypes.tupleLike.keySeq().toArray()) {
                let tuples = this.allowedTypes.tupleLike.get(indices);
                let top = lowestUpperBound(indices, tuples);
                if (tuples.every(tuple => canRoundUpTuple(validator, tuple, top, parameters)))
                    // Combine these to the top type.
                    this.allowedTypes.tupleLike.set(indices, [top]);
            }
        }*/
        return this;
    }

    ascendingPaths(params: [Validator, RoundUpParameters]) {
        return List<this>();
    }
}

/*
function lowestUpperBound<T>(indices: IndexForTupleLike<T>, tuples: List<TupleType>) {
    return indices.map((_, index) => {
        let type = Type.bottom;
        for (let tuple of tuples.toArray()) {
            type = type.includeType(tuple.get(val(index)));
        }
        return type;
    }).toList();
}

function canRoundUpTuple(validator: Validator, tuple: TupleType, top: TupleType, parameters: RoundUpParameters) {
    return tuple.every((type, index) => val(type).canRoundUp(validator.forSubExpression(val(index)), top.get(val(index)), parameters));
}*/