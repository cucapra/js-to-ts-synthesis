import * as path from "path";
import * as resolve from "resolve";

type RestoreOriginalModuleLoader = () => void;
type OverrideRequire = (isOverride: (request: string) => boolean) => RestoreOriginalModuleLoader;

let overrideRequire: OverrideRequire = require("override-require");

/**
 * Require a module and transitively determine which scripts are required in the process.
 * When an internal include (not an external module dependency) is required, call the callback function.
 * (For instrumentation, requires will not be tracked while the preRequireInternalModule is running).
 */
export function trackRequires(directory: string, mainFile: string, preRequireInternalModule: (filename: string) => void) {
    let paused = false;
    let restore = overrideRequire(request => {
        if (!paused) {
            let path: string;
            try {
                 path = resolve.sync(request, {basedir: directory});
            }
            catch (e) {
                // Probably a requires outside of the library.
                return false;
            }
            if (!resolve.isCore(path) && path.indexOf("/node_modules/") === -1 /* Not a module*/) {
                paused = true;
                preRequireInternalModule(path);
                paused = false;
            }
        }
        return false;
    });

    let required = require(path.join(directory, mainFile));
    restore();

    return required;
}