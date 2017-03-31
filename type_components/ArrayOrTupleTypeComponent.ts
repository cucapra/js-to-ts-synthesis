import {List} from "immutable";
import {Type} from "../Type";
import {RecursiveTypeComponent} from "./RecursiveTypeComponent";
import {pair} from "./TypeComponent";

export class ArrayOrTupleTypeComponent extends RecursiveTypeComponent<number, any[]> {
    typeFor(array: any[]) {
        return array.map((value, index) => pair(index, new Type("bottom").extend(value)));
    }

    definitionOfTopType() {
        return "{}[]";
    }

    definitionOfArrayLikeType(type: Type) {
        return type.toDefinition() + "[]";
    }

    definitionOfTupleLikeType(indices: List<number>, types: List<Type>) {
        if (indices.size === 0)
            return "undefined[]"; // Can't have empty tuples in the type definition.
        else
            return "[" + indices.toArray().map(index => types.get(index).toDefinition()).join(", ") + "]";
    }

    emptyValue() {
        return [];
    }
}