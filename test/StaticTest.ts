import * as assert from "assert";
import * as mocha from "mocha-typescript";
import * as esprima from "esprima";

import {typeofChecks} from "../instrumentation/Static";

@mocha.suite
class StaticTest {

    @mocha.test
    testTypeofChecks() {
        function f(name: any) {
            if (typeof name !== "string") {
                throw new TypeError("name must be a string");
            }
        };
        let ast = esprima.parse(f.toString()).body[0];

        if (ast.type !== "FunctionDeclaration")
            throw new Error(`Wrong type: ${ast.type} not FunctionDeclaration`);
        assert.deepEqual(typeofChecks(ast), {name: {"===": [], "!==": ["string"]}});
    }
}
