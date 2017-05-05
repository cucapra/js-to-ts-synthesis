#!/bin/sh -
# Analyze a few modules to see how their generated types look.
cd $(dirname $0)
set -x

# Simple library with just one function, works pretty well. No type definition to compare with.
../bin/ts-pipeline.js --repo https://github.com/IonicaBizau/git-url-parse --dir analyze_results/git-url-parse > git-url-parse.log 2>&1

# Slightly more complex, with meaningfully predicted input and output types. Need  --treatAllErrorsAsTypeErrors.
# Compare: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/simple-oauth2/index.d.ts
../bin/ts-pipeline.js --repo https://github.com/lelylan/simple-oauth2 --dir analyze_results/simple-oauth2 --treatAllErrorsAsTypeErrors true > simple-oauth2.log 2>&1
