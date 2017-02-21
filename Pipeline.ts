import * as yargs from 'yargs';

import {Workspace} from './Workspace';
import {ExecutionTracer} from './ExecutionTracer';
import {TypeDeducer} from './TypeDeducer';
import {SimpleTypeDeducer} from './SimpleTypeDeducer';

import "reflect-metadata";

export class Pipeline {
    repoUri : string;
    workingDir : string;
    typeDeducer : TypeDeducer = new SimpleTypeDeducer();

    run(){
        console.log("Starting");
        var workspace = new Workspace(this.workingDir, this.repoUri);
        var tracer = new ExecutionTracer(workspace);
        var types = this.typeDeducer.getAllTypeDefinitions(tracer.trace());
        workspace.exportTypeDefinitions(types);
    }
}

if (require.main === module) {
    var args = yargs
        .demandOption('repo', 'Url from which to clone the repo')
        .demandOption('dir', 'Working directory (must be empty)')
        .help()
        .argv;
    var pipeline = new Pipeline();
    pipeline.repoUri = args['repo'];
    pipeline.workingDir = args['dir'];
}
