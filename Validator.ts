let deepClone = require("deep-clone");

import {FunctionCall} from "./ExecutionTracer";
import {FunctionInfo} from "./Module";

const NUM_INVOCATIONS = 5;
type KeyType = number|string;

export interface ValueProvider {
    singleValue?: true;
    value(originalArg: any): any;
}

export abstract class Validator {
    abstract validate(valueProvider: ValueProvider): boolean;

    forSubExpression(property: KeyType) {
        return new SubExpressionValidator(this, property);
    }
}

// Probably the best we can do for return types at this point.
export class NoopValidator extends Validator {

    validate(valueProvider: ValueProvider) {
        return true;
    }
}

export class ArgValidator extends Validator {

    constructor(private functionInfo: FunctionInfo, private testCalls: FunctionCall[], private arg: number) {
        super();
    }

    validate(valueProvider: ValueProvider): boolean {

        if (this.arg >= this.functionInfo.args.length)
            throw Error(`Argument ${this.arg} out of bounds`);
        console.log(`Call ${this.functionInfo.name}`);

        let timesToRun = valueProvider.singleValue ? 1 : NUM_INVOCATIONS;

        for (let i = 0; i < timesToRun; i++) {
            /**
             * Need a deep clone of the arguments for two reasons.
             * 1) Calling the function can have side effects that mutate the arguments.
             * 2) Recursive validation may require manipulating arguments rather than replacing them.
             */
            let args = deepClone(this.testCalls[Math.floor(Math.random() * this.testCalls.length)].args);

            for (let i = 0; i < args.length; i++) {
                if (i === this.arg) {
                    let value = valueProvider.value(args[i]);
                    console.log(`- ${JSON.stringify(value)}`);
                    args[i] = value;
                }
                else {
                    console.log(`- ${JSON.stringify(args[i])} [unchanged]`);
                }
            }

            if (this.functionInfo.run(args)) {
                console.log("OK");
                console.log();
            }
            else {
                console.log("NOT OK");
                console.log();
                return false;
            }
        }

        return true;
    }
}

class SubExpressionValidator extends Validator {
    constructor(private parent: Validator, private property: KeyType) {
        super();
    }

    validate(valueProvider: ValueProvider) {
        return this.parent.validate({
            singleValue: valueProvider.singleValue,
            value: (originalArg) => {
                originalArg[this.property] = valueProvider.value(originalArg[this.property]);
                return originalArg;
            }
        });
    }
}

