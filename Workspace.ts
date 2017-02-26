import * as process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {Set, Dictionary} from 'typescript-collections';
import {ListDictionary} from './Utils';

import {FunctionCall, FunctionCalls} from './ExecutionTracer';
import {FunctionTypeDefinition, Type} from './TypeDeducer';

function typeDefinition(types: Set<Type>): string {
    return types.toArray().map((typ) => {
        switch (typ){
            case Type.NULL:
                return "null";
            case Type.UNDEFINED:
                return "undefined";
            case Type.BOOLEAN:
                return "boolean";
            case Type.NUMBER:
                return "number";
            case Type.STRING:
                return "string";
            case Type.FUNCTION:
                return "(...args: any[]) => any";
            case Type.OBJECT:
                return "any";
        }
        }).join("|");
}

function definitionFor(func: FunctionTypeDefinition): string {
    var args : string[] = [];

    func.argTypes.forEach((arg, i) => {
        args.push(`${arg.name}: ${typeDefinition(arg.type)}`);
    });
    
    return `export declare function ${func.name}(${args.join(", ")}): ${typeDefinition(func.returnValueType)};\n`
}

function validatingTestFor(func: FunctionTypeDefinition, call: FunctionCall): string {
    var test = '';
    var args : string[] = [];
    call.args.forEach((arg, i) => {
        test += `var ${func.argTypes[i].name}: ${typeDefinition(func.argTypes[i].type)} = ${JSON.stringify(arg)};\n`;
        args.push(func.argTypes[i].name);
    });

    test += `var result: ${typeDefinition(func.returnValueType)} = ${func.name}(${args.join(", ")});\n`;
    return `(function (){\n${test}\n})();\n`;
}

const TEST_TIMEOUT_WINDOW = 60000;

export class Workspace {
    directory : string;
    testDirectory : string;
    mainFile : string;
    es6Enabled : boolean;
    constructor(directory:string, repoUri:string, es6Enabled:boolean){
        console.log(`Working directory is ${directory}`);
        this.directory = directory;

        // Clone from the repo.
        this.runCommand(`git clone ${repoUri} .`);

        // Install dependencies.
        this.runCommand("npm install");

        // Install the tracer.
        this.runCommand("npm install https://github.com/cucapra/njsTrace");

        // Install the translator. njsTrace only works for ES5 code.
        if (es6Enabled){
            this.runCommand("npm install babel-register babel-preset-env");
            fs.writeFileSync(path.join(directory, '.babelrc'), '{"presets": ["env"]}');
        }

        var testDirectory = null;
        for (var testDir of ['test', 'tests', 'mocha_test']){
            if (fs.existsSync(path.join(directory, testDir))){
                testDirectory = path.join(directory, testDir);
            }
        }

        if (testDirectory==null){
            throw Error("Cannot find test directory");
        }
        this.testDirectory = testDirectory;

        var module = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf-8'));
        this.mainFile = path.join(directory, module.main);

        this.es6Enabled = es6Enabled;
    }

    getExportedFunctions() : string[] {
        var exportedFunctions : string[] = [];
        var maxDepth = 10;

        JSON.stringify(require(this.mainFile));
        
        function listExportedFunctions(target:any, path:string[]){
            if (path.length<maxDepth){
                switch (typeof target){
                    case 'function':
                        // A function at the top level won't have a path. Lookup its name.
                        // Otherwise, pull the name as the property of the object where it
                        // is defined.
                        exportedFunctions.push(path.length > 0 ? path.join('.') : target.name);
                    case 'object':
                        for (var key in target){
                            listExportedFunctions(target[key], path.concat([key]));
                        }
                }
            }
        }


        listExportedFunctions(require(this.mainFile), []);
        return exportedFunctions;
    }

    runTests(){
        if (this.runCommandWithTimeout("npm test", TEST_TIMEOUT_WINDOW)){
            console.log(`Tests timed out after ${TEST_TIMEOUT_WINDOW}ms. Type definitions may be incomplete.`);
        }
    }

    exportTypeDefinitions(typeDefinitions: ListDictionary<string, FunctionTypeDefinition>, executions: Dictionary<string, FunctionCalls>){
        var typeTestsFile = path.join(this.testDirectory, 'tests.ts')
        var typeTestsFd = fs.openSync(typeTestsFile, 'w');

        typeDefinitions.forEach((file, definitions) => {
            console.log(`Exporting types for ${file}`);

            var definitionFileNoExt = file.substr(0, file.length-3);
            var definitionFd = fs.openSync(definitionFileNoExt + '.d.ts', 'w');
            for (var func of definitions){
                fs.writeSync(definitionFd, definitionFor(func));
                
                fs.writeSync(typeTestsFd, `import {${func.name}} from '${definitionFileNoExt}';\n`);
                for (var call of executions.getValue(func.name).calls){
                    fs.writeSync(typeTestsFd, validatingTestFor(func, call));
                }
            }
            fs.closeSync(definitionFd);
        });

        fs.closeSync(typeTestsFd);

        this.runCommand(`tsc ${typeTestsFile}`);
    }

    private runCommand(command: string){
        console.log(`Running command [${command}]`);
        process.execSync(command, {cwd: this.directory, stdio: 'inherit'});
    }

    private runCommandWithTimeout(command: string, timeout: number): boolean {
        console.log(`Running command [${command}]`);
        try {
            process.execSync(command, {cwd: this.directory, stdio: 'inherit', timeout: timeout});
        }
        catch (e){
            if (e.errno=="ETIMEDOUT"){
                return true;
            }
            throw e;
        }

        return false;
    }
}
