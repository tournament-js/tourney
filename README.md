# Tourney
[![npm status](http://img.shields.io/npm/v/tourney.svg)](https://www.npmjs.org/package/tourney)
[![build status](https://secure.travis-ci.org/clux/tourney.svg)](http://travis-ci.org/clux/tourney)
[![dependency status](https://david-dm.org/clux/tourney.svg)](https://david-dm.org/clux/tourney)
[![coverage status](http://img.shields.io/coveralls/clux/tourney.svg)](https://coveralls.io/r/clux/tourney)
[![experimental](http://img.shields.io/badge/stability-experimental-DD5F0A.svg)](http://nodejs.org/api/documentation.html#documentation_stability_index)

This module provides a base class for tournament types that is built up of several fixed size tournaments.

The underlying tournaments are assumed to inherit from [tournament](https://npmjs.org/package/tournament).

Implementions:

- [groupstage-tb](https://github.com/clux/groupstage-tb)
- [ffa-tb](https://github.com/clux/ffa-tb)

## Specifics
Tourney extend all match ids from a sub tournament with `t` and `p` tags; `t` is the tourney stage, and `p` is the parallel segment. The idea is that all the matches with the same `t` can be played simultaneously, but each stage can consist of multiple disjoint tournament segments.

## Usage
Inherit from the exported class, or find implementations that do what you want.
For more details read this source, or the source of implementations listed above. This module is still quite fresh.

## Installation
For specific tournament usage, install the modules you want:

```bash
$ npm install groupstage-tb duel --save
```

To use these on in the browser, bundle it up with [browserify](https://npmjs.org/package/browserify)

```bash
$ npm dedupe
$ browserify -r groupstage-tb -r duel > bundle.js
```

## Running tests
Install development dependencies

```bash
$ npm install
```

Run the tests

```bash
$ npm test
```

## License
MIT-Licensed. See LICENSE file for details.
