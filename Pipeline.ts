import * as yargs from "yargs";

import {Workspace} from "./Workspace";
import {ExecutionTracer} from "./ExecutionTracer";
import {TypeDeducer} from "./TypeDeducer";
import {SimpleTypeDeducer} from "./SimpleTypeDeducer";

export class Pipeline {
    repoUri: string;
    workingDir: string;
    es6Enabled: boolean;
    typeDeducer: TypeDeducer = new SimpleTypeDeducer();

    run() {
        console.log("Starting");
        let workspace = new Workspace(this.workingDir, this.repoUri, this.es6Enabled);
        let executions = new ExecutionTracer(workspace).trace();
        let types = this.typeDeducer.getAllTypeDefinitions(executions);
        workspace.exportTypeDefinitions(types, executions);
    }
}

if (require.main === module) {
    let args = yargs
        .demandOption("repo", "Url from which to clone the repo")
        .demandOption("dir", "Working directory (must be empty)")
        .help()
        .argv;
    let pipeline = new Pipeline();
    pipeline.repoUri = args["repo"];
    pipeline.workingDir = args["dir"];
}
