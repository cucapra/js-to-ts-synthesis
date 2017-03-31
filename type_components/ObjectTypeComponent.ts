import {List} from "immutable";
import {Type} from "../Type";
import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {pair} from "./TypeComponent";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: any}> {
    typeFor(obj: {[k: string]: any}) {
        return Object.keys(obj).sort().map(key => pair(key, new Type("bottom").extend(obj[key])));
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