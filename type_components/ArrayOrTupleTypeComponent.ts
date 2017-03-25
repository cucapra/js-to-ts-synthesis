import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {Type} from "../Type";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, any[]> {
    typeFor(array: any[]) {
        let result = new Map<number, Type>();
        for (let i = 0; i < array.length; i++) {
            result.set(i, new Type("bottom").extend(array[i]));
        }

        return result;
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType(type: Type) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(types: Map<number, Type>) {
        let definition: string[] = [];
        for (let i = 0; i < types.size; i++) {
            definition.push(types.get(i).toDefinition());
        }
        return "[" + definition.join(", ") + "]";
    }

    emptyValue() {
        return [];
    }
}