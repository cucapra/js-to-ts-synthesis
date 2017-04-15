import {Map} from "immutable";
import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

export class NullTypeComponent extends BoundedValueTypeComponent<null> {

    static top = new NullTypeComponent(Map<null, boolean>([[null, true]]));
    static bottom = new NullTypeComponent(Map<null, boolean>([[null, false]]));

    newInstance(allowedValues: Map<null, boolean>) {
        return <this>new NullTypeComponent(allowedValues);
    }

    getName() {
        return "null";
    }

    nameFor(value: null) {
        return "null";
    }
}