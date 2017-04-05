import {Map} from "immutable";
import {tagFor} from "./instrumentation/tag";
import {ArgDef, argDefs} from "./StaticAnalysis";

export interface ModuleParameters {
    treatAllErrorsAsTypeErrors: boolean;
}

export type SourceFile = string;
export type FunctionTag = number;
export type FunctionsMap<T> = Map<SourceFile, Map<FunctionTag, T>>;

// The Map functions have a lot of undefined in their transform functions. Get rid of those.
export function val<T>(v: T | undefined) {
    if (v === undefined)
        throw Error("Unexpected undefined");
    return v;
}

export class FunctionInfo {
    args: ArgDef[];

    constructor (public name: string, private f: Function, private treatAllErrorsAsTypeErrors = false) {
        this.args = argDefs(f);
    }

    run(args: any[]) {
        try {
             this.f.apply(undefined, args);
        }
        catch (e) {
            if (this.treatAllErrorsAsTypeErrors || (e instanceof TypeError))
                return false;
            throw e;
        }
        return true;
    }

    /**
     * It's possible that a function is called with more args than it declares.
     * These additional arguments can still be used by the function, and should be given types.
     */
    extendArgs(numArgs: number) {
        for (let i = this.args.length; i < numArgs; i++) {
            this.args.push({name: `arg${i}`, typeofChecks: {"===": [], "!==": []}});
        }
    }
}

export abstract class Module {
    constructor(public readonly exportedFunctions: FunctionsMap<FunctionInfo>) {
    }
}

// Some modules just export a single function.
export class FunctionModule extends Module {
    constructor(main: Function & {name: string}, mainFile: string, parameters: ModuleParameters) {
        super(Map<SourceFile, Map<FunctionTag, FunctionInfo>>([
            [
                mainFile,
                Map<FunctionTag, FunctionInfo>([
                    [
                        tagFor(main),
                        new FunctionInfo(main.name, main, parameters.treatAllErrorsAsTypeErrors)
                    ]
                ])
            ]
        ]));
    }
}

export class ObjectModule extends Module {
    constructor(main: object, mainFile: string, parameters: ModuleParameters) {
        let exportedFunctions: [number, FunctionInfo][] = [];
        ObjectModule.exportFunctions(exportedFunctions, main, [], parameters);
        super(Map<SourceFile, Map<FunctionTag, FunctionInfo>>([
            [
                mainFile,
                Map<FunctionTag, FunctionInfo>(exportedFunctions)
            ]
        ]));
    }

    private static exportFunctions(exportedFunctions: [number, FunctionInfo][], target: any, path: string[], parameters: ModuleParameters) {
        switch (typeof target) {
            case "function":
                let name = path.join(".");
                let tag = tagFor(target);
                if (tag !== undefined)
                    exportedFunctions.push([tag, new FunctionInfo(name, target, parameters.treatAllErrorsAsTypeErrors)]);
                break;
            case "object":
                for (let key in target) {
                    ObjectModule.exportFunctions(exportedFunctions, target[key], path.concat([key]), parameters);
                }
                break;
        }
    }
}

export function fileForTag<T>(tag: FunctionTag, map: FunctionsMap<T>) {
    for (let sourceFile of map.keySeq().toArray()) {
        if (map.get(sourceFile).has(tag))
            return sourceFile;
    }
    throw Error(`No file found for tag ${tag}`);
}

export function allTags<T>(map: FunctionsMap<T>) {
    let tags: FunctionTag[] = [];
    for (let entry of map.valueSeq().toArray()) {
        for (let tag of entry.keySeq().toArray()) {
            tags.push(tag);
        }
    }
    return tags;
}