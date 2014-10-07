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
trn.inGroupStage(); // true
trn.matches; // gives you matches in a 32 player groupstage
trn.matches.forEach(function (m) {
  trn.score(m.id, [1,0]); // score it like a tournament
});
trn.stageDone(); // true

trn.createNextStage();
trn.inFFA(); // true
trn.matches; // a single ffa match featuring winners
// NB: if groupstage did not pick a clear winner of each group in stage 1:
// we would have been in tiebreaker featuring a subset of the players

// score ffa round 1
trn.stageDone(); // true - ffa round 1 done

trn.createNextStage();
trn.matches; // either round 2 of ffa or tiebreaker for round 1 of ffa
// keep scoring until ffa bit is done

trn.stageDone();
trn.createNextStage();
trn.inDuel(); // true
trn.matches; // a double elimination duel tournament featuring 4 players
// NB: if FFA did not pick clear winners in any of its two roun

// score duel..
trn.isDone(); // true
trn.complete(); // lock down state
```

## License
MIT-Licensed. See LICENSE file for details.
