import * as process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {Set} from 'typescript-collections';
import {ListDictionary} from './Utils';

import {Function, FunctionCall} from './ExecutionTracer';
import {FunctionTypeDefinition, Type} from './TypeDeducer';

function typeDefinition(types: Set<Type>): string {
    return types.toArray().map((typ) => Type[typ].toLowerCase()).join("|");
}

function definitionFor(func: FunctionTypeDefinition): string {
    var args : string[] = [];

    func.argTypes.forEach((arg, types) => {
        args.push(`arg${arg}: ${typeDefinition(types)}`);
    });
    
    return `export declare function ${func.name}(${args.join(", ")}): ${typeDefinition(func.returnValueType)};\n`
}

function validatingTestFor(func: FunctionTypeDefinition, call: FunctionCall): string {
    var test = '';
    var args : string[] = [];
    call.args.forEach((argIndex, arg) => {
        test += `var arg${argIndex}: ${typeDefinition(func.argTypes.getValue(argIndex))} = ${JSON.stringify(arg)};\n`;
        args.push(`arg${argIndex}`);
    });

    test += `var result: ${typeDefinition(func.returnValueType)} = ${func.name}(${args.join(", ")});\n`;
    return `(function (){\n${test}\n})();\n`;
}

export class Workspace {
    private directory : string;
    constructor(directory:string, repoUri:string){
        this.directory = directory;

        // Clone from the repo.
        this.runCommand(`git clone ${repoUri} .`);

        // Install dependencies.
        this.runCommand("npm install");

        // Install the tracer.
        this.runCommand("npm install njstrace");
    }

    getDirectory(){
        return this.directory;
    }

    getTestDirectory(){
        return path.join(this.directory, 'test');
    }

    runTests(){
        this.runCommand("npm test");
    }

    exportTypeDefinitions(typeDefinitions: ListDictionary<string, FunctionTypeDefinition>, executions: ListDictionary<Function, FunctionCall>){
        var typeTestsFile = path.join(this.getTestDirectory(), 'tests.ts')
        var typeTestsFd = fs.openSync(typeTestsFile, 'w');

        typeDefinitions.forEach((file, definitions) => {
            console.log(`Exporting types for ${file}`);

            var definitionFileNoExt = file.substr(0, file.length-3);
            var definitionFd = fs.openSync(definitionFileNoExt + '.d.ts', 'w');
            for (var func of definitions){
                fs.writeSync(definitionFd, definitionFor(func));
                
                fs.writeSync(typeTestsFd, `import {${func.name}} from '${definitionFileNoExt}';\n`);
                for (var call of executions.getValue(new Function(func.name, file))){
                    fs.writeSync(typeTestsFd, validatingTestFor(func, call));
                }
            }
            fs.closeSync(definitionFd);
        });

        fs.closeSync(typeTestsFd);

        this.runCommand(`tsc ${typeTestsFile}`);
    }

    private runCommand(command: string){
        process.execSync(command, {cwd: this.directory, stdio: 'inherit'});
    }
}
