import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class BooleanTypeComponent extends BoundedValueTypeComponent<boolean> {
    constructor() {
        super([true, false]);
    }

    getName() {
        return "boolean";
    }

    nameFor(value: boolean) {
        return value ? "true" : "false";
    }
}