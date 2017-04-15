import {Map} from "immutable";
import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

const ID = (x: any) => x;

// TODO: Implement better
export class FunctionTypeComponent extends BoundedValueTypeComponent<Function> {

    static top = new FunctionTypeComponent(Map<Function, boolean>([[ID, true]]));
    static bottom = new FunctionTypeComponent(Map<Function, boolean>([[ID, false]]));

    newInstance(allowedValues: Map<Function, boolean>) {
        return <this>new FunctionTypeComponent(allowedValues);
    }

    getName() {
        return "((...args: any[]) => any)";
    }

    nameFor(f: Function) {
        return "((...args: any[]) => any)";
    }
}