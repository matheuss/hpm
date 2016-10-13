import {homedir} from 'os';
import {writeFile} from 'fs';

import test from 'ava';
import mockFs from 'mock-fs';
import isCi from 'is-ci';
import pify from 'pify';

const fileName = `${homedir()}/.hyper.js`;
const fileContent = 'module.exports = {plugins: [], localPlugins:[]};';
let api = require('../api');

test.before(async t => {
	if (api.exists() && !isCi) {
		// it is ok to have Hyper.app if you are not Travis
	} else {
		// Travis can't have Hyper.app
		t.is(false, api.exists());
		await t.throws(api.install('🦁'));
		await t.throws(api.uninstall('🦁'));

		// no clue on why this is necessary, but mockFs is not working correctly if
		// the file does not exists – SEE COMMENT BELOW (???)
		await pify(writeFile)(fileName, fileContent, 'utf-8');
	}

	// if !isCi(), we need to mock the file because it does not exist – SEE COMMENT ABOVE (???)
	// if  isCi(), we need to mock the files to do not spoil the config
	require('mock-fs')({
		fileName: fileContent
	});

	delete require.cache[require.resolve('../api')];
	api = require('../api');

	t.is(true, api.exists());
});

test.after(() => {
	mockFs.restore();
});

test('check if hyper.app is installed', t => {
	t.true(api.exists());
});

test.serial('check if a plugin is not installed', t => {
	t.false(api.isInstalled('hyperpower'));
});

test.serial('install a plugin', async t => {
	await api.install('hyperpower');
	t.true(api.isInstalled('hyperpower'));
});

test.serial('install another plugin', async t => {
	await api.install('hyperyellow');
	t.true(api.isInstalled('hyperyellow'));
});

test.serial('list installed plugins', t => {
	const list = api.list();
	t.true(list.endsWith('hyperpower\nhyperyellow'));
});

test.serial('try to install a plugin that is already installed', async t => {
	const err = await t.throws(api.install('hyperpower'));
	t.is(err, 'hyperpower is already installed');
});

test.serial('uninstall a plugin', async t => {
	await api.uninstall('hyperpower');
	t.false(api.isInstalled('hyperpower'));
});

test.serial('uninstall another plugin', async t => {
	await api.uninstall('hyperyellow');
	t.false(api.isInstalled('hyperyellow'));
});

test.serial('try to unistall a plugin that is not installed', async t => {
	const err = await t.throws(api.uninstall('hyperyellow'));
	t.is(err, 'hyperyellow is not installed');
});
