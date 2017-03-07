# JS-to-TS-Synthesis Pipeline

This utility provides an easy way to generate (partial) type definitions for an existing javascript library.

## Motivation

TypeScript is a new variant of JavaScript that adds *optional* static types. Type annotations in TS can
make programming in JavaScript feel much more productive and less error prone. But to use an
off-the-shelf JS library in your TS project, you currently need to write the typing annotations by hand.
This can be a painful process: you have to understand how a library works and cook up a new design for
its types from scratch.
The goal of this project is to generate these typing shims automatically. It would work by running the
library’s test suite while observing its inputs and outputs.

## How to Run

```
npm install https://github.com/cucapra/js-to-ts-synthesis
npm run build
bin/ts-pipeline.js --repo (path to repo) --dir (the working directory)
```

The pipeline will clone the repo into the working directory and instrument its tests. Using the information from the library's inputs and outputs, it will generate a .d.ts definition file next to every library function.
Furthermore, a test file will be generated that captures the type deducer's picture of each function's input and output space. To see more options, run `bin/ts-pipeline.js --help`.

More to come...