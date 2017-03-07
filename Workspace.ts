import * as process from "child_process";
import * as fs from "fs";
import * as path from "path";

import {FunctionCall, FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {toDefinition} from "./Type";

function definitionFor(func: FunctionTypeDefinition): string {
    let args: string[] = [];

    func.argTypes.forEach(arg => {
        args.push(`${arg.name}: ${toDefinition(arg.type)}`);
    });

    return `export declare function ${func.name}(${args.join(", ")}): ${toDefinition(func.returnValueType)};\n`;
}

function validatingTestFor(func: FunctionTypeDefinition, call: FunctionCall): string {
    let test = "";
    let args: string[] = [];
    call.args.forEach((arg, i) => {
        test += `var ${func.argTypes[i].name}: ${toDefinition(func.argTypes[i].type)} = ${JSON.stringify(arg)};\n`;
        args.push(func.argTypes[i].name);
    });

    test += `var result: ${toDefinition(func.returnValueType)} = ${func.name}(${args.join(", ")});\n`;
    return `(function (){\n${test}\n})();\n`;
}

export class Workspace {
    directory: string;
    testDirectory: string;
    mainFile: string;
    es6Enabled: boolean;
    testTimeoutWindow: number;
    constructor(directory: string, repoUri: string, es6Enabled: boolean, testTimeoutWindow: number) {
        console.log(`Working directory is ${directory}`);
        this.directory = directory;

        // Clone from the repo.
        this.runCommand(`git clone ${repoUri} .`);

        // Install dependencies.
        this.runCommand("npm install");

        // Install the tracer.
        this.runCommand("npm install https://github.com/cucapra/njsTrace");

        // Install the translator. njsTrace only works for ES5 code.
        if (es6Enabled) {
            this.runCommand("npm install babel-register babel-preset-env");
            fs.writeFileSync(path.join(directory, ".babelrc"), "{\"presets\": [\"env\"]}");
        }

        let testDirectory = null;
        for (let testDir of ["test", "tests"]) {
            if (fs.existsSync(path.join(directory, testDir))) {
                testDirectory = path.join(directory, testDir);
            }
        }

        if (testDirectory == null) {
            throw Error("Cannot find test directory");
        }
        this.testDirectory = testDirectory;

        let module = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf-8"));
        this.mainFile = path.join(directory, module.main);

        this.es6Enabled = es6Enabled;
        this.testTimeoutWindow = testTimeoutWindow;
    }

    getExportedFunctions(): string[] {
        let exportedFunctions: string[] = [];
        let maxDepth = 10;

        JSON.stringify(require(this.mainFile));

        function listExportedFunctions(target: any, path: string[]) {
            if (path.length < maxDepth) {
                switch (typeof target) {
                    case "function":
                        // A function at the top level won't have a path. Lookup its name.
                        // Otherwise, pull the name as the property of the object where it
                        // is defined.
                        exportedFunctions.push(path.length > 0 ? path.join(".") : target.name);
                    case "object":
                        for (let key in target) {
                            listExportedFunctions(target[key], path.concat([key]));
                        }
                }
            }
        }


        listExportedFunctions(require(this.mainFile), []);
        return exportedFunctions;
    }

    runTests() {
        if (this.runCommandWithTimeout("npm test", this.testTimeoutWindow)) {
            console.log(`Tests timed out after ${this.testTimeoutWindow}ms. Type definitions may be incomplete.`);
        }
    }

    exportTypeDefinitions(typeDefinitions: { [sourceFile: string]: FunctionTypeDefinition[] }, executions: { [functionName: string]: FunctionCalls }) {
        let typeTestsFile = path.join(this.testDirectory, "tests.ts");
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
        process.execSync(command, {cwd: this.directory});
    }

    private runCommandWithTimeout(command: string, timeout: number): boolean {
        console.log(`Running command [${command}]`);
        try {
            process.execSync(command, {cwd: this.directory, timeout: timeout});
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
