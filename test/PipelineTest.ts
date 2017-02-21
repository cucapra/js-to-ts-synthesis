import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as mocha from 'mocha-typescript';
import * as tmp from 'tmp';

import {Pipeline} from '../Pipeline'

import "reflect-metadata";


@mocha.suite
class PipelineTest {
    static before(){
        tmp.setGracefulCleanup();
    }

    @mocha.test
    testSimpleModule(){
        var pipeline  = new Pipeline()
        pipeline.repoUri = "https://github.com/IonicaBizau/abs";
        pipeline.workingDir = this.tempFolder();
        pipeline.run();

        assert.equal(fs.readFileSync(path.join(pipeline.workingDir, 'lib', 'index.d.ts'), 'utf-8'), "declare function abs(arg0: string): string;");
    }

    private tempFolder(): string {
        return tmp.dirSync().name;
    }

}
