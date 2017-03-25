import {SetTypeComponent} from "./SetTypeComponent";

export class NumberTypeComponent extends SetTypeComponent<number> {
    getName() {
        return "number";
    }

    randomValue() {
        return Math.random();
    }
}