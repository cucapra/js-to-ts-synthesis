import {List, Map} from "immutable";
import {IsOptional, RecursiveTypeComponent, TypeExt} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, {}[]> {

    static top = new ArrayOrTupleTypeComponent(true);
    static bottom = new ArrayOrTupleTypeComponent({arrayLike: List<TypeExt>(), tupleLike: List<Map<number, [TypeExt, IsOptional]>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<number, [TypeExt, IsOptional]>>}) {
        return <this>new ArrayOrTupleTypeComponent(allowedTypes);
    }

    typeFor(array: {}[]) {
        return Map<number, [TypeExt, IsOptional]>(array.map((value, index) => [index, [[Type.bottom.include(value), value], false]]));
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType([type]: TypeExt) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(tuple: Map<number, [TypeExt, IsOptional]>) {
        if (tuple.isEmpty())
            return "undefined[]"; // Can't have empty tuples in the type definition.
        else
            return "[" + tuple.keySeq().sort().map(key => {
                let [[type]] = tuple.get(key);
                return type.toDefinition();
            }).join(", ") + "]";
    }

    valueForArrayLikeType([, value]: TypeExt) {
        return [value];
    }

    valueForTupleLikeType(arrayType: Map<number, [TypeExt, IsOptional]>) {
        return arrayType.map(([[, value]]) => value).toArray();
    }

    tupleLikeRemoveIsPrefixRestricted() {
        return true;
    }

    removeField(type: Map<number, [TypeExt, IsOptional]>, index: number) {
        return type.remove(index);
    }

    emptyValue(): {}[] {
        return [];
    }
}