import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";

import {FunctionCall, FunctionCalls} from "./ExecutionTracer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {toDefinition} from "./Type";
import {argDefs, ArgDef} from "./instrumentation/Static";

export interface ExportedFunctions {
    [name: string]: ArgDef[];
}

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
    constructor(directory: string, repoUri: string, testTimeoutWindow: number) {
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
    }

    getExportedFunctions(): ExportedFunctions {
        let exportedFunctions: {[name: string]: ArgDef[]} = {};
        let maxDepth = 10;

        function listExportedFunctions(target: any, path: string[]) {
            if (path.length < maxDepth) {
                switch (typeof target) {
                    case "function":
                        // A function at the top level won't have a path. Lookup its name.
                        // Otherwise, pull the name as the property of the object where it
                        // is defined.
                        exportedFunctions[path.length > 0 ? path.join(".") : target.name] = argDefs(target);
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
