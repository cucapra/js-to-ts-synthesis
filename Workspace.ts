import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import {FunctionTagger} from "./FunctionTagger";
import {injectInstrumentation, injectInstrumentationForTest} from "./Instrumentation";
import {FunctionModule, FunctionsMap, Module, ModuleParameters, ObjectModule} from "./Module";
import {trackRequires} from "./TrackRequires";
import {FunctionTypeDefinition} from "./TypeDeducer";

let recursiveReadSync = require("recursive-readdir-sync");

// Needed so that this can require the module.
// tslint:disable-next-line:no-any
(<any>global)._meta_ = {
    apply: function (fct: Function, thisObj: {}, args: {}[]) {
        return fct.apply(thisObj, args);
    },
    return: function (returnValue: {}) {
        return returnValue;
    }
};

function testDirectory(dir: string): string[] | undefined {
    return fs.existsSync(dir) ? recursiveReadSync(dir) : undefined;
}

function testFile(file: string): string[] | undefined {
    return fs.existsSync(file) ? [file] : undefined;
}

export class Workspace {
    directory: string;
    testFiles: string[];
    testTimeoutWindow: number;
    module: Module;
    instrumentationOutputFile: string;

    constructor(directory: string, repoUri: string, testTimeoutWindow: number, moduleParameters: ModuleParameters) {
        console.log(`Working directory is ${directory}`);
        if (!fs.existsSync(directory))
            fs.mkdirSync(directory);
        this.directory = directory;

        // Clone from the repo.
        this.runCommand(`git clone ${repoUri} .`);

        // Install dependencies.
        this.runCommand("npm install");

        // Install tools for the execution tracer.
        this.runCommand("npm install babel-preset-env esprima");

        let testFiles = testDirectory(path.join(directory, "test")) || testDirectory(path.join(directory, "tests")) || testFile(path.join(directory, "test.js"));
        if (testFiles !== undefined)
            this.testFiles = testFiles;
        else
             throw Error("Cannot find test directory");

        let packageJson = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf-8"));
        if (!("main" in packageJson))
            throw Error("Cannot find main file");

        let tagger = new FunctionTagger();

        // Require the main file, and inject dependencies onto any library that was loaded.
        let main = trackRequires(directory, packageJson.main, filename => {
            console.log(`Instrumenting library file ${filename}`);
            injectInstrumentation(filename, tagger);
        });
        switch (typeof main) {
            case "function":
                this.module = new FunctionModule(main, tagger, moduleParameters);
                break;
            case "object":
                this.module = new ObjectModule(main, tagger, moduleParameters);
                break;
            default:
                throw new Error(`${path.join(directory, packageJson.main)} does not export a function or object`);
        }

        this.instrumentationOutputFile = path.join(this.directory, "instrumentation_output.txt");

        for (let testFile of this.testFiles) {
            if (path.extname(testFile) === ".js")
                injectInstrumentationForTest(testFile, this.instrumentationOutputFile, this.module.exportedFunctions);
        }

        this.testTimeoutWindow = testTimeoutWindow;
    }

    runTests() {
        if (this.runCommandWithTimeout("npm test", this.testTimeoutWindow)) {
            console.log(`Tests timed out after ${this.testTimeoutWindow}ms. Type definitions may be incomplete.`);
        }
    }

    exportTypeDefinitions(typeDefinitions: FunctionsMap<FunctionTypeDefinition>) {
        let typeTestsFile = path.join(this.directory, "tests.ts");
        let typeTestsFd = fs.openSync(typeTestsFile, "w");
        let exportedTypeDefinitions: string[] = [];

        for (let file of typeDefinitions.keySeq().toArray()) {
            console.log(`Exporting types for ${file}`);

            let definitionFileNoExt = file.substr(0, file.length - 3);
            let definitionFd = fs.openSync(definitionFileNoExt + ".d.ts", "w");

            for (let func of typeDefinitions.get(file).valueSeq().toArray()) {
                fs.writeSync(definitionFd, func.definitionFor());

                fs.writeSync(typeTestsFd, `import {${func.calls.info.name}} from '${definitionFileNoExt}';\n`);
                for (let test of func.validatingTests()){
                    fs.writeSync(typeTestsFd, test);
                }
            }
            fs.closeSync(definitionFd);

            exportedTypeDefinitions.push(definitionFileNoExt + ".d.ts");
        }

        fs.closeSync(typeTestsFd);

        this.runCommand(`tsc ${typeTestsFile}`);

        console.log(`Type definitions exported to ${exportedTypeDefinitions.join(", ")}`);
    }

    private runCommand(command: string) {
        console.log(`Running command [${command}]`);
        child_process.execSync(command, {cwd: this.directory});
    }

    private runCommandWithTimeout(command: string, timeout: number): boolean {
        console.log(`Running command [${command}]`);
        try {
            child_process.execSync(command, {cwd: this.directory, timeout: timeout});
        }
        catch (e) {
            if (e.errno === "ETIMEDOUT") {
                return true;
            }
            throw e;
        }

        return false;
    }
}
