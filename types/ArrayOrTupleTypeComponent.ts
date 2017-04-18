import {List, Map} from "immutable";
import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, {}[]> {

    static top = new ArrayOrTupleTypeComponent(true);
    static bottom = new ArrayOrTupleTypeComponent({arrayLike: List<Type>(), tupleLike: List<Map<number, Type>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, readonly tupleLike: List<Map<number, Type>>}) {
        return <this>new ArrayOrTupleTypeComponent(allowedTypes);
    }

    typeFor(array: {}[]) {
        return Map<number, Type>(array.map((value, index) => [index, Type.bottom.include(value)]));
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType(type: Type) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(type: Map<number, Type>) {
        if (type.isEmpty())
            return "undefined[]"; // Can't have empty tuples in the type definition.
        else
            return "[" + type.keySeq().sort().map(key => type.get(key).toDefinition()).join(", ") + "]";
    }

    emptyValue(): {}[] {
        return [];
    }
}