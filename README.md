# Tourney
[![npm status](http://img.shields.io/npm/v/tourney.svg)](https://www.npmjs.org/package/tourney)
[![build status](https://secure.travis-ci.org/clux/tourney.svg)](http://travis-ci.org/clux/tourney)
[![dependency status](https://david-dm.org/clux/tourney.svg)](https://david-dm.org/clux/tourney)
[![coverage status](http://img.shields.io/coveralls/clux/tourney.svg)](https://coveralls.io/r/clux/tourney)
[![unstable](http://img.shields.io/badge/stability-unstable-E5AE13.svg)](http://nodejs.org/api/documentation.html#documentation_stability_index)

This module provides a way to glue together [tournament](https://npmjs.org/package/tournament) like building blocks (or even other tourneys) to create larger tourneys that does not have tournament's pre-determined match size restriction.

As this library does not provide anything but an interface, it is probably easiest to understand by seeing some implementions:

- [groupstage-tb](https://github.com/clux/groupstage-tb)
- [groupstage-tb-duel](https://github.com/clux/groupstage-tb-duel)
- [ffa-tb](https://github.com/clux/ffa-tb)

## Usage
You should read at least one of:

- [tourney base class and commonalities](./doc/base.md)
- [implementors guide](./doc/implementors.md)

The short of it is that you can use any implementation like if it was a [Tournament](https://npmjs.org/tournament), but with extra stage separation:

```js
var MyTourney = require('./mytrn.js')

// suppose MyTourney has 3 stages:
// 1. GroupStage
// 2. FFA
// 3. Duel
var opts = {
  groupStage: { groupSize: 4, limit: 16 }, // want the top 16 to proceed to Ffa
  ffa: { sizes: [4, 4], advancers: [2], limit: 4 }, // top 4 to Duel stage
  duel: { last: Duel.LB }
}
var trn = new MyTourney(32, opts);

// then:
trn.matches; // gives you the current stage (groupstage first)
trn.score(trn.matches[i].id, [1,0]); // score a match like a tournament

// when all scored:
trn.stageDone(); // true
trn.createNextStage();
trn.matches; // either round 1 of FFA or tiebreakers for the groupstage

// keep scoring and making next stages until:
trn.isDone(); // cannot create more stages now
trn.complete(); // lock down state
```

## License
MIT-Licensed. See LICENSE file for details.
