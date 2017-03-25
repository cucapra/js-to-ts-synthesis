import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class UndefinedTypeComponent extends BoundedValueTypeComponent<undefined> {
    constructor() {
        super([undefined]);
    }

    getName() {
        return "undefined";
    }

    nameFor(value: undefined) {
        return "undefined";
    }
}