import {assert} from "chai";
import * as mocha from "mocha-typescript";
import * as vm from "vm";

import {tagFor} from "../instrumentation/tag";
import {tagFunctions} from "../TagFunctions";

@mocha.suite
class TagFunctionsTest {

    @mocha.test
    @mocha.timeout(300000)
    testTagFunctions() {
        for (let source of ["function f() {};", "f = function(){};", "obj = {f: function(){}}; f = obj.f;"]) {
            let tagged = tagFunctions(source);
            assert.include(tagged, "void 'id=1'");
            assert.strictEqual(tagFor(asFunction("f", tagged)), 1);
        }
    }
}

function asFunction(name: string, source: string): Function {
    let sandbox = vm.createContext();
    vm.runInContext(source, sandbox);
    return (<{[name: string]: Function}>sandbox)[name];
}
