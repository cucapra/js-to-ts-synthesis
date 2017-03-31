import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";

import {FunctionCall, FunctionCalls} from "./ExecutionTracer";
import {FunctionModule, Module, ModuleParameters, ObjectModule} from "./Module";
import {FunctionTypeDefinition} from "./TypeDeducer";

export function definitionFor(func: FunctionTypeDefinition): string {
    let args: string[] = [];

    func.argTypes.forEach(arg => {
        args.push(`${arg.name}: ${arg.type.toDefinition()}`);
    });

    return `export declare function ${func.name}(${args.join(", ")}): ${func.returnValueType.toDefinition()};\n`;
}

function validatingTestFor(func: FunctionTypeDefinition, call: FunctionCall): string {
    let test = "";
    let args: string[] = [];
    call.args.forEach((arg, i) => {
        test += `var ${func.argTypes[i].name}: ${func.argTypes[i].type.toDefinition()} = ${JSON.stringify(arg)};\n`;
        args.push(func.argTypes[i].name);
    });

    test += `var result: ${func.returnValueType.toDefinition()} = ${func.name}(${args.join(", ")});\n`;
    return `(function (){\n${test}\n})();\n`;
}

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
    moduleParameters: ModuleParameters;
    constructor(directory: string, repoUri: string, testTimeoutWindow: number, moduleParameters: ModuleParameters) {
        console.log(`Working directory is ${directory}`);
        this.directory = directory;

        // Needed so that instrumented libraries can find the instrumentation code.
        process.env.INSTRUMENTATION_SRC = path.join(__dirname, "instrumentation");
        console.log(`INSTRUMENTATION_SRC=${process.env.INSTRUMENTATION_SRC}`);

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

        let module = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf-8"));
        this.mainFile = path.join(directory, module.main || module.files[0]);

        this.testTimeoutWindow = testTimeoutWindow;
        this.moduleParameters = moduleParameters;
    }

    getModule(): Module {
        let main = require(this.mainFile);
        switch (typeof main) {
            case "function":
                return new FunctionModule(main, this.moduleParameters);
            case "object":
                return new ObjectModule(main, this.moduleParameters);
            default:
                throw new Error(`${this.mainFile} does not export a function or object`);
        }
    }

    runTests() {
        if (this.runCommandWithTimeout("npm test", this.testTimeoutWindow)) {
            console.log(`Tests timed out after ${this.testTimeoutWindow}ms. Type definitions may be incomplete.`);
        }
    }

    exportTypeDefinitions(typeDefinitions: { [sourceFile: string]: FunctionTypeDefinition[] }, executions: { [functionName: string]: FunctionCalls }) {
        let typeTestsFile = path.join(this.directory, "tests.ts");
        let typeTestsFd = fs.openSync(typeTestsFile, "w");

        for (let file in typeDefinitions) {
            console.log(`Exporting types for ${file}`);

            let definitionFileNoExt = file.substr(0, file.length - 3);
            let definitionFd = fs.openSync(definitionFileNoExt + ".d.ts", "w");
            for (let func of typeDefinitions[file]){
                fs.writeSync(definitionFd, definitionFor(func));

                fs.writeSync(typeTestsFd, `import {${func.name}} from '${definitionFileNoExt}';\n`);
                for (let call of executions[func.name].calls){
                    fs.writeSync(typeTestsFd, validatingTestFor(func, call));
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
