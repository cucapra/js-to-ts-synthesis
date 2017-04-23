import {List, Map, Range} from "immutable";
import {Validator} from "../Validator";
import {Type} from "./Type";
import {RoundUpParameters, TypeComponent} from "./TypeComponent";

// A type extended with an example value.
export type TypeExt = [Type, {}];

export abstract class RecursiveTypeComponent<IndexT extends number|string, T> implements TypeComponent<T> {
    /**
     * These types can be in one of two styles.
     * 1) Tuple-like, where there is a type condition on the prefix of the type.
     * 2) Array-like, where there is a type condition on every element in the type.
     *
     * This common implementation supports arrays/tuples and objects.
     * In general, this can be a union of these, or the top type (any[] or object).
     */
    constructor(private readonly allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<IndexT, TypeExt>>}) {
    }

    abstract newInstance(allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<IndexT, TypeExt>>}): this;

    protected abstract typeFor(value: T): Map<IndexT, TypeExt>
    protected abstract definitionOfTopType(): string;
    protected abstract definitionOfArrayLikeType(type: TypeExt): string;
    protected abstract definitionOfTupleLikeType(type: Map<IndexT, TypeExt>): string;

    protected abstract valueForArrayLikeType(type: TypeExt): T;
    protected abstract valueForTupleLikeType(type: Map<IndexT, TypeExt>): T;

    /**
     * True for tuples (since [t1, t2] is valid, but [?, t2] isn't)
     * False for objects (since {x: t1, y: y2} -> {y: y2} is valid)
     */
    protected abstract tupleLikeRemoveIsPrefixRestricted(): boolean;

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
        if (other.allowedTypes === true)
            return true;
        if (this.allowedTypes === true)
            return false;

        let otherAllowedTypes = other.allowedTypes;

        let arrayLikeIsSubtypeOf = this.allowedTypes.arrayLike.every(([thisType]) => otherAllowedTypes.arrayLike.some(([otherType]) => thisType.isSubtypeOf(otherType)));
        if (!arrayLikeIsSubtypeOf)
            return false;

        let tupleLikeIsSubtypeOf = this.allowedTypes.tupleLike.every(thisTuple => otherAllowedTypes.tupleLike.some(otherTuple => this.tupleIsSubtypeOf(thisTuple, otherTuple)));
        if (!tupleLikeIsSubtypeOf)
            return false;

        return true;
    }

    /**
     * Returns a new RecursiveTypeComponent with the following properties:
     * 1) No two types in arrayLike have a subtype relationship.
     * 2) No two types in tupleLike have a subtype relationship.
     */
    condenseInternalRepresentation() {
        if (this.allowedTypes === true)
            return this;
        let allowedTypes = this.allowedTypes;

        let arrayLike = List<TypeExt>().withMutations(arrayLike => {
            for (let i = 0; i < allowedTypes.arrayLike.size; i++) {
                let [type, value] = allowedTypes.arrayLike.get(i);
                type = type.condenseInternalRepresentation();

                if (arrayLike.every(([type0]) => !type.isSubtypeOf(type0))) {

                    // New element is a candidate for adding.
                    // Remove every element that would be a subtype of this new type.
                    for (let i = 0; i < arrayLike.size; i++) {
                        if (arrayLike.get(i) !== undefined && arrayLike.get(i)[0].isSubtypeOf(type))
                            arrayLike.set(i, undefined); // Can't use delete with `withMutations`
                    }

                    arrayLike.push([type, value]);
                }
            }
        }).filter(e => e !== undefined).toList();

        let tupleLike = List<Map<IndexT, TypeExt>>().withMutations(tupleLike => {
            for (let i = 0; i < allowedTypes.tupleLike.size; i++) {
                let tuple = allowedTypes.tupleLike.get(i).map(([type, value]) => <TypeExt>[type.condenseInternalRepresentation(), value]).toMap();

                if (tupleLike.every(tuple0 => !this.tupleIsSubtypeOf(tuple, tuple0))) {

                    for (let i = 0; i < tupleLike.size; i++) {
                        if (tupleLike.get(i) !== undefined && this.tupleIsSubtypeOf(tupleLike.get(i), tuple))
                            tupleLike.set(i, undefined);
                    }

                    tupleLike.push(tuple);
                }
            }
        }).filter(e => e !== undefined).toList();

        return this.newInstance({arrayLike: arrayLike, tupleLike: tupleLike});
    }

    private tupleIsSubtypeOf(thisTuple: Map<IndexT, [Type, {}]>, otherTuple: Map<IndexT, [Type, {}]>) {
        return otherTuple.every(([type], key) => thisTuple.has(key) && thisTuple.get(key)[0].isSubtypeOf(type));
    }

    includeAll() {
        return this.newInstance(true);
    }

    excludeAll() {
        return this.newInstance({arrayLike: List<TypeExt>(), tupleLike: List<Map<IndexT, TypeExt>>()});
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
        for (let entry of this.allowedTypes.arrayLike.map(entry => this.definitionOfArrayLikeType(entry)).sort().toArray()) {
            definitions.push(entry);
        }

        for (let entry of this.allowedTypes.tupleLike.map(entry => this.definitionOfTupleLikeType(entry)).sort().toArray()) {
            definitions.push(entry);
        }

        return definitions;
    }

    /**
     * Valid transformations include:
     * 1) Changing any component of any tuple type.
     * 2) Combining two tuple types.
     */
    ascendingPaths([validator, params]: [Validator, RoundUpParameters]) {
        return List([
            this.recursiveTupleLikeAscendingPaths(validator, params),
            this.ascendingPathsForTupleCombine(),
            this.ascendingPathsForFieldRemove(validator)
        ]).flatMap(iterable => iterable);
    }

    /** Take the ascending paths for each tuple, and return this same type with the new tuple in the old one's place. */
    private recursiveTupleLikeAscendingPaths(validator: Validator, params: RoundUpParameters) {
        if (this.allowedTypes === true)
            return List<[this, boolean, string, {}[]]>();

        let allowedTypes = this.allowedTypes;
        return allowedTypes.tupleLike.keySeq()
            .flatMap(index => this.recursiveAscendingPathsForTuple(allowedTypes.tupleLike.get(index), validator, params)
                .map(([ascTuple, valid, ascRule, examples]) => <[this, boolean, string, {}[]]>[
                    this.newInstance({arrayLike: allowedTypes.arrayLike, tupleLike: allowedTypes.tupleLike.set(index, ascTuple)}),
                    valid,
                    `RECURSIVE-TUPLE(${ascRule})`,
                    examples]));
    }

    /** Take the ascending paths for each underlying type, and return this same tuple with the new type in the old type's place. */
    private recursiveAscendingPathsForTuple(tuple: Map<IndexT, TypeExt>, validator: Validator, params: RoundUpParameters) {
        return tuple.keySeq()
            .flatMap(key => {
                let [type, value] = tuple.get(key);
                return type.ascendingPaths([validator.forSubExpression(key), params])
                    .map(([ascType, valid, ascRule, examples]) => <[Map<IndexT, TypeExt>, boolean, string, {}[]]>[
                        tuple.set(key, [ascType, value]),
                        valid,
                        ascRule,
                        examples]);
            });
    }

    /** Can combine any two tuples */
    private ascendingPathsForTupleCombine() {
        if (this.allowedTypes === true)
            return List<[this, boolean, string, {}[]]>();

        let allowedTypes = this.allowedTypes;
        return uniqueIndexPairs(allowedTypes.tupleLike.size)
            .map(([i, j]) => allowedTypes.tupleLike.remove(i).remove(j - 1).push(this.combineTuples(allowedTypes.tupleLike.get(i), allowedTypes.tupleLike.get(j))))
            .map(tupleLike => <[this, boolean, string, {}[]]>[
                this.newInstance({arrayLike: allowedTypes.arrayLike, tupleLike: tupleLike}),
                true,
                "TUPLE-COMBINE",
                []]);
    }

    private combineTuples(tuple1: Map<IndexT, TypeExt>, tuple2: Map<IndexT, TypeExt>) {
        return tuple1.mergeWith(([type1, value1], [type2]) => [type1.includeType(type2), value1], tuple2);
    }

    private ascendingPathsForFieldRemove(validator: Validator) {
        if (this.allowedTypes === true || this.allowedTypes.tupleLike.size === 0)
            return List<[this, boolean, string, {}[]]>();

        let allowedTypes = this.allowedTypes;
        return this.allowedTypes.tupleLike.keySeq()
            .filter(index => !allowedTypes.tupleLike.get(index).isEmpty())
            .flatMap(index => {
                let tuple = allowedTypes.tupleLike.get(index);
                let validKeysToRemove = this.tupleLikeRemoveIsPrefixRestricted() ? List([tuple.keySeq().max()]) : tuple.keySeq();
                return validKeysToRemove.map(key => {
                    let [valid, examples] = validator.validate({singleValue: true, value: () => this.valueForTupleLikeType(tuple.remove(key))});
                    return <[this, boolean, string, {}[]]>[
                        this.newInstance({arrayLike: allowedTypes.arrayLike, tupleLike: allowedTypes.tupleLike.set(index, tuple.remove(key))}),
                        valid,
                        "TUPLE-FIELD-REMOVE",
                        examples
                    ];
                });
            });
    }
}

function uniqueIndexPairs(n: number) {
    return Range(0, n).flatMap(i => Range(i + 1, n).map(j => <[number, number]>[i, j]));
}