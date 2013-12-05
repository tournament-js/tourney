# Tourney
[![Build Status](https://secure.travis-ci.org/clux/tourney.png)](http://travis-ci.org/clux/tourney)
[![Dependency Status](https://david-dm.org/clux/tourney.png)](https://david-dm.org/clux/tourney)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://nodejs.org/api/documentation.html#documentation_stability_index)

This module provides a base class for stateful tournament types that is built up of several fixed size tournaments.

The underlying tournaments are assumed to inherit from [tournament](https://npmjs.org/package/tournament).

Implementions:

- [groupstage-tb](https://github.com/clux/groupstage-tb)
- [ffa-tb](https://github.com/clux/ffa-tb)

This is all experimental at the moment, and not much is set in stone.

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
