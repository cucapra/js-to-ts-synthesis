import {Iterable} from "immutable";
import * as fs from "fs";

let escape_quotes = require('escape-quotes');

export interface LatticeElement<ParamsT> {
    ascendingPaths(params: ParamsT): Iterable<{}, this>;
    toDefinition(): string | string[];
}

export class Lattice<T extends LatticeElement<ParamsT>, ParamsT> {

    private id = 0;
    constructor(private fileToWriteDebugging: string) {
        fs.writeFileSync(fileToWriteDebugging, "graph TB");
    }

    /** Identifier is for debugging. Easy to see which run of this function is which. */
    walk(baseElement: T, params: ParamsT, identifier: string): T {
        let stepsPerformed: string[] = [];
        let result = this.walkRecursive(baseElement, params, stepsPerformed);
        fs.writeFileSync(this.fileToWriteDebugging, `
subgraph ${identifier}
${stepsPerformed.join("\n")}
end`, {flag: "a"});
        return result;
    }

    /** For now, just walk along one arbitrary path. This may be improved later. */
    private walkRecursive(element: T, params: ParamsT, stepsPerformed: string[], sourceId?: number): T {
        this.id++;
        let definition = element.toDefinition();
        let definitionStr = typeof definition === "string" ? definition : definition.join("|");
        if (sourceId === undefined)
            stepsPerformed.push(`${this.id}["${definitionStr.replace(/"/g, "'")}"]`);
        else
            stepsPerformed.push(`${sourceId}-->${this.id}["${definitionStr.replace(/"/g, "'")}"]`);
        let ascendingPaths = element.ascendingPaths(params);
        return ascendingPaths.isEmpty() ? element : this.walkRecursive(ascendingPaths.first(), params, stepsPerformed, this.id);
    }
}