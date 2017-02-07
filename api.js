'use strict';
const fs = require('fs');
const os = require('os');

const chalk = require('chalk');
const npmName = require('npm-name');
const pify = require('pify');
const recast = require('recast');

const fileName = `${os.homedir()}/.hyper.js`;
const oldConf = `${os.homedir()}/.hyperterm.js`;

let fileContents;
let parsedFile;
let plugins;
let localPlugins;

try {
	// TODO: Add ability to read from `oldConf` as well, assuming support is wanted
	fileContents = fs.readFileSync(fileName, 'utf8');

	// Parse this file into a Recast AST called `parsedFile`
	parsedFile = recast.parse(fileContents);

	// From this parsed file, get the actual relevant information from the AST to get information from the file
	// Any variable that directly is linked to parsedFile will modify parsedFile (IE: Modifying plugins will change it)
	const expression = parsedFile.program.body[0].expression;
	const properties = (expression && expression.right && expression.right.properties) || [];

	/*
	Grab a list of installed program `plugins` and `localPlugins`:
	`plugins` are plugins on npm that can update.
	`localPlugins` are plugins locally installed. May not update.
	 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	`Array.find` returns first item to match function's `True` state
	In this case, it will return the AST in the list of `properties` that matches each type of plugin.
	From here, we will get a list of the value elements of each.
	*/
	plugins = properties.find(property => {
		return property.key.name === 'plugins';
	}).value.elements;

	localPlugins = properties.find(property => {
		return property.key.name === 'localPlugins';
	}).value.elements;
} catch (err) {
	// ENOENT === !exists()
	// Perhaps, but it does not:
	// a) Check to see if oldConf exists
	// b) Shoot off proper error message
	// TODO: Check to see if fileName or oldConf exists(), assuming oldConf support NOT wanted
	if (err.code !== 'ENOENT') {
		throw err;
	}
}

function exists() {
	// The following tests to see if `oldConf` file exists, if it does; throw a warning.
	if (fs.existsSync(oldConf)) {
		// TODO: Add specific warning for old config file
		console.log(chalk.yellow(`Warning: ${oldConf} should be ${fileName}`));
	}
	return fileContents !== undefined;
}

function isInstalled(plugin, locally) {
	// While I know that :101 covers whether or not to search for npm plugins, I believe that it would be best to
	// search both `localPlugins` and `plugins` for installed modules. While you could pass where to search, by default
	// it would search both. This should not add any major computation time and will allow code reuse and functionality
	// TODO: Modify function to search both local and global if `locally` is null
	const array = locally ? localPlugins : plugins; // If locally, then array = localPlugins
	if (array && Array.isArray(array)) { // If array exists and is in fact an array
		const index = array.findIndex(entry => entry.value === plugin); // Find index of plugin in array plugin
		return index.valueOf == -1 ? false: index; // Return false if index is -1. This is due to how findIndex works
	}
	return false;
}

function save() {
	// Saves `parsedFile` to `fileName`. Again, if any changes were made to plugins or localPlugins, they'll be in this
	return pify(fs.writeFile)(fileName, recast.print(parsedFile).code, 'utf8');
}

function existsOnNpm(plugin) {
	plugin = plugin.split('#')[0];
	return npmName(plugin).then(available => {
		if (available) {
			const err = new Error(`${plugin} not found on npm`);
			err.code = 'NOT_FOUND_ON_NPM';
			throw err;
		}
	});
}

function install(plugin, locally) {
	const array = locally ? localPlugins : plugins; // If locally, then array = localPlugins
	return new Promise((resolve, reject) => {
		existsOnNpm(plugin).then(() => {
			if (!isInstalled(plugin, locally)) {
				return reject(`${plugin} is already installed`);
			}

			// Convert text `plugin` to match AST literal to push back to array
			array.push(recast.types.builders.literal(plugin));
			save().then(resolve).catch(err => reject(err));
		}).catch(err => {
			if (err.code === 'NOT_FOUND_ON_NPM') {
				reject(err.message);
			} else {
				reject(err);
			}
		});
	});
}

function uninstall(plugin) {
	// This currently does not uninstall locally installed plugins.
	// TODO: Allow uninstall of local plugins.
	return new Promise((resolve, reject) => {
		// Sees if plugin resides in array. If it is, the index of the item is returned, else false is returned
		const index = isInstalled(plugin);
		if (!index) {
			return reject(`${plugin} is not installed`);
		}

		// Remove item from index
		plugins.splice(index, 1);
		// Saves the unmodified file
		save().then(resolve).catch(err => reject(err));
	});
}

function list() {
	// TODO: Does not currently list
	if (Array.isArray(plugins)) {
		return plugins.map(plugin => plugin.value).join('\n');
	}
	return false;
}

module.exports.exists = exists;
module.exports.existsOnNpm = existsOnNpm;
module.exports.isInstalled = isInstalled;
module.exports.install = install;
module.exports.uninstall = uninstall;
module.exports.list = list;
