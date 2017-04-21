import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import {FunctionCalls} from "./ExecutionTracer";
import {LowerBoundTypeDeducer} from "./LowerBoundTypeDeducer";
import {FunctionTypeDefinition} from "./TypeDeducer";
import {Lattice} from "./types/Lattice";
import {Type} from "./types/Type";
import {RoundUpParameters} from "./types/TypeComponent";
import {ArgValidator, NoopValidator, Validator} from "./Validator";

export class SimpleTypeDeducer extends LowerBoundTypeDeducer {
    getTypeFor(calls: FunctionCalls): FunctionTypeDefinition {
        let definition = super.getTypeFor(calls);

        let folderToWriteDebugging = this.parameters.folderToWriteDebugging;
        if (!fs.existsSync(folderToWriteDebugging))
            fs.mkdirSync(folderToWriteDebugging);
        let latticeOutputFile = path.join(folderToWriteDebugging, "lattice.graph");
        let lattice = new Lattice<Type, [Validator, RoundUpParameters]>(latticeOutputFile);

        for (let i = 0; i < definition.argTypes.length; i++) {
            definition.argTypes[i] = lattice.walk(definition.argTypes[i], [new ArgValidator(calls.info, calls.calls, i), this.parameters.roundUpParameters], definition.calls.info.args[i].name);
        }

        definition.returnValueType = lattice.walk(definition.returnValueType, [new NoopValidator(), this.parameters.roundUpParameters], "<return>");

        if (this.parameters.generateImageForTypeRounding) {
            let command = `mermaid -o ${folderToWriteDebugging} ${latticeOutputFile}`;
            console.log(`Running command [${command}]`);
            try {
                child_process.execSync(command);
            }
            catch (e) {
                console.log(`Command failed: ${e}`);
            }
        }

        return definition;
    }
}