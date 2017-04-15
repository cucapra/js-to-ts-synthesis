import {Set} from "immutable";
import * as randomstring from "randomstring";
import {SetTypeComponent} from "./SetTypeComponent";

export class StringTypeComponent extends SetTypeComponent<string> {

    static top = new StringTypeComponent(true);
    static bottom = new StringTypeComponent(Set<string>());

    newInstance(values: true | Set<string>) {
        return <this>new StringTypeComponent(values);
    }

    getName() {
        return "string";
    }

    randomValue() {
        return randomstring.generate();
    }
}