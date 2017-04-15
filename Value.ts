function isNull(value: {}): value is null {
    return value === null;
}

// A switch statement on the typeof doesn't seem to work.
export function handle<T>(value: {}, target: {
    null(value: null): T,
    undefined(value: undefined): T,
    boolean(value: boolean): T,
    number(value: number): T,
    string(value: string): T,
    function(value: Function): T,
    array(value: {}[]): T,
    object(value: {[k: string]: {}}): T
}): T {
    if (isNull(value))
        return target.null(value);
    if (typeof value === "undefined")
        return target.undefined(value);
    if (typeof value === "boolean")
        return target.boolean(value);
    if (typeof value === "number")
        return target.number(value);
    if (typeof value === "string")
        return target.string(value);
    if (typeof value === "function")
        return target.function(value);
    if (typeof value === "object")
        return Array.isArray(value) ? target.array(value) : target.object(value);
    throw new Error(`Cannot convert ${typeof value}: ${value}`);
}