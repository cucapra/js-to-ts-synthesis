import {SetTypeComponent} from "./SetTypeComponent";
import * as randomstring from "randomstring";

export class StringTypeComponent extends SetTypeComponent<string> {
    getName() {
        return "string";
    }

    randomValue() {
        return randomstring.generate();
    }
}