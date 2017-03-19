import * as mocha from "mocha-typescript";
import {assert} from "chai";
import {SimpleTypeDeducer} from  "../SimpleTypeDeducer";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {UpperBoundTypeDeducer} from "../UpperBoundTypeDeducer";
import {toNumberSet, toStringSet, Type} from "../Type";
import {ArgDef} from "../ExecutionTracer";

let assign = require("object.assign");

// Makes tests shorter.
function t(d: {}, from: "top"|"bottom" = "bottom"): Type {
    return assign(new Type(from), d);
}

function a(a: string, eqType: string[] = [], neqType: string[] = []): ArgDef {
    return {name: a, typeofChecks: {"===": eqType, "!==": neqType}};
}

@mocha.suite
class TypeDeducerTest {

    @mocha.test
    testSimpleTypeDeducer() {
        let typeDeducer = new SimpleTypeDeducer();
        let calls = {
            f: {file: "sample.js", argDefs: [a("x"), a("y"), a("z"), a("w")], calls: [
                {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
            ]}
        };

        assert.deepEqual(typeDeducer.getAllTypeDefinitions(calls), {
            "sample.js": [
                {
                    name: "f",
                    argTypes: [
                        {name: "x", type: t({numberType: true})},
                        {name: "y", type: t({stringType: true})},
                        {name: "z", type: t({arrayOrTupleType: {kind: "array", type: t({numberType: true})}})},
                        {name: "w", type: t({objectType: {}})}
                    ],
                    returnValueType: t({undefinedType: true})
                }
            ]
        });
    }

    @mocha.test
    testLowerBoundTypeDeducer() {
        let typeDeducer = new LowerBoundTypeDeducer();
        let calls = {
            f: {file: "sample.js", argDefs: [a("x"), a("y"), a("z"), a("w")], calls: [
                {args: [42, "foo", [1, 2], {foo: "bar"}], returnValue: undefined}
            ]}
        };

        assert.deepEqual(typeDeducer.getAllTypeDefinitions(calls), {
            "sample.js": [
                {
                    name: "f",
                    argTypes: [
                        {name: "x", type: t({numberType: toNumberSet(42)})},
                        {name: "y", type: t({stringType: toStringSet("foo")})},
                        {name: "z", type: t({arrayOrTupleType: {kind: "tuple", type: [
                            t({numberType: toNumberSet(1)}),
                            t({numberType: toNumberSet(2)})
                        ]}})},
                        {name: "w", type: t({objectType: {
                            foo: t({stringType: toStringSet("bar")})
                        }})}
                    ],
                    returnValueType: t({undefinedType: true})
                }
            ]
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

        assert.deepEqual(typeDeducer.getAllTypeDefinitions(calls), {
            "sample.js": [
                {
                    name: "f",
                    argTypes: [
                        {name: "x", type: t({stringType: true})},
                        {name: "y", type: t({stringType: {}}, "top")}
                    ],
                    returnValueType: t({}, "top")
                }
            ]
        });
    }
}
