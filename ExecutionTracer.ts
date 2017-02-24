import * as path from 'path';
import * as fs from 'fs';

import {Dictionary, Set, Stack} from 'typescript-collections';

import {Workspace} from './Workspace';

// No definition file for this one.
var LineReaderSync = require('line-reader-sync');

interface FunctionEntry {
    name: string;
    file: string;
    argNames: string[];
    args: any;/*Dictionary<number, any>*/
}

interface FunctionExit {
    name: string;
    file: string;
    // exception: boolean; (Might be useful later)
    returnValue: any
}

interface InstrumentationLine {
    // Exactly one of these will be set.
    
    entry: FunctionEntry;
    exit: FunctionExit;
}

export interface Function {
    name: string;
    file: string;
}

export interface FunctionCall {
    args: any[];
    returnValue: any;
}

export interface FunctionCalls {
    argNames: string[];
    calls: FunctionCall[];
}

class UnbalancedEntryExitError extends Error {
  constructor(entry: FunctionEntry, exit: FunctionExit) {
    super("Entered " + entry + ", but exited " + exit);
  }
}

export class ExecutionTracer {
    private static FUNCTIONS_TO_IGNORE = (function(){
        var set = new Set<string>();
        set.add("[Anonymous]");
        return set;
    })();

    private workspace : Workspace;


    constructor(workspace : Workspace){
        this.workspace = workspace;
    }

    trace() : Dictionary<Function, FunctionCalls> {
        var instrumentationOutputFile = path.join(this.workspace.getDirectory(), 'instrumentation_output.txt');

        // Add some code to trace function inputs and outputs, using https://www.npmjs.com/package/njstrace
        // This extra logic to prepended to each test file.
        var testDirectory = this.workspace.getTestDirectory();
        for (var testFile of fs.readdirSync(testDirectory)) {
            testFile = path.join(testDirectory, testFile);
            var source = fs.readFileSync(testFile);

            fs.writeFileSync(testFile, `
var Formatter = require('njstrace/lib/formatter.js');
var fs = require('fs');
var out = fs.createWriteStream('${instrumentationOutputFile}', {'flags': 'a'});
function MyFormatter() {}
require('util').inherits(MyFormatter, Formatter);
MyFormatter.prototype.onEntry = function(args) {out.write(JSON.stringify({'entry': args}) + '\\n');};
MyFormatter.prototype.onExit = function(args) {out.write(JSON.stringify({'exit': args}) + '\\n')};
var njstrace = require('njstrace').inject({ formatter: new MyFormatter() });`);

            fs.appendFileSync(testFile, source);
        }

        this.workspace.runTests()
        return this.readInstrumentationOutput(instrumentationOutputFile);
    }

    private readInstrumentationOutput(instrumentationOutputFile: string): Dictionary<Function, FunctionCalls> {
        var calls = new Dictionary<Function, FunctionCalls>();
        var callStack = new Stack<FunctionEntry>();

        var lrs = new LineReaderSync(instrumentationOutputFile);

        while (true){
            var line = lrs.readline();
            if (line==null) break;
            var lineObj = <InstrumentationLine>JSON.parse(line);
            if (lineObj.entry!=null){
                callStack.push(lineObj.entry);
            }
            else{
                var exit = lineObj.exit;
                var entry = callStack.pop();

                if (entry.name!=exit.name || entry.file!=exit.file){
                    throw new UnbalancedEntryExitError(entry, exit);
                }
                
                if (!ExecutionTracer.FUNCTIONS_TO_IGNORE.contains(entry.name)){
                    
                    var numArgs = 0;
                    for (var k in entry.args){
                        numArgs++;
                    }

                    var argsList = [];
                    for (var i=0; i<numArgs; i++){
                        argsList.push(entry.args[i]);
                    }

                    var func = {name: entry.name, file: entry.file};
                    
                    // If this is the first instance of this function, pull in the arg names as well.
                    if (!calls.containsKey(func)){
                        calls.setValue(func, {argNames: entry.argNames, calls: []});
                    }
                    calls.getValue(func).calls.push({args: argsList, returnValue: exit.returnValue});
                }
            }
        }

        console.log(`Read instrumentation for ${calls.size()} functions.`);

        return calls;
    }
}
