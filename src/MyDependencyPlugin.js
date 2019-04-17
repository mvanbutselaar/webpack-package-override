'use strict';

const cTable = require('console.table');
const path = require('path');

function MyDependencyPlugin (_options) {

}

function stripAppPath (filePath) {
	return path.relative(process.cwd(), filePath);
}

function printMtimes (mtimes) {
	const now = Date.now();
	const rows = Object.keys(mtimes).map(file => {
		const mtime = mtimes[file];
		return {
			file: stripAppPath(file),
			mtime,
			mtimeDate: new Date(mtime).toISOString().split('T')[1],
			age: (now - mtime) + 'ms'
		};
	});

	console.table(rows);
}

MyDependencyPlugin.prototype.apply = function (compiler) {
	console.log('MyDependencyPlugin', 'apply');

	compiler.plugin('after-compile', function (compilation, callback) {
		console.log('MyDependencyPlugin', 'after-compile');
		callback();
	});

	compiler.plugin('compilation', function (compilation) {
		console.log('MyDependencyPlugin', 'compilation');
	});

	compiler.plugin('make', function (compilation, callback) {
		console.log('MyDependencyPlugin', 'make');
		callback();
	});

	// NOTES:
	// the NormalModule.needRebuild checks its buildInfo.fileDependencies and this.buildInfo.contextDependencies
	// Which were set by the NormalModule.doBuild which used the runLoaders in which the deps were added.
	// This triggers rebuild. But not yet from the correct source.
	// QUESTION 1: Do they contain dependencies on imports?
	// QUERTION 2: And if so. What happens when we add the override versions as deps?
	// QUERTION 3: What is this.parser? (Where this is a NormalModule)
	// ANSWER 1: They do not contain dependencies on imports.
	// ANSWER 2: ???
	// ANSWER 3: ???
	//
	// What's next?!?! Find every module which has a dependency on it
	//
	// In handleParseResult in NormalModule, the import's are set (this.dependencies). But these are not fileDependencies.
	// Can we add them as dependencies? But only when needed? (Maybe from other package locations, and clean and update when that switches?)
	// Eventually this does the callback, which originates from the Compilation.buildModule call
	// QUESTION 1: Is compiler.rebuildModule useful?
	// QUESTION 2: Can we do something in the compilation buildModule hook?
	// QUESTION 3: Can we do something in the compilation succeedModule/failedModule hook, and add fileDependencies on all module.dependencies? (For all package paths?)
	// QUESTION 4: Can we replace the module.dependencies with copies, so it won't be gotten from the cache?
	//             (Do we need to do cache cleanup? Maybe not, is WeakMap)
	//             NOTE: these deps are checked in NormalModuleFactory.create.
	// ANSWER 1: ???
	// ANSWER 2: ???
	// ANSWER 3: ???
	//
	// Could set compilation.fileTimestamps/contextTimestamps to old timestamp to force rebuild of module (when the module depends on overridden package)
	//

	compiler.plugin('invalid', function (fileName, changeTime) {
		console.log('MyDependencyPlugin', 'invalid', fileName, changeTime);

		debugger;

		// TODO: Maybe invalidate every file which has a dependency/import on this file?
		//       And maybe also on everything which has a dependency on the package of the same name,
		//       but in a different location?
	});

	compiler.plugin('watch-run', function (compiler, callback) {
		console.log('MyDependencyPlugin', 'watch-run');
		// console.log(compiler.watchFileSystem.watcher.mtimes);
		printMtimes(compiler.watchFileSystem.watcher.mtimes);
		// const changes = compiler.watchFileSystem.watcher.aggregatedChanges;
		// const removals = compiler.watchFileSystem.watcher.aggregatedRemovals;
		// console.log('watcher', changes, removals);

		// TODO: Test if we can change all entries in compilation.fileTimestamps which should be rebuild?

		// TODO: Can we do stuff based on this information?
		// Maybe invalidate all already build/cached things which start with all keys of mtimes?
		callback();
	});




	compiler.plugin('thisCompilation', function (compilation) {
		console.log('MyDependencyPlugin', 'thisCompilation');

		// succeedModule / failedModule
		compilation.hooks.succeedModule.tap('test', function (module) {
			// module.request.endsWith('app-entry.js') && console.log('succeedModule', module);

			// TODO: Test if we can change the dependencies to a clone of them, when they match the mtimes from watchRun.
			// compiler.watchFileSystem.watcher.mtimes
			// const changedFiles = compiler.watchFileSystem.watcher.mtimes;
			// const changedFiles = compiler.fileTimestamps;
			// const changedContext = compiler.contextTimestamps;
			const removedFiles = compiler.removedFiles;
			console.log('BLAAT', /*changedFiles, changedContext,*/ removedFiles); // TODO: Why is removed files incorrect?

			// TODO: How to get actual list of changedFiles from compiler.fileTimestamps???
			// See CachePlugin?

			// TODO: Can we do something with this?
			// console.log(compilation.cache);
			// compiler._lastCompilationFileDependencies
			// compilation.fileDependencies (afterCompile?)
			// compilation.compilationDependencies
			// console.log('');
			// console.log('');
			// console.log('');
			// console.log('');
			// console.log('');
			// console.log(compilation.compilationDependencies);


			/*
			* This adds dependencies on all possible locations for all imports done in a file.
			*
			* Effect: This rebuilds app-entry when package1 is added/removed to/from override-packages.
			*         But it does not change which one is used (base vs override).
			*/
			const imports = new Set();
			module.dependencies.forEach(dependency => {
				if (dependency && dependency.request) {
					imports.add(dependency.request);
				}
			});
			const resolvedImports = [];
			imports.forEach(importPath => {
				['override-packages', 'base-packages'].forEach(packagePath => {
					const fileDependency = path.join(process.cwd(), packagePath, importPath);
					resolvedImports.push(fileDependency);
					module.buildInfo.fileDependencies.add(fileDependency);
				});
			});
			console.log(stripAppPath(module.request), resolvedImports);
		});

		// compilation.hooks.addEntry.tap('test', function (entry, name) {
		// 	console.log('addEntry', entry, name);
		// });

		// succeedEntry / failedEntry
		// compilation.hooks.succeedEntry.tap('test', function (entry, name, module) {
		// 	module.request.endsWith('app-entry.js') && console.log('succeedEntry', entry, 'NAME', name);
		// });
	});


};

module.exports = MyDependencyPlugin;
