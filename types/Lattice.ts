import * as fs from "fs";
import {Iterable} from "immutable";

let letters = require("letters");

/**
 * Let the Lattice see all the ascending paths, not just the valid ones, so they can be displayed.
 * Paths where IsValid = false should not be iterated any further.
 */
type IsValid = boolean;

/** Include the name of a rule with each link, for visualization. */
type Rule = string;

/** Include examples of values that succeeded or failed*/
type Examples = {}[];

export interface LatticeElement<ParamsT> {
    ascendingPaths(params: ParamsT): Iterable<{}, [this, IsValid, Rule, Examples]>;
    toDefinition(): string | string[];
}

const BAD_COLOR = "#f00", GOOD_COLOR = "#0f0";

interface Output {
    graph: string[];
    examples: string[];
}

export class Lattice<T extends LatticeElement<ParamsT>, ParamsT> {

    private id = 0;
    private validationExamplesSeq: {next(): string} = new letters();
    constructor(private fileToWriteDebugging: string, private fileToWriteValidation: string) {
        fs.writeFileSync(fileToWriteDebugging, "graph BT");
        fs.writeFileSync(fileToWriteValidation, "");
    }

    /** Identifier is for debugging. Easy to see which run of this function is which. */
    walk(baseElement: T, params: ParamsT, identifier: string): T {
        let output: Output = {graph: [], examples: []};
        let result = this.walkRecursive(baseElement, params, undefined, [], output);

        fs.writeFileSync(this.fileToWriteDebugging, `
subgraph ${identifier}
${output.graph.join("\n")}
end`, {flag: "a"});

        fs.writeFileSync(this.fileToWriteValidation, `
---------- ${identifier} ----------
${output.examples.join("\n")}
----------
        `, {flag: "a"});

        return result;
    }

    /** For now, just walk along one arbitrary path. This may be improved later. */
    private walkRecursive(element: T, params: ParamsT, rule: string, examples: {}[], output: Output, sourceId?: number): T {
        let id = ++this.id;
        let definition = definitionAsString(element.toDefinition());
        if (sourceId === undefined) {
            output.graph.push(`${id}["${definition}"]`);
        }
        else {
            let stepId = this.validationExamplesSeq.next();
            output.graph.push(`${sourceId}-->|"${rule} (${stepId})"|${id}["${definition}"]`);
            output.examples.push(`Step ${stepId}:`);
            for (let example of examples) {
                output.examples.push(JSON.stringify(example) + " [OK]");
            }
        }
        let result = element;
        let resultUpdated = false;
        element.ascendingPaths(params).forEach(([ascElement, valid, rule, examples]) => {
            if (!valid) {
                let ascId = ++this.id;
                let stepId = this.validationExamplesSeq.next();
                output.graph.push(`${id}-->|"${rule} (${stepId})"|${ascId}["${definitionAsString(ascElement.toDefinition())}"]`);
                output.graph.push(`style ${ascId} stroke:${BAD_COLOR};`);
                output.examples.push(`Step ${stepId}:`);
                for (let example of examples) {
                    output.examples.push(JSON.stringify(example) + " [NOT OK]");
                }
                return true;
            }
            result = this.walkRecursive(ascElement, params, rule, examples, output, id);
            resultUpdated = true;
            return false;
        });

        if (!resultUpdated)
            output.graph.push(`style ${id} stroke:${GOOD_COLOR}`);
        return result;
    }
}

function definitionAsString(definition: string | string[]) {
   return (typeof definition === "string" ? definition : definition.join("|")).replace(/"/g, "'");
}