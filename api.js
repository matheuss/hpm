'use strict';
const fs = require('fs');
const os = require('os');

const chalk = require('chalk');
const npmName = require('npm-name');
const pify = require('pify');
const recast = require('recast');

const fileName = `${os.homedir()}/.hyper.js`;
const oldConf = `${os.homedir()}/.hyperterm.js`;

// normalizeArrayOfStrings = function item {}
// `default` assumes 'Literal'. This will return the string of the item
const normalizeArrayOfStrings = item => {
	let value;
	switch (item.type) {
		case 'TemplateLiteral':
			value = item.quasis[0].value.raw;
			break;
		default :
			value = item.value;
	}
	return {value};
};

let fileContents;
let parsedFile;
let plugins;
let localPlugins;

try {
	fileContents = fs.readFileSync(fileName, 'utf8');

	parsedFile = recast.parse(fileContents);

	// Grab a list of installed program `plugins` and `localPlugins`:
	// `plugins` are plugins on npm that can update.
	// `localPlugins` are plugins locally installed. May not update.
	const expression = parsedFile.program.body[0].expression;
	const properties = (expression && expression.right && expression.right.properties) || [];
	// `Array.find` works by returning first item to match function's `True` state
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
	// `plugins` becomes an array of strings for installed Hyper plugins
	plugins = properties.find(property => {
		return property.key.name === 'plugins';
	}).value.elements.map(normalizeArrayOfStrings);

	// See above
	localPlugins = properties.find(property => {
		return property.key.name === 'localPlugins';
	}).value.elements.map(normalizeArrayOfStrings);
} catch (err) {
	// ENOENT === !exists()
	// Perhaps, but it does not:
	// a) Check to see if oldConf exists
	// b) Shoot off proper error message
	// TODO: Check to see if fileName or oldConf exists()
	if (err.code !== 'ENOENT') {
		throw err;
	}
}

function exists() {
	// The following tests to see if `oldConf` file exists, and nothing more
	// TODO: Check to see if fileName exists
	if (fs.existsSync(oldConf)) {
		// TODO: Add specific warning for old config file
		console.log(chalk.yellow(`Warning: ${oldConf} should be ${fileName}`));
	}
	return fileContents !== undefined;
}

function isInstalled(plugin, locally) {
	// TODO: Modify function to search both local and global if `locally` is null
	// While I know that :101 covers whether or not to search for npm plugins, I believe that it would be best to
	// search both `localPlugins` and `plugins` for installed modules. While you could pass where to search, by default
	// it would search both. This should not add any major computation time and will allow code reuse and functionality
	const array = locally ? localPlugins : plugins; // If locally, then array = localPlugins
	if (array && Array.isArray(array)) { // If array exists and is in fact an array
		return array.find(entry => entry.value === plugin) !== undefined; // Find plugin in array's value
	}
	return false;
}

function save() {
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
			if (isInstalled(plugin, locally)) {
				return reject(`${plugin} is already installed`);
			}

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
	return new Promise((resolve, reject) => {
		if (!isInstalled(plugin)) {
			return reject(`${plugin} is not installed`);
		}

		const index = plugins.findIndex(entry => entry.value === plugin);
		plugins.splice(index, 1);
		save().then(resolve).catch(err => reject(err));
	});
}

function list() {
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
