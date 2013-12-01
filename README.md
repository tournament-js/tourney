# Dynamic-Tournament
[![Build Status](https://secure.travis-ci.org/clux/dynamic-tournament.png)](http://travis-ci.org/clux/dynamic-tournament)
[![Dependency Status](https://david-dm.org/clux/dynamic-tournament.png)](https://david-dm.org/clux/dynamic-tournament)
[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://nodejs.org/api/documentation.html#documentation_stability_index)

This module provides a base class for stateful tournament types that is built up of several fixed size tournaments.

The underlying tournaments are assumed to inherit from [tournament](https://npmjs.org/package/tournament).

Implementions:

- [groupstage-dynamic](https://github.com/clux/groupstage-dynamic)
- [ffa-dynamic](https://github.com/clux/ffa-dynamic)

This is all experimental at the moment, and not much is set in stone.

## Installation
For specific tournament usage, install the modules you want:

```bash
$ npm install groupstage-dynamic duel --save
```

To use these on in the browser, bundle it up with [browserify](https://npmjs.org/package/browserify)

```bash
$ npm dedupe
$ browserify -r groupstage-dynamic -r duel > bundle.js
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
