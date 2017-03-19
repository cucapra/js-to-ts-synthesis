import * as esprima from "esprima";
import {FunctionExpression} from "estree";

export interface ArgDef {
    name: string;
    typeofChecks: {"===": string[], "!==": string[]};
}

function rev(op: "==="|"!=="): "==="|"!==" {
    return (op === "===") ? "!==" : "===";
}

function typeofChecks(node: FunctionExpression): {[name: string]: {"===": string[], "!==": string[]}} {

    // This is pretty restrictive for now.
    // Assumptions:
    // 1) typeof checks always occur at the top of the function.
    // 2) typeof checks on the argument itself, not any aliases

    let result: {[name: string]: {"===": string[], "!==": string[]}} = {};

    for (let s of node.body.body){
        if (s.type !== "IfStatement")
            break; // Have to stop here. Aliasing could cause this to be incorrect.

        if (s.test.type === "BinaryExpression"
            && (s.test.operator === "===" || s.test.operator === "!==")
            && s.test.left.type === "UnaryExpression"
            && s.test.left.operator === "typeof"
            && s.test.left.argument.type === "Identifier"
            && s.test.right.type === "Literal"
            && typeof s.test.right.value === "string") {

                if (!(s.test.left.argument.name in result))
                    result[s.test.left.argument.name] = {"===": [], "!==": []};

                result[s.test.left.argument.name][rev(s.test.operator)].push(s.test.right.value);
        }
    }

    return result;
}

export function argDefs(fct: Function): ArgDef[] {
    let node = esprima.parse(`(${fct.toString()})`).body[0];
    if (node.type !== "ExpressionStatement")
        throw new Error(`Top-level node ${node.type} not ExpressionStatement`);
    if (node.expression.type !== "FunctionExpression")
        throw new Error(`Expression node ${node.expression.type} not FunctionExpression`);

    let argDefs: ArgDef[] = [];
    let typeofChecksByParam = typeofChecks(node.expression);

    for (let param of node.expression.params){
        if (param.type === "Identifier")
            argDefs.push({name: param.name, typeofChecks: typeofChecksByParam[param.name] || {"===": [], "!==": []}});
    }

    return argDefs;
}