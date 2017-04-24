# Design Goals

This document explains the various design goals of the JS-to-TS-Synthesis Pipeline. Although the tool is designed to be runnable on as many projects as possible, several assumptions must be made as far as the library's consistence and test suite.

## Motivation

TypeScript is a new variant of JavaScript that adds *optional* static types. Type annotations in TS can make programming in JavaScript feel much more productive and less error prone. But to use an off-the-shelf JS library in your TS project, you currently need to write the typing annotations by hand. This can be a painful process: you have to understand how a library works and cook up a new design for its types from scratch. The goal of this project is to generate these typing shims automatically. It would work by running the library’s test suite while observing its inputs and outputs.

## Restrictions

The purpose of this project is to generate types for functions based on an almost (with the exception of the `UpperBoundTypeDeducer` completely black-box approach to analysis. For this reason, the tool assumes that the tests are complete with the shape of the data they pass in. This means that if a function accepts only certain values (for example, `"GET"` and `"POST"` for an HTTP client), all of these values will be passed to the function in some test. If the library also supported `"PUT"` for instance, but no test provided that value, no black box approach can figure out that missing value. Similarly, if the function accepts an optional `options` argument, but no test ever provides it, that parameter will not get a meaningful type (it will still show in the definition, if it is a named argument), unless the --roundUpArgsFromBottom flag is provided and the `SimpleTypeDeducer` can try out different values for `options` -- and even then, the actual fields for that argument will not be found). Therefore, it is critical that any library that is processed by this tool have adequate tests for its API.

A second requirement for the `SimpleTypeDeducer` comes from its use of a validator to try out new values and ensure the function can still accept them. For this to be meaningful, the function must have some way to either explicitly refuse invalid outputs (for example, by running a `typeof` check at the beginning of every function) or fail indirectly (by a `TypeError: Cannot read property 'x' of undefined`, for example). If a function accepts invalid outputs and still returns an incorrect value, the validator will falsely assume that call was successful. For example, the following function will not be properly validated:

```javascript
// Given an object with two fields, x and y, return the sum of the "x" and "y" fields.
function addXAndY(obj o) {
    return o.x + o.y;
}
```

The validator will see that `addXAndY({x: 2, y: 3})` will return successfully, but so will `addXAndY({})` (due to Javascript's weak typing, this will add `undefined` and `undefined`, which is allowed and returns `NaN`), `addXAndY({x: "hi", y: "bye"})` (since applying `+` to two strings will concatenate them), and `addXAndY(1)` (due to autoboxing of primitive values) -- all unexpected behaviors. A safer way to write this function would be to have

```javascript
function addXAndY(obj o) /* improved */ {
    if (typeof o !== "object" || typeof o.x !== "number" || typeof o.y !== "number")
        throw TypeError("Bad argument");
    return o.x + o.y;
}
```

In the "improved" version, the `TypeError` would correctly indicate to the validator that an argument was of the wrong type. Setting --treatAllErrorsAsTypeErrors to true relaxes this restriction, and any error would indicate to the validator that an argument in invalid.

A future improvement of this tool might be able to capture when `o.x` and `o.y` are added, and they're not both strings or numbers. However, this may make the tool less compatible with libraries that take advantage of weak typing, and rely on the fact that `"3"-2 = 1` in their implementation.

In addition, for the validator to make any sense, the library must have calls which are repeatable. That is, if `f` is called twice with arguments `arg1,...,argN`, it will fail (ie throw a TypeError) the second time if and only if it had failed the first time. For example, the following is not allowed, and will only confuse the validator.

```javascript
var c = 0;
function f(n) {
    c+=n;
    if (c>10) throw TypeError();
}
```

We hope that these restrictions, while required in a black-box setting, do not severely limit which libraries can benefit from this tool.