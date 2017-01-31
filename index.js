#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');

const args = require('args');
const chalk = require('chalk');
const columnify = require('columnify');
const execa = require('execa');
const fileExists = require('file-exists');
const got = require('got');
const pify = require('pify');
const opn = require('opn');
const ora = require('ora');
const updateNotifier = require('update-notifier');

const api = require('./api');
const pkg = require('./package');

updateNotifier({pkg}).notify();

if (!api.exists()) {
	let msg = chalk.red('You don\'t have Hyper.app installed! :(\n');
	msg += `${chalk.red('You are missing')} ${chalk.green('awesomeness')}`;
	msg += chalk.red(`.\n`);
	msg += chalk.green('Check it out: https://hyper.is/');
	console.error(msg);
	process.exit(1);
}

args.command(['i', 'install'], 'Install a plugin', (name, args) => {
	const plugin = args[0];
	return api.install(plugin)
		.then(() => console.log(chalk.green(`${plugin} installed successfully!`)))
		.catch(err => console.error(chalk.red(err)));
});

args.command(['u', 'uninstall', 'rm', 'remove'], 'Uninstall a plugin', (name, args) => {
	const plugin = args[0];
	return api.uninstall(plugin)
		.then(() => console.log(chalk.green(`${plugin} uninstalled successfully!`)))
		.catch(err => console.log(chalk.red(err)));
});

args.command(['ls', 'list'], 'List installed plugins', () => {
	let plugins = api.list();

	if (plugins) {
		console.log(plugins);
	} else {
		console.log(chalk.red(`No plugins installed yet.`));
	}
	process.exit(1);
});

const lsRemote = () => { // note that no errors are catched by this function
	const URL = 'http://registry.npmjs.org/-/_view/byKeyword?startkey=[%22hyperterm%22,%22hyper%22]&endkey=[%22hyperterm%22,{}]&group_level=4';
	return got(URL)
		.then(response => JSON.parse(response.body).rows)
		.then(entries => entries.map(entry => entry.key))
		.then(entries => entries.map(entry => {
			return {name: entry[1], description: entry[2]};
		}))
		.then(entries => entries.map(entry => {
			entry.name = chalk.green(entry.name);
			return entry;
		}));
};

args.command(['s', 'search'], 'Search for plugins on npm', (name, args) => {
	const spinner = ora('Searching').start();
	const query = args[0] ? args[0].toLowerCase() : '';

	return lsRemote()
		.then(entries => {
			return entries.filter(entry => {
				return entry.name.indexOf(query) !== -1 ||
					 (entry.description &&  entry.description.toLowerCase().indexOf(query) !== -1);
			});
		})
		.then(entries => {
			if (entries.length === 0) {
				spinner.fail();
				console.error(chalk.red(`Your search '${query}' did not match any plugins`));
				console.error(`${chalk.red('Try')} ${chalk.green('hpm ls-remote')}`);
				process.exit(1);
			} else {
				let msg = columnify(entries);
				spinner.succeed();
				msg = msg.substring(msg.indexOf('\n') + 1); // remove header
				console.log(msg);
			}
		}).catch(err => {
			spinner.fail();
			console.error(chalk.red(err)); // TODO
		});
});

args.command(['lsr', 'list-remote', 'ls-remote'], 'List plugins available on npm', () => {
	const spinner = ora('Searching').start();

	return lsRemote()
		.then(entries => {
			let msg = columnify(entries);

			spinner.succeed();
			msg = msg.substring(msg.indexOf('\n') + 1); // remove header
			console.log(msg);
		}).catch(err => {
			spinner.fail();
			console.error(chalk.red(err)); // TODO
		});
});

args.command(['d', 'docs', 'h', 'home'], 'Open the npm page of a plugin', (name, args) => {
	return opn(`http://ghub.io/${args[0]}`, {wait: false});
});

args.command(['f', 'fork'], 'Fork a plugin from npm into your ~/.hyper_plugins/local', (name, args) => {
	const spinner = ora('Installing').start();
	const plugin = args[0];
	return api.existsOnNpm(plugin).then(() => {
		if (api.isInstalled(plugin, true)) {
			spinner.fail();
			console.error(chalk.red(`${plugin} is already installed locally`));
			process.exit(1);
		}

		const folderName = `${os.homedir()}/.hyper_plugins/local`;
		const fileName = `${folderName}/package.json`;
		if (!fileExists(fileName)) {
			fs.writeFileSync(fileName, '{"name": "hpm-placeholder"}', 'utf-8');
		}

		execa('npm', ['i', plugin], {cwd: folderName})
			.then(() => pify(fs.rename)(`${folderName}/node_modules/${plugin}`, `${folderName}/${plugin}`))
			.then(() => api.uninstall(plugin))
			.then(() => api.install(plugin, true))
			.then(() => {
				spinner.succeed();
				console.log(chalk.green(`${plugin} installed locally successfully!`));
				console.log(chalk.green(`Check ${folderName}/${plugin}`));
			})
			.catch(err => {
				spinner.fail();
				console.error(chalk.red(err)); // TODO
			});
	}).catch(err => {
		spinner.fail();
		if (err.code === 'NOT_FOUND_ON_NPM') {
			console.error(chalk.red(err.message));
		} else {
			console.error(chalk.red(err));
		}
		process.exit(1);
	});
});

const flags = args.parse(process.argv);

if (Object.keys(flags).length !== 0) { // Show help when no command is invoked
	args.showHelp();
}
