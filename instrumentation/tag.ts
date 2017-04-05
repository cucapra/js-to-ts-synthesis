import * as esprima from "esprima";
import * as estree from "estree";

export function tagFor(fct: Function): number | undefined {
    let node: estree.Statement | estree.ModuleDeclaration;
    try {
        node = esprima.parse(`(${fct.toString()})`).body[0];
    }
    catch (e) {
        return undefined; // Fail gracefully.
    }

    if (node.type === "ExpressionStatement"
        && node.expression.type === "FunctionExpression") {

            let functionNode = node.expression.body.body[0];
            if (functionNode.type === "ExpressionStatement"
                && functionNode.expression.type === "UnaryExpression"
                && functionNode.expression.operator === "void"
                && functionNode.expression.argument.type === "Literal"
                && typeof (functionNode.expression.argument.value) === "string"
                && functionNode.expression.argument.value.indexOf("id=") === 0) {

                    return parseInt(functionNode.expression.argument.value.substr(3));
            }
    }

    return undefined;
}