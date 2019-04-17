const loaderUtils = require('loader-utils');
// const path = require('path');

module.exports = async function dependencyOrderLoader (_input, inputMap) {
	if (this.cacheable) {
		this.cacheable();
	}

	const callback = this.async();

	const { type } = loaderUtils.parseQuery(this.resourceQuery);

	// NOTE: Add dependency on everything.
	// We could add specific dependencies, but the actual code also globs wildcard files,
	// which we cannot add as a future dependency.
	this.addContextDependency(this.rootContext);
	// Effect:
	// this.addContextDependency(path.join(this.rootContext, 'base-packages'));
	// this.addContextDependency(path.join(this.rootContext, 'override-packages'));

	// console.log('BUILDING GENERATED', type);

	let code;
	switch (type) {
		case 'magic':
			code = '// Normally we import and execute from glob matches here.';
			break;
		default:
			callback(new Error(`Unsupported type ${type}.`));
	}

	callback(null, code, inputMap);
};
