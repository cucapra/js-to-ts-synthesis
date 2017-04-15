import {Map} from "immutable";
import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class UndefinedTypeComponent extends BoundedValueTypeComponent<undefined> {

    static top = new UndefinedTypeComponent(Map<undefined, boolean>([[undefined, true]]));
    static bottom = new UndefinedTypeComponent(Map<undefined, boolean>([[undefined, false]]));

    newInstance(allowedValues: Map<undefined, boolean>) {
        return <this>new UndefinedTypeComponent(allowedValues);
    }

    getName() {
        return "undefined";
    }

    nameFor(value: undefined) {
        return "undefined";
    }
}