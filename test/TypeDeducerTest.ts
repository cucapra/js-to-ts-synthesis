import * as mocha from "mocha-typescript";
import {assert} from "chai";
import {SimpleTypeDeducer} from  "../SimpleTypeDeducer";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {toNumberSet, toStringSet, Type, bottom} from "../Type";

let assign = require("object.assign");

// Makes tests shorter.
function t(d: {}): Type {
    return assign(bottom(), d);
}

@mocha.suite
class TypeDeducerTest {

    @mocha.test
    testSimpleTypeDeducer() {
        let typeDeducer = new SimpleTypeDeducer();
        let calls = {
            f: {file: "sample.js", argNames: ["x", "y", "z", "w"], calls: [
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
                        {name: "w", type: "top"}
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
            f: {file: "sample.js", argNames: ["x", "y", "z", "w"], calls: [
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
}
