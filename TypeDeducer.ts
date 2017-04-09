import {FunctionCalls} from "./ExecutionTracer";
import {FunctionsMap, val} from "./Module";
import {Type} from "./Type";
import {RoundUpParameters} from "./type_components/TypeComponent";

export class FunctionTypeDefinition {
    constructor(public calls: FunctionCalls, public argTypes: Type[], public returnValueType: Type) {
    }

    definitionFor() {
        let args = this.argTypes.map((arg, i) => `${this.calls.info.args[i].name}: ${arg.toDefinition()}`);
        return `export declare function ${this.calls.info.name}(${args.join(", ")}): ${this.returnValueType.toDefinition()};\n`;
    }

    validatingTests() {
        return this.calls.calls.map(call => {
            let test = "";
            for (let i = 0; i < call.args.length; i++) {
                test += `var ${this.calls.info.args[i].name}: ${this.argTypes[i].toDefinition()} = ${JSON.stringify(call.args[i])};\n`;
            }

            test += `var result: ${this.returnValueType.toDefinition()} = ${this.calls.info.name}(${this.calls.info.args.map(d => d.name).join(", ")});\n`;
            return `(function (){\n${test}\n})();\n`;
        });
    }
}

export abstract class TypeDeducer {
    constructor(protected parameters: RoundUpParameters) {}

    getAllTypeDefinitions(executions: FunctionsMap<FunctionCalls>): FunctionsMap<FunctionTypeDefinition> {
        return executions.map(m => val(m).map(functionCalls => this.getTypeFor(val(functionCalls))).toMap()).toMap();
    }

    protected abstract getTypeFor(calls: FunctionCalls): FunctionTypeDefinition;
}