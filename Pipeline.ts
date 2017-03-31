import * as yargs from "yargs";

import {ExecutionTracer} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {ModuleParameters} from "./Module";
import {NullTypeDeducer} from "./NullTypeDeducer";
import {SimpleTypeDeducer} from "./SimpleTypeDeducer";
import {TypeDeducer} from "./TypeDeducer";
import {UpperBoundTypeDeducer} from "./UpperBoundTypeDeducer";
import {Workspace} from "./Workspace";

interface Function {
    name: string;
}

const TYPE_DEDUCERS = [
    SimpleTypeDeducer,
    NullTypeDeducer,
    LowerBoundTypeDeducer,
    UpperBoundTypeDeducer
];

export class Pipeline {

    constructor(
        private repoUri: string,
        private workingDir: string,
        private testTimeoutWindow: number,
        private typeDeducer: TypeDeducer,
        private moduleParameters: ModuleParameters) {
    }

    run() {
        console.log("Starting");
        let workspace = new Workspace(this.workingDir, this.repoUri, this.testTimeoutWindow, this.moduleParameters);
        let executions = new ExecutionTracer(workspace).trace();
        let types = this.typeDeducer.getAllTypeDefinitions(executions);
        workspace.exportTypeDefinitions(types, executions);
    }
}

export function main() {
    let args = yargs
        .option("repo", {
            describe: "Url from which to clone the repo.",
            demandOption: true
        })
        .option("dir", {
            describe: "Working directory (must be empty).",
            demandOption: true
        })
        .option("testTimeoutWindow", {
            describe: "The maximum time (ms) for which the test suite is run. If the test suite timed out, types are still collected, but may be incomplete.",
            default: 60000
        })
        .option("treatAllErrorsAsTypeErrors", {
            describe: "The Validator expects the library to throw a TypeError when a library encountered an argument of the wrong type. When this flag is set, any error is considered one caused by a bad argument",
            default: false
        })
        .option("typeDeducer", {
            describe: "The TypeDeducer implementation to use.",
            choices: TYPE_DEDUCERS.map(t => (<any>t).name),
            default: "SimpleTypeDeducer"
        })
        .help()
        .argv;
    let pipeline = new Pipeline(args["repo"], args["dir"], args["testTimeoutWindow"], args["typeDeducer"], {treatAllErrorsAsTypeErrors: args["treatAllErrorsAsTypeErrors"]});
    pipeline.run();
}
