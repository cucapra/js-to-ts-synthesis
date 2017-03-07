import * as yargs from "yargs";

import {Workspace} from "./Workspace";
import {ExecutionTracer} from "./ExecutionTracer";
import {TypeDeducer} from "./TypeDeducer";
import {SimpleTypeDeducer} from "./SimpleTypeDeducer";
import {NullTypeDeducer} from "./NullTypeDeducer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";

const TYPE_DEDUCERS_BY_NAME: {[name: string]: () => TypeDeducer} = {
    "SimpleTypeDeducer": () => new SimpleTypeDeducer(),
    "NullTypeDeducer": () => new NullTypeDeducer(),
    "LowerBoundTypeDeducer": () => new LowerBoundTypeDeducer()
};

export class Pipeline {
    readonly repoUri: string;
    readonly workingDir: string;
    readonly es6Enabled: boolean;
    readonly testTimeoutWindow: number;
    readonly typeDeducer: TypeDeducer;

    constructor(repoUri: string, workingDir: string, es6Enabled: boolean, testTimeoutWindow: number, typeDeducer: string) {
        this.repoUri = repoUri;
        this.workingDir = workingDir;
        this.es6Enabled = es6Enabled;
        this.testTimeoutWindow = testTimeoutWindow;
        this.typeDeducer = TYPE_DEDUCERS_BY_NAME[typeDeducer]();
    }

    run() {
        console.log("Starting");
        let workspace = new Workspace(this.workingDir, this.repoUri, this.es6Enabled, this.testTimeoutWindow);
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
        .option("es6Enabled", {
            describe: "Whether the type deducer should run in ES6-enabled mode (babel will be loaded at runtime).",
            default: false
        })
        .option("testTimeoutWindow", {
            describe: "The maximum time (ms) for which the test suite is run. If the test suite timed out, types are still collected, but may be incomplete.",
            default: 60000
        })
        .option("typeDeducer", {
            describe: "The TypeDeducer implementation to use.",
            choices: Object.keys(TYPE_DEDUCERS_BY_NAME),
            default: "SimpleTypeDeducer"
        })
        .help()
        .argv;
    let pipeline = new Pipeline(args["repo"], args["dir"], args["es6Enabled"], args["testTimeoutWindow"], args["typeDeducer"]);
    pipeline.run();
}
