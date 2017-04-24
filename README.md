# JS-to-TS-Synthesis Pipeline

This utility provides an easy way to generate (partial) type definitions for an existing javascript library.

## How to Run

```
npm install https://github.com/cucapra/js-to-ts-synthesis
npm run build
bin/ts-pipeline.js --repo (path to repo) --dir (the working directory)
```

The pipeline will clone the repo into the working directory and instrument its tests. Using the information from the library's inputs and outputs, it will generate a .d.ts definition file next to every library function.
Furthermore, a test file will be generated that captures the type deducer's picture of each function's input and output space. To see more options, run `bin/ts-pipeline.js --help`.

For more information, see

[Design Goals](docs/DesignGoals.md)

[Pipeline Overview](docs/Overview.md)

[Heuristics](docs/Heuristics.md)