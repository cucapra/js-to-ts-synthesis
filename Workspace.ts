import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import {injectInstrumentation, injectInstrumentationForTest} from "./Instrumentation";
import {FunctionModule, FunctionsMap, Module, ModuleParameters, ObjectModule} from "./Module";
import {FunctionTypeDefinition} from "./TypeDeducer";

// Needed so that this can require the module.
(<any>global)._meta_ = {
    apply: function (fct: Function, thisObj: any, args: any[]) {
        return fct.apply(thisObj, args);
    },
    return: function (returnValue: any) {
        return returnValue;
    }
};

function testDirectory(dir: string): string[] | undefined {
    return fs.existsSync(dir) ? fs.readdirSync(dir).map(file => path.join(dir, file)) : undefined;
}

function testFile(file: string): string[] | undefined {
    return fs.existsSync(file) ? [file] : undefined;
}

export class Workspace {
    directory: string;
    testFiles: string[];
    mainFile: string;
    testTimeoutWindow: number;
    module: Module;
    instrumentationOutputFile: string;

    constructor(directory: string, repoUri: string, testTimeoutWindow: number, moduleParameters: ModuleParameters) {
        console.log(`Working directory is ${directory}`);
        this.directory = directory;

        // Clone from the repo.
        this.runCommand(`git clone ${repoUri} .`);

        // Install dependencies.
        this.runCommand("npm install");

        // Install tools for the execution tracer.
        this.runCommand("npm install babel-preset-env esprima");

        let testFiles = testDirectory(path.join(directory, "test")) || testDirectory(path.join(directory, "tests ")) || testFile(path.join(directory, "test.js"));
        if (testFiles !== undefined)
            this.testFiles = testFiles;
        else
             throw Error("Cannot find test directory");

        let packageJson = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf-8"));
        this.mainFile = path.join(directory, packageJson.main || packageJson.files[0]);

        injectInstrumentation(this.mainFile);

        let main = require(this.mainFile);
        switch (typeof main) {
            case "function":
                this.module = new FunctionModule(main, this.mainFile, moduleParameters);
                break;
            case "object":
                this.module = new ObjectModule(main, this.mainFile, moduleParameters);
                break;
            default:
                throw new Error(`${this.mainFile} does not export a function or object`);
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
        }

        fs.closeSync(typeTestsFd);

        this.runCommand(`tsc ${typeTestsFile}`);
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
