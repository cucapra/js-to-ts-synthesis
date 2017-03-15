import {FunctionDeclaration} from "estree";

export type TypeofChecks = {[name: string]: {"===": string[], "!==": string[]}};

export function typeofChecks(node: FunctionDeclaration): TypeofChecks {

    // This is pretty restrictive for now.
    // Assumptions:
    // 1) typeof checks always occur at the top of the function.
    // 2) typeof checks on the argument itself, not any aliases

    let result: TypeofChecks = {};

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

                result[s.test.left.argument.name][s.test.operator].push(s.test.right.value);
        }
    }

    return result;
}