import {assert} from "chai";
import {Map} from "immutable";
import * as mocha from "mocha-typescript";
import {FunctionCalls} from "../ExecutionTracer";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {FunctionInfo, FunctionsMap} from "../Module";
import {SimpleTypeDeducer} from "../SimpleTypeDeducer";
import {FunctionTypeDefinition} from "../TypeDeducer";
import {UpperBoundTypeDeducer} from "../UpperBoundTypeDeducer";
import {parameters} from "./test_output";

// Return an object rather than a map, for easier assertEquals
function toDefinitions(d: FunctionsMap<FunctionTypeDefinition>): {[sourceFile: string]: string[]} {
    let result: {[sourceFile: string]: string[]} = {};

    for (let sourceFile of d.keySeq().toArray()) {
        result[sourceFile] = d.get(sourceFile).map(definition => definition.definitionFor()).toArray();
    }
    return result;
}

@mocha.suite
class TypeDeducerTest {

    /**
     * LowerBoundTypeDeducer should return a concatenation of exactly the test cases it is provided.
     */
    @mocha.test
    testLowerBoundTypeDeducer() {
        let typeDeducer = new LowerBoundTypeDeducer(parameters("testLowerBoundTypeDeducer"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (x: {}, y: {}, z: {}, w: {}) => {
                                void "id=1";
                            }),
                            calls: [
                                {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: 42, y: \"foo\", z: [1, 2], w: {foo: \"bar\"}): undefined;\n"]
        });
    }

    /**
     * UpperBoundTypeDeducer should ignore the test cases and just look for typeof checks at the beginning of the function implementation.
     * TODO: Consider if we really need this.
     */
    @mocha.test
    testUpperBoundTypeDeducer() {
        let typeDeducer = new UpperBoundTypeDeducer(parameters("testUpperBoundTypeDeducer"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (x: {}, y: {}) => {
                                void "id=1";
                                if (typeof x !== "string") throw TypeError();
                                if (typeof y === "string") throw TypeError();
                            }),
                            calls: [
                                {args: ["foo", 42], returnValue: undefined}
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: string, y: null|undefined|boolean|number|((...args: any[]) => any)|{}[]|object): {};\n"]
        });
    }

    /**
     * A SimpleTypeDeducer should try to "round up" each argument by trying additional values.
     */
    @mocha.test
    testSimpleTypeDeducer() {
        let typeDeducer = new SimpleTypeDeducer(parameters("testSimpleTypeDeducer"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (x: {}, y: {}, z: {}, w: {}) => {
                                void "id=1";

                                function hasFoo(w: {}): w is {foo: {}} {
                                    return "foo" in w;
                                }
                                if ((typeof x !== "number")
                                    || (typeof y !== "string")
                                    || !Array.isArray(z)
                                    || (typeof z[0] !== "number")
                                    || (typeof z[1] !== "number")
                                    || (typeof w !== "object")
                                    || (!hasFoo(w) || typeof w.foo !== "string"))
                                    throw TypeError("Bad argument");
                            }),
                            calls: [
                                {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: number, y: string, z: [number, number], w: {foo: string}): undefined;\n"]
        });
    }

    /**
     * Unify tuples with matching indexes when possible.
     *
     * Here, the two types ["a"] and ["b"] cannot be independently rounded up, because [string] is not allowed.
     * In this case, round up each one with knowledge of the other. This takes place in two steps.
     *
     * 1) Get the union of the two types: "a"|"b".
     * 2) See if "a" and "b" can be rounded up to "a"|"b".
     */
    @mocha.test
    testSimpleTypeDeducerRecursiveLiteralsCombine() {
        let typeDeducer = new SimpleTypeDeducer(parameters("testSimpleTypeDeducerRecursiveLiteralsCombine"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (x: {}) => {
                                void "id=1";
                                if (!Array.isArray(x) || (x[0] !== "a" && x[0] !== "b"))
                                    throw TypeError("Bad argument");
                            }),
                            calls: [
                                {args: [["a"]], returnValue: undefined},
                                {args: [["b"]], returnValue: undefined}
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: [\"a\"|\"b\"]): undefined;\n"]
        });
    }

    @mocha.test
    testSimpleTypeDeducerMultipleSteps() {
        let typeDeducer = new SimpleTypeDeducer(parameters("testSimpleTypeDeducerMultipleSteps"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (obj: {}) => {
                                void "id=1";
                                function hasX(obj: {}): obj is {x: {}} { return "x" in obj; }
                                if (!(hasX(obj)))
                                    throw TypeError();
                            }),
                            calls: [
                                {args: [{x: 0, y: 1}], returnValue: undefined},
                                {args: [{x: 0, z: 1}], returnValue: undefined},
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(obj: {x: number, y?: number, z?: number}): undefined;\n"]
        });
    }

    /**
     * NOT YET WORKING
     *
     * In general, the SimpleTypeDeducer cannot look at elements independently, as this will try to unify types incorrectly.
     * In this example, at least element in the tuple type must be "a".
     *
     * Rounding up the "a" at index 0 to string will succeed.
     * Rounding up the "a" at index 1 to string will succeed.
     *
     * However, this cannot be rounded up to [string, string] because it is impossible to round up both index 0 and index 1, together, to string.
     */
    @mocha.test
    @mocha.skip
    testSimpleTypeDeducerRecursiveDependentLiteralsCombine() {
        let typeDeducer = new SimpleTypeDeducer(parameters("testSimpleTypeDeducerRecursiveDependentLiteralsCombine"));
        let calls = Map<string, Map<number, FunctionCalls>>([
            [
                "sample.js",
                Map<number, FunctionCalls>([
                    [
                        1,
                        {
                            file: "sample.js",
                            info: new FunctionInfo("f", (x: {}) => {
                                void "id=1";
                                if (!Array.isArray(x) || (x[0] !== "a" && x[1] !== "a"))
                                    throw TypeError("Bad argument");
                            }),
                            calls: [
                                {args: [["a", "a"]], returnValue: undefined}
                            ]
                        }
                    ]
                ])
            ]
        ]);

        assert.deepEqual(toDefinitions(typeDeducer.getAllTypeDefinitions(calls)), {
            "sample.js": ["export declare function f(x: [\"a\", \"a\"]): undefined;\n"]
        });
    }
}
