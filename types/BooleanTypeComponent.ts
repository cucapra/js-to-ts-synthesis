import {Map} from "immutable";
import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class BooleanTypeComponent extends BoundedValueTypeComponent<boolean> {

    static top = new BooleanTypeComponent(Map<boolean, boolean>([[true, true], [false, true]]));
    static bottom = new BooleanTypeComponent(Map<boolean, boolean>([[true, false], [false, false]]));

    newInstance(allowedValues: Map<boolean, boolean>) {
        return <this>new BooleanTypeComponent(allowedValues);
    }

    getName() {
        return "boolean";
    }

    nameFor(value: boolean) {
        return value ? "true" : "false";
    }
}