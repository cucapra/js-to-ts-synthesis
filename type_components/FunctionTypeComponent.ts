import {BoundedValueTypeComponent} from "./BoundedValueTypeComponent";

// TODO: Implement better
export class FunctionTypeComponent extends BoundedValueTypeComponent<Function> {
    constructor() {
        super([(x: any) => x]);
    }

    getName() {
        return "((...args: any[]) => any)";
    }

    nameFor(f: Function) {
        return "((...args: any[]) => any)";
    }
}