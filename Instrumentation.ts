import { transformFileSync } from "babel-core";
import * as fs from "fs";
import * as path from "path";
import {allTags, FunctionInfo, FunctionsMap} from "./Module";
import {tagFunctions} from "./TagFunctions";

let Aran = require("aran");
let js_beautify = require("js-beautify").js_beautify;

let TAG_CODE = fs.readFileSync(path.join(__dirname, "instrumentation", "tag.js"), "utf-8");
let INSTRUMENTATION_CODE = fs.readFileSync(path.join(__dirname, "instrumentation", "hooks.js"), "utf-8");

function injectAran(sourceFile: string): string {
    // Aran struggles with const expressions for some reason. Use babel to get rid of those.
    // Also gives us a smaller subset of JS to work with.
    let source = transformFileSync(sourceFile, {presets: ["env"]}).code;

    // Clean up the js to ease with debugging.
    return js_beautify(Aran({namespace: "_meta_", traps: ["apply", "return"]}).instrument(source));
}

export function injectInstrumentation(sourceFile: string) {
    let source = injectAran(sourceFile);
    source = tagFunctions(source);

    fs.writeFileSync(sourceFile, source);
}

export function injectInstrumentationForTest(sourceFile: string, instrumentationOutputFile: string, exportedFunctions: FunctionsMap<FunctionInfo>) {
    let source = injectAran(sourceFile);

    source =
`
var instrumentationOutputFile = '${instrumentationOutputFile}';
var exportedFunctions = ${JSON.stringify(allTags(exportedFunctions))};
${TAG_CODE}
${INSTRUMENTATION_CODE}
${source}
`;

    fs.writeFileSync(sourceFile, source);
}


