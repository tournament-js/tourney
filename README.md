# Tourney
[![npm status](http://img.shields.io/npm/v/tourney.svg)](https://www.npmjs.org/package/tourney)
[![build status](https://secure.travis-ci.org/clux/tourney.svg)](http://travis-ci.org/clux/tourney)
[![dependency status](https://david-dm.org/clux/tourney.svg)](https://david-dm.org/clux/tourney)
[![coverage status](http://img.shields.io/coveralls/clux/tourney.svg)](https://coveralls.io/r/clux/tourney)
[![unstable](http://img.shields.io/badge/stability-unstable-E5AE13.svg)](http://nodejs.org/api/documentation.html#documentation_stability_index)

This module provides a [tournament](https://npmjs.org/package/tournament) like base class to allow multiple tournaments to be chained together inside a container (the tourney).

This library is probably most easily understood by its implementions:

- [groupstage-tb](https://github.com/clux/groupstage-tb)
- [groupstage-tb-duel](https://github.com/clux/groupstage-tb-duel)
- [ffa-tb](https://github.com/clux/ffa-tb)

## Usage
Implement a `Tourney` and set it up to use the `Tournament` or `Tourney` instances you want:

```js
var Tourney = require('tourney');
var Gs = require('groupstage-tb');
var Ffa = require('ffa-tb');
var Duel = require('duel')

var MyTourney = Tourney.sub('MyTourney', function (opts, init) {
  init(new Gs(this.numPlayers, opts.groupStage));
});

// set up interface rules and default arguments:
MyTourney.configure({
  defaults: function (numPlayers, opts) {
    opts.groupStage = Gs.defaults(numPlayers, opts.groupStage || {});
    opts.ffa = Ffa.defaults(opts.groupStage.limit, opts.ffa || {});
    opts.duel = Duel.defaults(opts.ffa.limit, opts.duel || {});
    return opts;
  },
  invalid: function (numPlayers, opts) {
    return Gs.invalid(numPlayers, opts.groupStage) ||
           Ffa.invalid(opts.groupStage.limit, opts.ffa) ||
           Duel.invalid(opts.ffa.limit, opts.duel) ||
           null;
  }
});

// add some standard helpers
MyTourney.prototype.inGroupStage = function () {
  return this.getName(1) === Gs.name;
};
MyTourney.prototype.inFFA = function () {
  return this.getName(1) === Ffa.name;
};
MyTourney.prototype.inDuel = function () {
  return this.getName(1) === Duel.name;
};

// set up rules for stage progression
MyTourney.prototype._mustPropagate = function (stage, inst) {
  return this.inGroupStage() || this.inFFA();
};
MyTourney.prototype._createNext = function (stage, inst, opts) {
  // called when stageDone && _mustPropagate
  if (this.inGroupStage()) {
    return Ffa.from(inst, opts.groupStage.limit, opts.ffa);
  }
  // otherwise it must be FFA
  return Duel.from(inst, opts.ffa.limit, opts.duel);
};

module.exports = MyTourney;
```

Then you can use your module like any other [Tournament](https://npmjs.org/tournament), but with extra stage separation:

```js
var MyTourney = require('./gs-ffa.js') // say

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
