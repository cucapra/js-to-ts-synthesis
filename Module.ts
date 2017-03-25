import {ArgDef, argDefs} from "./StaticAnalysis";

export class FunctionInfo {
    args: ArgDef[];

    constructor (public name: string, private f: Function) {
        this.args = argDefs(f);
    }

    run(args: any[]) {
        try {
             this.f.apply(undefined, args);
        }
        catch (e) {
            if (e instanceof TypeError)
                return false;
            throw e;
        }
        return true;
    }
}

export abstract class Module {
    readonly exportedFunctions: {[functionName: string]: FunctionInfo} = {};
}

// Some modules just export a single function.
export class FunctionModule extends Module {
    constructor(main: Function & {name: string}) {
        super();
        this.exportedFunctions[main.name] = new FunctionInfo(main.name, main);
    }
}

export class ObjectModule extends Module {
    constructor(main: object) {
        super();
        this.exportFunctions(main, []);
    }

    private exportFunctions(target: any, path: string[]) {
        switch (typeof target) {
            case "function":
                let name = path.join(".");
                this.exportedFunctions[name] =  new FunctionInfo(name, target);
                break;
            case "object":
                for (let key in target) {
                    this.exportFunctions(target[key], path.concat([key]));
                }
                break;
        }
    }
}