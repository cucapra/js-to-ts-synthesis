import {Map} from "immutable";
import {ArgDef, argDefs} from "./StaticAnalysis";

export interface ModuleParameters {
    treatAllErrorsAsTypeErrors: boolean;
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
}

export abstract class Module {
    constructor(public readonly exportedFunctions: Map<string, FunctionInfo>) {
    }
}

// Some modules just export a single function.
export class FunctionModule extends Module {
    constructor(main: Function & {name: string}, parameters: ModuleParameters) {
        super(Map<string, FunctionInfo>([[main.name, new FunctionInfo(main.name, main, parameters.treatAllErrorsAsTypeErrors)]]));
    }
}

export class ObjectModule extends Module {
    constructor(main: object, parameters: ModuleParameters) {
        let exportedFunctions: [string, FunctionInfo][] = [];
        ObjectModule.exportFunctions(exportedFunctions, main, [], parameters);
        super(Map<string, FunctionInfo>(exportedFunctions));
    }

    private static exportFunctions(exportedFunctions: [string, FunctionInfo][], target: any, path: string[], parameters: ModuleParameters) {
        switch (typeof target) {
            case "function":
                let name = path.join(".");
                exportedFunctions.push([name, new FunctionInfo(name, target, parameters.treatAllErrorsAsTypeErrors)]);
                break;
            case "object":
                for (let key in target) {
                    ObjectModule.exportFunctions(exportedFunctions, target[key], path.concat([key]), parameters);
                }
                break;
        }
    }
}