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

var GsFfa = Tourney.sub('GsFfa', function (opts, init) {
  init(new Gs(this.numPlayers, opts.groupStage));
});

// set up interface rules and default arguments:
GsFfa.configure({
  defaults: function (numPlayers, opts) {
    return opts;
  },
  invalid: function (numPlayers, opts) {
    return null;
  }
});

// set up rules for stage progression
GsFfa.prototype._mustPropagate = function (stage, inst) {
  return inst.name === 'GroupStage-Tb';
};
GsFfa.prototype._createNext = function (stage, inst, opts) {
  return Ffa.from(inst, opts.groupStage.limit, opts.ffa);
};

module.exports = GsFfa;
```

Then you can use your module like any other [Tournament](https://npmjs.org/tournament), but with extra stage separation:

```js
var GsFfa = require('./gs-ffa.js') // say

var opts = {
  groupStage: { groupSize: 4, limit: 4 }, // want the top 4 to proceed to Ffa
  ffa: { sizes: [4], limit: 1 } // one match of size 4 - tiebreak until clear winner
}
var trn = new GsFfa(16, opts);
trn.matches; // gives you matches in a 16 player groupstage
trn.matches.forEach(function (m) {
  trn.score(m.id, [1,0]); // score it like a tournament
});
trn.stageDone(); // true

trn.createNextStage(); // true
trn.matches; // a single ffa match featuring winners
// NB: if groupstage did not pick a clear winner of each group in stage 1:
// we would have been in tiebreaker featuring a subset of the players

trn.score({ s: 1, r: 1, m: 1}, [4,0,0,0]); // score s.t. clear winner

trn.stageDone(); // true - ffa done
trn.isDone(); // true - no tiebreaker needed
trn.complete(); // lock down state
```

## License
MIT-Licensed. See LICENSE file for details.
