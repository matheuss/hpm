# hpm [![Build Status](https://travis-ci.org/zeit/hpm.svg?branch=master)](https://travis-ci.org/matheuss/hpm) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo) [![Coverage Status](https://coveralls.io/repos/github/matheuss/hpm/badge.svg?branch=master)](https://coveralls.io/github/matheuss/hpm?branch=master)


✨ A plugin manager for HyperTerm ✨

<img src="https://raw.githubusercontent.com/matheuss/hpm/master/screenshot.gif?v=2" width="629">

## Install

```
npm install -g hpm-cli
```

## Usage

```
❯ hpm help

  Usage: hpm [options] [command]

  Commands:

    d, docs, h, home          Open the npm page of a plugin
    f, fork                   Fork a plugin from npm into your ~/.hyperterm_plugins/local
    help                      Display help
    i, install                Install a plugin
    ls, list                  List installed plugins
    ls-remote                 List plugins available on npm
    s, search                 Search for plugins on npm
    u, uninstall, rm, remove  Uninstall a plugin

  Options:

    -h, --help     Output usage information
    -v, --version  Output the version number
```

## Upcoming
- [ ] `hpm view hyperpower` – something similar to `npm view`
- [ ] `hpm i hyperpower@beta` – same as `npm i package@tag`
- [ ] `hpm u --tmp` – comment the plugin in `.hyperterm.js` instead of deleting it
- [ ] Bulk commands (e.g. `hpm i hyperpower hyperyellow`)
- [ ] `hpm help` – same as `npm help`

## Done
- [x] `hpm i hyperpower#1.0.0`
- [x] `hpm fork hyperpower`
- [x] `hpm search <query>`
- [x] `hpm uninstall <plugin>`
- [x] `hpm ls`

## Maybe
- [ ] `hpm init` (or something like that) that downloads HyperTerm for you
