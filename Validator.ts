import {FunctionInfo} from "./Module";
import {FunctionCall} from "./ExecutionTracer";

export interface Validator {
    (value: any): boolean;
}

export function validatorForArg(functionInfo: FunctionInfo, testCalls: FunctionCall[], arg: number): Validator {
    if (arg < functionInfo.args.length)
        throw Error(`Argument ${arg} out of bounds`);

    return (value: any) => {
        let args = testCalls[0].args.slice(0);
        args[arg] = value;
        return functionInfo.run(args);
    };
}

export function validatorForReturnType(functionInfo: FunctionInfo, testCalls: FunctionCall[]): Validator {
    return (value: any) => false;
}