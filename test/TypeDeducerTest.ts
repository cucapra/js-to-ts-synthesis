import * as mocha from "mocha-typescript";
import {assert} from "chai";
import {SimpleTypeDeducer} from  "../SimpleTypeDeducer";
import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {toNumberSet, toStringSet} from "../Type";

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
                        {name: "x", type: {kind: "restricted", numberType: true}},
                        {name: "y", type: {kind: "restricted", stringType: true}},
                        {name: "z", type: {kind: "restricted", arrayOrTupleType: {kind: "array", type: {kind: "restricted", numberType: true}}}},
                        {name: "w", type: {kind: "restricted", objectType: true}}
                    ],
                    returnValueType: {kind: "restricted", undefinedType: true}
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
                        {name: "x", type: {kind: "restricted", numberType: toNumberSet(42)}},
                        {name: "y", type: {kind: "restricted", stringType: toStringSet("foo")}},
                        {name: "z", type: {kind: "restricted", arrayOrTupleType: {kind: "tuple", type: [
                            {kind: "restricted", numberType: toNumberSet(1)},
                            {kind: "restricted", numberType: toNumberSet(2)}
                        ]}}},
                        {name: "w", type: {kind: "restricted", objectType: {
                            foo: {kind: "restricted", stringType: toStringSet("bar")}
                        }}}
                    ],
                    returnValueType: {kind: "restricted", undefinedType: true}
                }
            ]
        });
    }
}
