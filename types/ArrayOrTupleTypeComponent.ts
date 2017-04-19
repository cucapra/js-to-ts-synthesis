import {List, Map} from "immutable";
import {RecursiveTypeComponent, TypeExt} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, {}[]> {

    static top = new ArrayOrTupleTypeComponent(true);
    static bottom = new ArrayOrTupleTypeComponent({arrayLike: List<TypeExt>(), tupleLike: List<Map<number, TypeExt>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<number, TypeExt>>}) {
        return <this>new ArrayOrTupleTypeComponent(allowedTypes);
    }

    typeFor(array: {}[]) {
        return Map<number, TypeExt>(array.map((value, index) => [index, [Type.bottom.include(value), value]]));
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType([type]: TypeExt) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(type: Map<number, TypeExt>) {
        if (type.isEmpty())
            return "undefined[]"; // Can't have empty tuples in the type definition.
        else
            return "[" + type.keySeq().sort().map(key => type.get(key)[0].toDefinition()).join(", ") + "]";
    }

    valueForArrayLikeType([_, value]: TypeExt) {
        return [value];
    }

    valueForTupleLikeType(arrayType: Map<number, TypeExt>) {
        return arrayType.map(([_, value]) => value).toArray();
    }

    tupleLikeRemoveIsPrefixRestricted() {
        return true;
    }

    emptyValue(): {}[] {
        return [];
    }
}