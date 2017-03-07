import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as mocha from "mocha-typescript";
import * as tmp from "tmp";

import {Pipeline} from "../Pipeline";

const TEST_TIMEOUT_WINDOW = 60000;

@mocha.suite
class PipelineTest {
    static before() {
        tmp.setGracefulCleanup();
    }

    @mocha.test
    @mocha.timeout(300000)
    testSimpleModule() {
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/abs", this.tempFolder(), false, TEST_TIMEOUT_WINDOW, "SimpleTypeDeducer");
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(pipeline.workingDir, "lib", "index.d.ts"), "utf-8"), "export declare function abs(input: string): string;\n");
    }

    @mocha.test
    @mocha.timeout(300000)
    testBadTypeDeducer() {
        let pipeline  = new Pipeline("https://github.com/IonicaBizau/abs", this.tempFolder(), false, TEST_TIMEOUT_WINDOW, "NullTypeDeducer");

        assert.throws(() => {pipeline.run(); });
    }

    @mocha.test
    @mocha.timeout(300000)
    testModuleThatExportsAnObject() {
        let pipeline = new Pipeline("https://github.com/lelylan/simple-oauth2", this.tempFolder(), true, TEST_TIMEOUT_WINDOW, "SimpleTypeDeducer");
        pipeline.run();
    }

    private tempFolder(): string {
        return tmp.dirSync().name;
    }
}
