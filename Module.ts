import {Map} from "immutable";
import {FunctionTagger} from "./FunctionTagger";
import {tagFor} from "./instrumentation/tag";
import {ArgDef, argDefs} from "./StaticAnalysis";

export interface ModuleParameters {
    treatAllErrorsAsTypeErrors: boolean;
}

export type SourceFile = string;
export type FunctionTag = number;
export type FunctionsMap<T> = Map<SourceFile, Map<FunctionTag, T>>;

export class FunctionInfo {
    args: ArgDef[];

    constructor (public name: string, private f: Function, private treatAllErrorsAsTypeErrors = false) {
        this.args = argDefs(f);
    }

    run(args: {}[]) {
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
    constructor(main: Function & {name: string}, tagger: FunctionTagger, parameters: ModuleParameters) {
        let tag = tagFor(main);
        super(Map<SourceFile, Map<FunctionTag, FunctionInfo>>([
            [
                tagger.sourceFileForTag(tag),
                Map<FunctionTag, FunctionInfo>([
                    [
                        tag,
                        new FunctionInfo(main.name, main, parameters.treatAllErrorsAsTypeErrors)
                    ]
                ])
            ]
        ]));
    }
}

export class ObjectModule extends Module {
    constructor(main: object, tagger: FunctionTagger, parameters: ModuleParameters) {
        super(ObjectModule.exportFunctions(Map<SourceFile, Map<FunctionTag, FunctionInfo>>(), main, tagger, [], parameters));
    }

    // Immutable maps are easier to use with setIn.
    // tslint:disable-next-line:no-any
    private static exportFunctions(exportedFunctions: Map<SourceFile, Map<FunctionTag, FunctionInfo>>, target: any, tagger: FunctionTagger, path: string[], parameters: ModuleParameters): Map<SourceFile, Map<FunctionTag, FunctionInfo>> {
        switch (typeof target) {
            case "function":
                let name = path.join(".");
                let tag = tagFor(target);
                if (tag !== undefined)
                    return exportedFunctions.setIn([tagger.sourceFileForTag(tag), tag], new FunctionInfo(name, target, parameters.treatAllErrorsAsTypeErrors));
                // Also handle functions as objects to support tools like http://underscorejs.org/#oop
            case "object":
                for (let key in target) {
                    exportedFunctions = ObjectModule.exportFunctions(exportedFunctions, target[key], tagger, path.concat([key]), parameters);
                }
                break;
        }
        return exportedFunctions;
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