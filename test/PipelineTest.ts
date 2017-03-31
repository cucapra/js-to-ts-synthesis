import * as assert from "assert";
import * as fs from "fs";
import * as mocha from "mocha-typescript";
import * as path from "path";
import * as tmp from "tmp";

import {LowerBoundTypeDeducer} from "../LowerBoundTypeDeducer";
import {NullTypeDeducer} from "../NullTypeDeducer";
import {Pipeline} from "../Pipeline";
import {SimpleTypeDeducer} from "../SimpleTypeDeducer";
import {UpperBoundTypeDeducer} from "../UpperBoundTypeDeducer";

const TEST_TIMEOUT_WINDOW = 60000;

const GIT_URL_PARSE_EXPECTED_LOWER = fs.readFileSync(path.join(__dirname, "/git-url-parse.expected.lower.d.ts"), "utf-8");
const GIT_URL_PARSE_EXPECTED_SIMPLE = fs.readFileSync(path.join(__dirname, "/git-url-parse.expected.simple.d.ts"), "utf-8");

@mocha.suite
class PipelineTest {
    static before() {
        tmp.setGracefulCleanup();
    }

    @mocha.test
    @mocha.timeout(300000)
    testBadTypeDeducer() {
        let workingDir = this.tempFolder();
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/git-url-parse", workingDir, TEST_TIMEOUT_WINDOW, new NullTypeDeducer(), {treatAllErrorsAsTypeErrors: true});

        assert.throws(() => {pipeline.run(); });
    }
    @mocha.test
    @mocha.timeout(300000)
    testLowerBoundTypeDeducer() {
        let workingDir = this.tempFolder();
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/git-url-parse", workingDir, TEST_TIMEOUT_WINDOW, new LowerBoundTypeDeducer(), {treatAllErrorsAsTypeErrors: true});
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(workingDir, "lib", "index.d.ts"), "utf-8"), GIT_URL_PARSE_EXPECTED_LOWER);
    }

    @mocha.test
    @mocha.timeout(300000)
    testUpperBoundTypeDeducer() {
        let workingDir = this.tempFolder();
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/git-url-parse", workingDir, TEST_TIMEOUT_WINDOW, new UpperBoundTypeDeducer(), {treatAllErrorsAsTypeErrors: true});
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(workingDir, "lib", "index.d.ts"), "utf-8"), "export declare function gitUrlParse(url: string): {};\n");
    }

    @mocha.test
    @mocha.timeout(300000)
    testSimpleTypeDeducer() {
        let workingDir = this.tempFolder();
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/git-url-parse", workingDir, TEST_TIMEOUT_WINDOW, new SimpleTypeDeducer(), {treatAllErrorsAsTypeErrors: true});
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(workingDir, "lib", "index.d.ts"), "utf-8"), GIT_URL_PARSE_EXPECTED_SIMPLE);
    }

    /*
    @mocha.test
    @mocha.timeout(300000)
    testModuleThatExportsAnObject() {
        let workingDir = this.tempFolder();
        let pipeline = new Pipeline("https://github.com/lelylan/simple-oauth2", workingDir, TEST_TIMEOUT_WINDOW, new SimpleTypeDeducer(), {treatAllErrorsAsTypeErrors: true});
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(workingDir, "lib", "index.d.ts"), "utf-8"), "export declare function gitUrlParse(url: string): {};\n");
    }*/

    private tempFolder(): string {
        return tmp.dirSync().name;
    }
}
