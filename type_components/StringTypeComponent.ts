import * as randomstring from "randomstring";
import {SetTypeComponent} from "./SetTypeComponent";

export class StringTypeComponent extends SetTypeComponent<string> {
    getName() {
        return "string";
    }

    randomValue() {
        return randomstring.generate();
    }
}