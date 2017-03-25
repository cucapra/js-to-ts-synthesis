import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {Type} from "../Type";

export class ObjectTypeComponent extends RecursiveTypeComponent<string, {[k: string]: any}> {
    typeFor(obj: {[k: string]: any}) {
        let result = new Map<string, Type>();

        for (let k in obj) {
            result.set(k, new Type("bottom").extend(obj[k]));
        }
        return result;
    }

    definitionOfTopType() {
        return "object";
    }

    definitionOfArrayLikeType(type: Type) {
        return `{[key: string]: ${type.toDefinition()}}`;
    }

    definitionOfTupleLikeType(types: Map<string, Type>) {
        return (types.size > 0) ? "{" + Array.from(types.entries()).map(entry => `${entry[0]}: ${entry[1].toDefinition()}`).join(", ") + "}" : "object";
    }

    emptyValue() {
        return {};
    }
}