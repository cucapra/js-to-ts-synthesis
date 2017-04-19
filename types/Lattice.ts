import * as fs from "fs";
import {Iterable} from "immutable";

/**
 * Let the Lattice see all the ascending paths, not just the valid ones, so they can be displayed.
 * Paths where IsValid = false should not be iterated any further.
 */
type IsValid = boolean;

/**
 * Include the name of a rule with each link, for visualization.
 */
type Rule = string;

export interface LatticeElement<ParamsT> {
    ascendingPaths(params: ParamsT): Iterable<{}, [this, IsValid, Rule]>;
    toDefinition(): string | string[];
}

export class Lattice<T extends LatticeElement<ParamsT>, ParamsT> {

    private id = 0;
    constructor(private fileToWriteDebugging: string) {
        fs.writeFileSync(fileToWriteDebugging, "graph BT");
    }

    /** Identifier is for debugging. Easy to see which run of this function is which. */
    walk(baseElement: T, params: ParamsT, identifier: string): T {
        let graph: string[] = [];
        let result = this.walkRecursive(baseElement, params, undefined, graph);
        fs.writeFileSync(this.fileToWriteDebugging, `
subgraph ${identifier}
${graph.join("\n")}
end`, {flag: "a"});
        return result;
    }

    /** For now, just walk along one arbitrary path. This may be improved later. */
    private walkRecursive(element: T, params: ParamsT, rule: string, graph: string[], sourceId?: number): T {
        let id = ++this.id;
        let definition = definitionAsString(element.toDefinition());
        if (sourceId === undefined)
            graph.push(`${id}["${definition}"]`);
        else
            graph.push(`${sourceId}-->|"${rule}"|${id}["${definition}"]`);

        let result = element;
        element.ascendingPaths(params).forEach(([ascElement, valid, rule]) => {
            if (!valid) {
                let ascId = ++this.id;
                graph.push(`${id}-->|"${rule}"|${ascId}["${definitionAsString(ascElement.toDefinition())}"]`);
                graph.push(`style ${ascId} stroke:#f66;`);
                return true;
            }
            result = this.walkRecursive(ascElement, params, rule, graph, id);
            return false;
        });
        return result;
    }
}

function definitionAsString(definition: string | string[]) {
   return (typeof definition === "string" ? definition : definition.join("|")).replace(/"/g, "'");
}