import * as path from "path";

export function parameters(name: string) {
    return {roundUpParameters: {roundUpFromBottom: false}, folderToWriteDebugging: path.join(__dirname, "test_output", name), generateImageForTypeRounding: true};
}