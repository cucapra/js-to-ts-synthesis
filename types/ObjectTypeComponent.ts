import {List, Map} from "immutable";
import {IndexForTupleLike, RecursiveTypeComponent, TupleType} from "./RecursiveTypeComponent";
import {Type} from "./Type";
import {pair} from "./TypeComponent";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: {}}> {

    static top = new ObjectTypeComponent(true);
    static bottom = new ObjectTypeComponent({arrayLike: List<Type>(), tupleLike: Map<IndexForTupleLike<string>, List<TupleType>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, tupleLike: Map<IndexForTupleLike<string>, List<TupleType>>}) {
        return <this>new ObjectTypeComponent(allowedTypes);
    }

    typeFor(obj: {[k: string]: {}}) {
        return Object.keys(obj).sort().map(key => pair(key, Type.bottom.include(obj[key])));
    }

    definitionOfTopType() {
        return "object";
    }

    definitionOfArrayLikeType(type: Type) {
        return `{[key: string]: ${type.toDefinition()}}`;
    }

    definitionOfTupleLikeType(indices: List<string>, types: List<Type>) {
        return (indices.size > 0) ? "{" + indices.toArray().map((key, index) => `${key}: ${types.get(index).toDefinition()}`).join(", ") + "}" : "object";
    }

    emptyValue() {
        return {};
    }
}