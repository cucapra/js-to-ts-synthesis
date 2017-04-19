import {List, Map} from "immutable";
import {RecursiveTypeComponent, TypeExt} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: {}}> {

    static top = new ObjectTypeComponent(true);
    static bottom = new ObjectTypeComponent({arrayLike: List<TypeExt>(), tupleLike: List<Map<string, TypeExt>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<string, TypeExt>>}) {
        return <this>new ObjectTypeComponent(allowedTypes);
    }

    typeFor(obj: {[k: string]: {}}) {
        return Map<string, TypeExt>(Object.keys(obj).sort().map(key => [key, [Type.bottom.include(obj[key]), obj[key]]]));
    }

    definitionOfTopType() {
        return "object";
    }

    definitionOfArrayLikeType([type]: TypeExt) {
        return `{[key: string]: ${type.toDefinition()}}`;
    }

    definitionOfTupleLikeType(type: Map<string, TypeExt>) {
        if (type.isEmpty())
            return "object";
        return "{" + type.keySeq().sort().map(key => `${key}: ${type.get(key)[0].toDefinition()}`).join(", ") + "}";
    }

    valueForArrayLikeType([_, value]: TypeExt) {
        return {"k": value};
    }

    valueForTupleLikeType(type: Map<string, TypeExt>) {
        let result: {[k: string]: {}} = {};
        for (let key of type.keySeq().toArray()) {
            result[key] = type.get(key)[1];
        }
        return result;
    }

    emptyValue() {
        return {};
    }

    tupleLikeRemoveIsPrefixRestricted() {
        return false;
    }
}