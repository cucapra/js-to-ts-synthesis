import {assert} from "chai";
import * as mocha from "mocha-typescript";
import * as vm from "vm";

import {FunctionTagger} from "../FunctionTagger";
import {tagFor} from "../instrumentation/tag";

@mocha.suite
class TagFunctionsTest {

    @mocha.test
    testTagFunctions() {
        for (let source of ["function f() {};", "f = function(){};", "obj = {f: function(){}}; f = obj.f;"]) {
            let tagged = new FunctionTagger().tagFunctions(source, "");
            assert.include(tagged, "void 'id=0'");
            assert.strictEqual(tagFor(asFunction("f", tagged)), 0);
        }
    }
}

function asFunction(name: string, source: string): Function {
    let sandbox = vm.createContext();
    vm.runInContext(source, sandbox);
    return (<{[name: string]: Function}>sandbox)[name];
}
