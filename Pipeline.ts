import * as yargs from 'yargs';

import {Workspace} from './Workspace';
import {ExecutionTracer} from './ExecutionTracer';
import {TypeDeducer} from './TypeDeducer';
import {SimpleTypeDeducer} from './SimpleTypeDeducer';

export class Pipeline {
    repoUri : string;
    workingDir : string;
    es6Enabled : boolean;
    typeDeducer : TypeDeducer = new SimpleTypeDeducer();

    run(){
        console.log("Starting");
        var workspace = new Workspace(this.workingDir, this.repoUri, this.es6Enabled);
        var executions = new ExecutionTracer(workspace).trace();
        var types = this.typeDeducer.getAllTypeDefinitions(executions);
        workspace.exportTypeDefinitions(types, executions);
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
