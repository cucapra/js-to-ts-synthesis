import * as path from "path";
import * as fs from "fs";

export function testOutputFile(name: string) {
    return path.join(__dirname, "test_output", name);
}