import * as path from "path";

export function testOutputFile(name: string) {
    return path.join(__dirname, "test_output", name);
}