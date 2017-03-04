import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as mocha from "mocha-typescript";
import * as tmp from "tmp";

import {Pipeline} from "../Pipeline";
import {NullTypeDeducer} from  "../NullTypeDeducer";

@mocha.suite
class PipelineTest {
    static before() {
        tmp.setGracefulCleanup();
    }

    @mocha.test
    @mocha.timeout(300000)
    testSimpleModule() {
        let pipeline  = new Pipeline();
        pipeline.repoUri = "https://github.com/IonicaBizau/abs";
        pipeline.workingDir = this.tempFolder();
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(pipeline.workingDir, "lib", "index.d.ts"), "utf-8"), "export declare function abs(input: string): string;\n");
    }

    @mocha.test
    @mocha.timeout(300000)
    testBadTypeDeducer() {
        let pipeline  = new Pipeline();
        pipeline.repoUri = "https://github.com/IonicaBizau/abs";
        pipeline.workingDir = this.tempFolder();
        pipeline.typeDeducer = new NullTypeDeducer();

        assert.throws(() => {pipeline.run(); });
    }

    @mocha.test
    @mocha.timeout(300000)
    testModuleThatExportsAnObject() {
        let pipeline = new Pipeline();
        pipeline.repoUri = "https://github.com/lelylan/simple-oauth2";
        pipeline.workingDir = this.tempFolder();
        pipeline.es6Enabled = true;
        pipeline.run();
    }

    private tempFolder(): string {
        return tmp.dirSync().name;
    }
}
