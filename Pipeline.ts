import * as path from "path";
import * as yargs from "yargs";

import {ExecutionTracer} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {ModuleParameters} from "./Module";
import {NullTypeDeducer} from "./NullTypeDeducer";
import {SimpleTypeDeducer} from "./SimpleTypeDeducer";
import {TypeDeducer, TypeDeducerParameters} from "./TypeDeducer";
import {UpperBoundTypeDeducer} from "./UpperBoundTypeDeducer";
import {Workspace} from "./Workspace";

interface Function {
    name: string;
}

const TYPE_DEDUCERS = {
    SimpleTypeDeducer: (parameters: TypeDeducerParameters) => new SimpleTypeDeducer(parameters),
    NullTypeDeducer: (parameters: TypeDeducerParameters) => new NullTypeDeducer(parameters),
    LowerBoundTypeDeducer: (parameters: TypeDeducerParameters) => new LowerBoundTypeDeducer(parameters),
    UpperBoundTypeDeducer: (parameters: TypeDeducerParameters) => new UpperBoundTypeDeducer(parameters)
};

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
        workspace.exportTypeDefinitions(types);
    }
}

export function main() {
    let args: {
        repo: string,
        dir: string,
        typeDeducer: keyof typeof TYPE_DEDUCERS,
        testTimeoutWindow: number,
        treatAllErrorsAsTypeErrors: boolean,
        roundUpArgsFromBottom: boolean,
        generateImageForTypeRounding: boolean
    } = yargs
        .option("repo", {
            describe: "Url from which to clone the repo.",
            demandOption: true
        })
        .option("dir", {
            describe: "Working directory (must be empty).",
            demandOption: true
        })
        .option("typeDeducer", {
            describe: "The TypeDeducer implementation to use.",
            choices: Object.keys(TYPE_DEDUCERS),
            default: "SimpleTypeDeducer"
        })
        .option("testTimeoutWindow", {
            describe: "The maximum time (ms) for which the test suite is run. If the test suite timed out, types are still collected, but may be incomplete.",
            default: 60000
        })
        .option("treatAllErrorsAsTypeErrors", {
            describe: "The Validator expects the library to throw a TypeError when a library encountered an argument of the wrong type. When this flag is set, any error is considered one caused by a bad argument. (Ignored unless SimpleTypeDeducer is used)",
            default: false
        })
        .option("roundUpArgsFromBottom", {
            describe: "By default, the TypeDeducer won't try to introduce new 'kinds of types. For example, if no test cases ever had a string for some parameter, it wouldn't try to introduce a string. Setting this to try makes the TypeDeducer more complete, but less controlled. (Ignored unless SimpleTypeDeducer is used)",
            default: false
        })
        .option("generateImageForTypeRounding", {
            describe: "Generate a graph to show how types were rounded. Requires mermaid to be installed globally (https://knsv.github.io/mermaid/#configuration53). (Ignored unless SimpleTypeDeducer is used)",
            default: false
        })
        .help()
        .argv;

    let pipeline = new Pipeline(
        args.repo,
        path.resolve(args.dir),
        args.testTimeoutWindow,
        TYPE_DEDUCERS[args.typeDeducer]({
            roundUpParameters: {roundUpFromBottom: args.roundUpArgsFromBottom},
            folderToWriteDebugging: path.resolve(args.dir, "output"),
            generateImageForTypeRounding: args.generateImageForTypeRounding
        }),
        {treatAllErrorsAsTypeErrors: args.treatAllErrorsAsTypeErrors}
    );
    pipeline.run();
}
