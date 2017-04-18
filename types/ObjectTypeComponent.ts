import {List, Map} from "immutable";
import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: {}}> {

    static top = new ObjectTypeComponent(true);
    static bottom = new ObjectTypeComponent({arrayLike: List<Type>(), tupleLike: List<Map<string, Type>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<Type>, readonly tupleLike: List<Map<string, Type>>}) {
        return <this>new ObjectTypeComponent(allowedTypes);
    }

    typeFor(obj: {[k: string]: {}}) {
        return Map<string, Type>(Object.keys(obj).sort().map(key => [key, Type.bottom.include(obj[key])]));
    }

    definitionOfTopType() {
        return "object";
    }

    definitionOfArrayLikeType(type: Type) {
        return `{[key: string]: ${type.toDefinition()}}`;
    }

    definitionOfTupleLikeType(type: Map<string, Type>) {
        if (type.isEmpty())
            return "object";
        return "{" + type.keySeq().sort().map(key => `${key}: ${type.get(key).toDefinition()}`).join(", ") + "}";
    }

    emptyValue() {
        return {};
    }
}