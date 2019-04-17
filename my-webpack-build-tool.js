#! /usr/bin/env node

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackDevServer = require('webpack-dev-server');

const contextPath = process.cwd();

const DISABLE_CACHE = process.argv.includes('--disable-cache') || process.env.DISABLE_CACHE;
const WITH_DEPENDENCY_LOADER = process.argv.includes('--with-dependency-loader') || process.env.WITH_DEPENDENCY_LOADER;
const MUTATION_DELAY = 2000;

console.warn('Cache            :', DISABLE_CACHE ? 'disabled' : 'enabled');
console.warn('Dependency plugin:', !WITH_DEPENDENCY_LOADER ? 'disabled' : 'enabled');
console.warn('Mutation delay   :', MUTATION_DELAY);

const webpackConfig = {
	context: contextPath,
	entry: path.join(__dirname, 'src', 'app-entry.js'),
	devtool: 'eval-source-map',
	mode: 'development',
	output: {
		filename: 'main.js',
		path: path.resolve(contextPath, 'dist')
	},
	module: {
		rules: !WITH_DEPENDENCY_LOADER ? [] : [
			{
				test: [path.resolve(__dirname, 'src', 'generated')],
				use: [{
					loader: path.resolve(__dirname, 'src', 'generatedLoader.js')
				}]
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Webpack module override'
		})
	],
	resolve: {
		modules: [
			path.join(contextPath, 'override-packages'),
			path.join(contextPath, 'base-packages')
		]
	}
};

const webpackDevServerConfig = {
	contentBase: path.resolve(contextPath, 'dist'),
	hot: false,
	inline: false,
	overlay: {
		errors: true,
		warnings: true
	},
	stats: {
		assets: false,
		builtAt: false,
		cached: true,
		cachedAssets: true,
		children: false,
		colors: true,
		entrypoints: false,
		errorDetails: true,
		errors: true,
		hash: false,
		moduleTrace: true,
		modules: true,
		warnings: true
	}
};

if (DISABLE_CACHE) {
	webpackConfig.cache = false;
	webpackConfig.resolve.unsafeCache = false;
}

// Cleanup
fs.removeSync(path.join(contextPath, 'override-packages', 'package1'));

// Start webpack-dev-server
const compiler = webpack(webpackConfig);
const server = new WebpackDevServer(compiler, webpackDevServerConfig);
server.listen(8080);

// Perform mutations to reproduce issue.

async function checkBuild (modules, shouldBeFromOverride) {
	const getMessageModules = modules.filter(module => module.id.endsWith('package1/src/getMessage.js'));
	const getMessageEsmModules = modules.filter(module => module.id.endsWith('package1/src/getMessageEsm.js'));

	assert.strictEqual(getMessageModules.length, 1);
	const getMessagesIsFromOverride = getMessageModules[0].source.includes(' OVERRIDE ');
	const getMessagesColor = getMessagesIsFromOverride === shouldBeFromOverride ? '\x1b[32m' : '\x1b[31m';
	console.warn(`${getMessagesColor}    getMessages was ${getMessagesIsFromOverride ? '' : 'not '}overridden\x1b[0m`);

	assert.strictEqual(getMessageEsmModules.length, 1);
	const getMessagesEsmIsFromOverride = getMessageEsmModules[0].source.includes(' OVERRIDE ');
	const getMessagesEsmColor = getMessagesEsmIsFromOverride === shouldBeFromOverride ? '\x1b[32m' : '\x1b[31m';
	console.warn(`${getMessagesEsmColor}    getMessagesEsm was ${getMessagesEsmIsFromOverride ? '' : 'not '}overridden\x1b[0m`);
}

async function mutation_removeOverridePackage () {
	console.warn('Removing override package...');

	// Remove the override package.
	await fs.remove(path.join(contextPath, 'override-packages', 'package1'));
	console.warn('Override package has been removed.');

	setTimeout(async () => {
		console.warn('\n\nChecking build...');
		// Get the modules of the latest build.
		const modules = server._stats.toJson({ all: true }).modules;
		checkBuild(modules, false);

		console.warn('\n\nAll done. Two recompiles should have been triggered. But were they? Is everything \x1b[32mgreen\x1b[0m?');
		server.close();
	}, MUTATION_DELAY);
}

async function mutation_addOverridePackage () {
	console.warn('Adding override package...');

	// Create the override package.
	const getMessage = await fs.readFile(
		path.join(contextPath, 'base-packages', 'package1', 'src', 'getMessage.js'),
		'utf8');
	await fs.outputFile(
		path.join(contextPath, 'override-packages', 'package1', 'src', 'getMessage.js'),
		getMessage.replace(' base ', ' OVERRIDE '));

	const getMessageEsm = await fs.readFile(
		path.join(contextPath, 'base-packages', 'package1', 'src', 'getMessageEsm.js'),
		'utf8');
	await fs.outputFile(
		path.join(contextPath, 'override-packages', 'package1', 'src', 'getMessageEsm.js'),
		getMessageEsm.replace(' base ', ' OVERRIDE '));
	console.warn('Override package has been added.');

	// Next step
	setTimeout(() => {
		console.warn('\n\nChecking build...');
		// Get the modules of the latest build.
		const modules = server._stats.toJson({ all: true }).modules;
		checkBuild(modules, true);

		console.warn('\n\nRemoving override package in 2 seconds...');
		setTimeout(mutation_removeOverridePackage, MUTATION_DELAY);
	}, MUTATION_DELAY);
}

(function performMutations () {
	setTimeout(() => {
		console.warn('\n\nAdding override package in 2 seconds...');
		setTimeout(mutation_addOverridePackage, MUTATION_DELAY);
	}, MUTATION_DELAY);
})();
