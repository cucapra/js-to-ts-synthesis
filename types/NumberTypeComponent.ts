import {Set} from "immutable";
import {SetTypeComponent} from "./SetTypeComponent";

export class NumberTypeComponent extends SetTypeComponent<number> {

    static top = new NumberTypeComponent(true);
    static bottom = new NumberTypeComponent(Set<number>());

    newInstance(values: true | Set<number>) {
        return <this>new NumberTypeComponent(values);
    }

    getName() {
        return "number";
    }

    randomValue() {
        return Math.random();
    }
}