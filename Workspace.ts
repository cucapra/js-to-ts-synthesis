import * as process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import {ListDictionary} from './Utils';

import {FunctionTypeDefinition, Type} from './TypeDeducer';

function definitionFor(func: FunctionTypeDefinition): string {
    var args : string[] = [];

    func.argTypes.forEach((arg, types) => {
        var typeDefinition = types.toArray().map((typ) => Type[typ].toLowerCase()).join("|");
        args.push(`arg${arg}: ${typeDefinition}`);
    })

    var returnType = func.returnValueType.toArray().map((typ) => Type[typ].toLowerCase()).join("|");
    
    return `declare function ${func.name}(${args.join(", ")}): ${returnType};`
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

    exportTypeDefinitions(typeDefinitions: ListDictionary<string, FunctionTypeDefinition>){
        typeDefinitions.forEach((file, definitions) => {
            console.log(`Exporting types for ${file}`);

            var definitionFd = fs.openSync(file.substr(0, file.length-3) + '.d.ts', 'w');
            for (var func of definitions){
                fs.writeSync(definitionFd, definitionFor(func));
            }
            fs.closeSync(definitionFd);
        });
    }

    private runCommand(command: string){
        process.execSync(command, {cwd: this.directory});
    }
}
