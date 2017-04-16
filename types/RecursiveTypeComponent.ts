import {Iterable, List, Map, Range} from "immutable";
import {Validator} from "../Validator";
import {Type} from "./Type";
import {pair, RoundUpParameters, TypeComponent} from "./TypeComponent";

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T> {
    /**
     * These types can be in one of two styles.
     * 1) Tuple-like, where there is a type condition on the prefix of the type.
     * 2) Array-like, where there is a type condition on every element in the type.
     *
     * This common implementation supports arrays/tuples and objects.
     * In general, this can be a union of these, or the top type (any[] or object)
     */
    constructor(private readonly allowedTypes: true | { readonly arrayLike: List<Type>, readonly tupleLike: List<Map<IndexT, Type>>}) {
    }

    abstract newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, readonly tupleLike: List<Map<IndexT, Type>>}): this;

    protected abstract typeFor(value: T): Map<IndexT, Type>
    protected abstract definitionOfTopType(): string;
    protected abstract definitionOfArrayLikeType(type: Type): string;
    protected abstract definitionOfTupleLikeType(type: Map<IndexT, Type>): string;

    protected abstract emptyValue(): T;

    include(value: T) {
        if (this.allowedTypes === true)
            return this;
        return this.newInstance({arrayLike: this.allowedTypes.arrayLike, tupleLike: this.allowedTypes.tupleLike.push(this.typeFor(value))});
    }

    includeType(other: this) {
        if (other.allowedTypes === true) {
            return this.newInstance(true);
        }
        if (this.allowedTypes !== true) {
            return this.newInstance({
                arrayLike: this.allowedTypes.arrayLike.concat(other.allowedTypes.arrayLike).toList(),
                tupleLike: this.allowedTypes.tupleLike.concat(other.allowedTypes.tupleLike).toList()
            });
        }
        return this;
    }

    isSubtypeOf(other: this) {
        return other.allowedTypes === true || (this.allowedTypes !== true
            && this.arrayLikeIsSubtypeOf(this.allowedTypes.arrayLike, other.allowedTypes.arrayLike)
            && this.tupleLikeIsSubtypeOf(this.allowedTypes.tupleLike, other.allowedTypes.tupleLike));
    }

    private arrayLikeIsSubtypeOf(thisArrayLike: List<Type>, otherArrayLike: List<Type>): boolean {
        return thisArrayLike.every(thisType => otherArrayLike.some(otherType => thisType.isSubtypeOf(otherType)));
    }

    private tupleLikeIsSubtypeOf(thisTupleLike: List<Map<IndexT, Type>>, otherTupleLike: List<Map<IndexT, Type>>): boolean {
        return thisTupleLike.every(thisTuple => otherTupleLike.some(otherTuple => this.tupleIsSubtypeOf(thisTuple, otherTuple)));
    }

    private tupleIsSubtypeOf(thisTuple: Map<IndexT, Type>, otherTuple: Map<IndexT, Type>) {
        return otherTuple.every((type, key) => thisTuple.has(key) && thisTuple.get(key).isSubtypeOf(type));
    }

    includeAll() {
        return this.newInstance(true);
    }

    excludeAll() {
        return this.newInstance({arrayLike: List<Type>(), tupleLike: List<Map<IndexT, Type>>()});
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

        for (let entry of this.allowedTypes.tupleLike.toArray()) {
            definitions.push(this.definitionOfTupleLikeType(entry));
        }

        return definitions;
    }

    /**
     * Valid transformations include:
     * 1) Changing any component of any tuple type.
     */
    ascendingPaths([validator, params]: [Validator, RoundUpParameters]) {
        return List([
            this.recursiveTupleLikeAscendingPaths(validator, params),
            this.ascendingPathsForTupleCombine()
        ]).flatMap(iterable => iterable);
    }

    /** Take the ascending paths for each tuple, and return this same type with the new tuple in the old one's place. */
    private recursiveTupleLikeAscendingPaths(validator: Validator, params: RoundUpParameters) {
        if (this.allowedTypes === true)
            return List<this>();

        let allowedTypes = this.allowedTypes;
        return allowedTypes.tupleLike.keySeq()
            .flatMap(index => this.recursiveAscendingPathsForTuple(allowedTypes.tupleLike.get(index), validator, params)
                .map(ascTuple => this.newInstance({arrayLike: allowedTypes.arrayLike, tupleLike: allowedTypes.tupleLike.set(index, ascTuple)})));
    }

    /** Take the ascending paths for each underlying type, and return this same tuple with the new type in the old type's place. */
    private recursiveAscendingPathsForTuple(tuple: Map<IndexT, Type>, validator: Validator, params: RoundUpParameters) {
        return tuple.keySeq()
            .flatMap(key => tuple.get(key).ascendingPaths([validator.forSubExpression(key), params])
                .map(ascType => tuple.set(key, ascType)));
    }

    /** Can combine any two tuples */
    private ascendingPathsForTupleCombine() {
        if (this.allowedTypes === true)
            return List<this>();

        let allowedTypes = this.allowedTypes;
        return uniqueIndexPairs(allowedTypes.tupleLike.size)
            .map(([i, j]) => allowedTypes.tupleLike.remove(i).remove(j - 1).push(this.combineTuples(allowedTypes.tupleLike.get(i), allowedTypes.tupleLike.get(j))))
            .map(tupleLike => this.newInstance({arrayLike: allowedTypes.arrayLike, tupleLike: tupleLike}));
    }

    private combineTuples(tuple1: Map<IndexT, Type>, tuple2: Map<IndexT, Type>) {
        return tuple1.mergeWith((type1, type2) => type1.includeType(type2), tuple2);
    }
}

function uniqueIndexPairs(n: number): Iterable<{}, [number, number]> {
    return Range(0, n).flatMap(i => Range(i + 1, n).map(j => pair(i, j)));
}