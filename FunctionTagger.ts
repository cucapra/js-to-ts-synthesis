import * as escodegen from "escodegen";
import * as esprima from "esprima";
import * as estree from "estree";

let traverse = require("ast-traverse");

/**
 * During instrumentation, function names cannot in general be traced to how they can be called, for example in the case of deeply nested fields, or aliasing.
 * Process the AST before loading the module, and tag each function declaration with a distinct index. These indexes can be correlated for dynamic analysis.
 */
export class FunctionTagger {

    // Maintains the index of the last tag, and also maps tags to the file where the function occurs.
    private tags: string[] = [];

    tagFunctions(source: string, sourceFile: string) {
        let ast = esprima.parse(source);
        traverse(ast, {
            post: (node: estree.Node) => {
                if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
                    tag(node.body, this.tags.length);
                    this.tags.push(sourceFile);
                }
            }
        });

        return escodegen.generate(ast);
    }

    sourceFileForTag(tag: number) {
        return this.tags[tag];
    }
}

function tag(node: estree.BlockStatement, seqNo: number) {
    node.body.unshift({
        type: "ExpressionStatement",
        expression: {
            type: "UnaryExpression",
            operator: "void",
            argument: {
                type: "Literal",
                value: `id=${seqNo}`,
                raw: `"id=${seqNo}"`
            },
            "prefix": true
        }
    });
}