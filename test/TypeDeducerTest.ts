import * as mocha from "mocha-typescript";
import {assert} from "chai";
import {FunctionTypeDefinition} from "../TypeDeducer";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {UpperBoundTypeDeducer} from "../UpperBoundTypeDeducer";
import {definitionFor} from "../Workspace";
import {ArgDef} from "../ExecutionTracer";

function a(a: string, eqType: string[] = [], neqType: string[] = []): ArgDef {
    return {name: a, typeofChecks: {"===": eqType, "!==": neqType}};
}

function toDefinitions(d: { [sourceFile: string]: FunctionTypeDefinition[] }): { [sourceFile: string]: string[] } {
    let definitions: { [sourceFile: string]: string[] } = {};
    for (let sourceFile in d) {
        definitions[sourceFile] = d[sourceFile].map(definitionFor);
    }
    return definitions;
}

@mocha.suite
class TypeDeducerTest {

    @mocha.test
    testLowerBoundTypeDeducer() {
        let typeDeducer = new LowerBoundTypeDeducer();
        let calls = {
            f: {file: "sample.js", argDefs: [a("x"), a("y"), a("z"), a("w")], calls: [
                {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
            ]}
        };

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: 42, y: \"foo\", z: [1, 2], w: {foo: \"bar\"}): undefined;\n"]
        });
    }

    @mocha.test
    testUpperBoundTypeDeducer() {
        let typeDeducer = new UpperBoundTypeDeducer();
        let calls = {
            f: {file: "sample.js", argDefs: [a("x", ["string"]), a("y", [], ["string"])], calls: [
                {args: ["foo", 42], returnValue: undefined}
            ]}
        };

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: string, y: null|undefined|boolean|number|((...args: any[]) => any)|{}[]|object): {};\n"]
        });
    }
}
