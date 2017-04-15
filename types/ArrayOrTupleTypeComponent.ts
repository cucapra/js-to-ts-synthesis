import {List, Map} from "immutable";
import {IndexForTupleLike, RecursiveTypeComponent, TupleType} from "./RecursiveTypeComponent";
import {Type} from "./Type";
import {pair} from "./TypeComponent";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, {}[]> {

    static top = new ArrayOrTupleTypeComponent(true);
    static bottom = new ArrayOrTupleTypeComponent({arrayLike: List<Type>(), tupleLike: Map<IndexForTupleLike<number>, List<TupleType>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, tupleLike: Map<IndexForTupleLike<number>, List<TupleType>>}) {
        return <this>new ArrayOrTupleTypeComponent(allowedTypes);
    }

    typeFor(array: {}[]) {
        return array.map((value, index) => pair(index, Type.bottom.include(value)));
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType(type: Type) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(indices: List<number>, types: List<Type>) {
        if (indices.size === 0)
            return "undefined[]"; // Can't have empty tuples in the type definition.
        else
            return "[" + indices.toArray().map(index => types.get(index).toDefinition()).join(", ") + "]";
    }

    emptyValue(): {}[] {
        return [];
    }
}