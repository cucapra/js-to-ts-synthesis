import {assert} from "chai";
import * as mocha from "mocha-typescript";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {FunctionInfo} from "../Module";
import {SimpleTypeDeducer} from "../SimpleTypeDeducer";
import {FunctionTypeDefinition} from "../TypeDeducer";
import {UpperBoundTypeDeducer} from "../UpperBoundTypeDeducer";
import {definitionFor} from "../Workspace";

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
            f: {
                file: "sample.js",
                functionInfo: new FunctionInfo("f", (x: any, y: any, z: any, w: any) => {
                }),
                calls: [
                    {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
                ]
            }
        };

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: 42, y: \"foo\", z: [1, 2], w: {foo: \"bar\"}): undefined;\n"]
        });
    }

    @mocha.test
    testUpperBoundTypeDeducer() {
        let typeDeducer = new UpperBoundTypeDeducer();
        let calls = {
            f: {
                file: "sample.js",
                functionInfo: new FunctionInfo("f", (x: any, y: any) => {
                    if (typeof x !== "string")
                        throw TypeError();
                    if (typeof y === "string")
                        throw TypeError();
                }),
                calls: [
                    {args: ["foo", 42], returnValue: undefined}
                ]
            }
        };

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: string, y: null|undefined|boolean|number|((...args: any[]) => any)|{}[]|object): {};\n"]
        });
    }


    @mocha.test
    testSimpleTypeDeducer() {
        let typeDeducer = new SimpleTypeDeducer();
        let calls = {
            f: {
                file: "sample.js",
                functionInfo: new FunctionInfo("f", (x: any, y: any, z: any, w: any) => {
                    if ((typeof x !== "number")
                        || (typeof y !== "string")
                        || !Array.isArray(z)
                        || (typeof z[0] !== "number")
                        || (typeof z[1] !== "number")
                        || (typeof w !== "object")
                        || (typeof w.foo !== "string"))

                        throw TypeError("Bad argument");
                }),
                calls: [
                    {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
                ]
            }
        };

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: number, y: string, z: [number, number], w: {foo: string}): undefined;\n"]
        });
    }
}
