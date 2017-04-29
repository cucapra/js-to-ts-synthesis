import {List, Map} from "immutable";
import {IsOptional, RecursiveTypeComponent, TypeExt} from "./RecursiveTypeComponent";
import {Type} from "./Type";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: {}}> {

    static top = new ObjectTypeComponent(true);
    static bottom = new ObjectTypeComponent({arrayLike: List<TypeExt>(), tupleLike: List<Map<string, [TypeExt, IsOptional]>>()});

    newInstance(allowedTypes: true | { readonly arrayLike: List<TypeExt>, readonly tupleLike: List<Map<string, [TypeExt, IsOptional]>>}) {
        return <this>new ObjectTypeComponent(allowedTypes);
    }

    typeFor(obj: {[k: string]: {}}) {
        return Map<string, [TypeExt, IsOptional]>(Object.keys(obj).sort().map(key => [key, [[Type.bottom.include(obj[key]), obj[key]], false]]));
    }

    definitionOfTopType() {
        return "object";
    }

    definitionOfArrayLikeType([type]: TypeExt) {
        return `{[key: string]: ${type.toDefinition()}}`;
    }

    definitionOfTupleLikeType(tuple: Map<string, [TypeExt, IsOptional]>) {
        if (tuple.isEmpty())
            return "object";
        return "{" + tuple.keySeq().sort().map(key => {
            let [[type], optional] = tuple.get(key);
            return optional ? `${key}?: ${type.toDefinition()}` : `${key}: ${type.toDefinition()}`;
        }).join(", ") + "}";
    }

    valueForArrayLikeType([, value]: TypeExt) {
        return {"k": value};
    }

    valueForTupleLikeType(type: Map<string, [TypeExt, IsOptional]>) {
        let result: {[k: string]: {}} = {};
        for (let key of type.keySeq().toArray()) {
            let [[, value]] = type.get(key);
            result[key] = value;
        }
        return result;
    }

    emptyValue() {
        return {};
    }

    tupleLikeRemoveIsPrefixRestricted() {
        return false;
    }

    removeField(type: Map<string, [TypeExt, IsOptional]>, index: string) {
        return type.update(index, ([t]) => [t, true]);
    }
}