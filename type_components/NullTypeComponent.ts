import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class NullTypeComponent extends BoundedValueTypeComponent<null> {
    constructor() {
        super([null]);
    }

    getName() {
        return "null";
    }

    nameFor(value: null) {
        return "null";
    }
}