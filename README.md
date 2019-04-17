# webpack-module-override

Reproducible case for override packages not being detected.

## Instructions
* Clone
* Run `npm install`
* `cd app`

## Instructions (Case 1)
This case does not trigger any rebuild.
* Run `node ../my-webpack-build-tool.js`
* Observe that NOTE all four checks are green
* Run `node ../my-webpack-build-tool.js --disable-cache`
* Observe that NOT all four checks are green

## Instructions (Case 2)
This case does trigger rebuilds, due to a loader which has a context dependency on the whole context.
* Run `node ../my-webpack-build-tool.js --with-dependency-loader`
* Observe that NOT all four checks are green
* Run `node ../my-webpack-build-tool.js --with-dependency-loader --disable-cache`
* Observe that all four checks ARE green
