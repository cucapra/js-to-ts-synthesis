import {assert} from "chai";
import * as mocha from "mocha-typescript";

import {argDefs} from "../instrumentation/Static";

@mocha.suite
class StaticTest {

    @mocha.test
    testTypeofChecks() {
        function f(name: any) {
            if (typeof name !== "string") {
                throw new TypeError("name must be a string");
            }
        };
        assert.deepEqual(argDefs(f), [{name: "name", typeofChecks: {"===": ["string"], "!==": []}}]);
    }
}
