# Implementors guide

This module combines of tournament building blocks and creates a new tournamend building block. You can craft the thing you ultimately want to use right away, or you can factor things out into smaller tourneys.

Before making a tourney you should consider skimming the source of one or more of the original implementations:

- [groupstage-tb](https://github.com/clux/groupstage-tb)
- [groupstage-tb-duel](https://github.com/clux/groupstage-tb-duel)
- [ffa-tb](https://github.com/clux/ffa-tb)

These draw from the pre-existing [tournament](https://github.com/clux/tournament) implementations:

- [duel](https://github.com/clux/duel)
- [ffa](https://github.com/clux/ffa)
- [groupstage](https://github.com/clux/groupstage)
- [masters](https://github.com/clux/masters)
- [tiebreaker](https://github.com/clux/tiebreaker)

which you may or may not need to learn the details of.

In this doc it is assumed that when we say Tourney, we may mean both Tournament OR Tourney, since they share the same API and can be inserted into Tourneys interchangably. Unless explicitly stated, do not assume they are pure Tourneys.

## Tourney outline
Here is an example of a custom tourney implementation using existing blocks:

```js
var Tourney = require('tourney');
var Gs = require('groupstage-tb'); // a Tourney
var Ffa = require('ffa-tb'); // a complicated Tourney
var Duel = require('duel') // a Tournament

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
  	if (!opts.ffa.limit) {
      return return "need to specify a non-zero ffa.limit";
	}
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

## Requirements

- `.sub` MUST be called with your init function (constructor replacement)
- init function must call the `init` cb with the initial Tourney OR Tournament
- `.configure` MUST be called providing an `invalid` entry
- `.configure` SHOULD be called with a `defaults` entry
- `_createNext` MUST be implemented
- `_mustPropagate` MUST be implemented
- `Tourney` methods MUST NOT be overridden to maintain expected behaviour

### configure
Configure needs to be called with the rules and defaults for the options object.
It takes two functions; `defaults` and `invalid`, the first of which MUST exist.
Both functions take the same arguments as the tournament constructor; `(numPlayers, opts)`.

```js
SomeTournament.configure({
  invalid: function (numPlayers, opts) {
    if (!opts.ffa.limit) {
      return return "need to specify a non-zero ffa.limit";
	}
    return Gs.invalid(numPlayers, opts.groupStage) ||
           Ffa.invalid(opts.groupStage.limit, opts.ffa) ||
           Duel.invalid(opts.ffa.limit, opts.duel) ||
           null;
  },
  defaults: function (numPlayers, opts) {
    opts.groupStage = Gs.defaults(numPlayers, opts.groupStage || {});
    opts.ffa = Ffa.defaults(opts.groupStage.limit, opts.ffa || {});
    opts.duel = Duel.defaults(opts.ffa.limit, opts.duel || {});
    return opts;
  },
});
```

`invalid` ensures that tournament rules are upheld. If you have specific rules, these will be guarded on for construction. Since tourneys normally glue together other tourneys, invalid should rarely need special rules, but simply delegate to child tourneys. Note that tourneys that do not support limit options can only go at the last stage of a tourney since the exact number propagated must be known at instantiation, and it must always be unambiguous when propagating.

`defaults` is there to help ensure that the `opts` object passed into `invalid` and the tourney constructor match what you'd expect. Since tourney's normally glue together other tourneys, defaults should rarely need special options, but simply delegate to child tourneys.

#### defaults examples
Unlike tournaments which (in all currently known cases) have sensible default behaviour, Tourneys usually do not because the limit must always be explicit. It usually makes no sense to guess how many people to propagate from stage N to stage N+1, so no effort is required to guesss this.

#### limits
In the above example, the winners from the `GroupStage` (with tiebreakers) is moved into an `FFA` tournament (with tiebreakers), which is moved into a `Duel` tournament.

In each case, the initial tourney has to account for the limit to ensure sufficient tiebreaking happens to move on to the next stage. `FfaTb` does not itself require a `limit` to be set (because you can still tiebreak all matches apart from the final), therefore we need to introduce a check for it. `GroupStageTb` does require a `limit` because otherwise you would be using plain `GroupStage`.

Lastly, `Duel` does not (at present time) support limits and thus has to be placed at the last stage, taking the top `opts.ffa.limit` playes from stage two. This means that if we ever wanted to use this module as a building block, it would need to be the last stage, because it could never support limits as long as `Duel` does not.

### progression
To get tourney's `createNextStage`, `stageDone` and `isDone` working, you will need to implement the following two methods:

#### _mustPropagate :: (stage, inst, opts) -> Bool
A method that is called when the current instance is done and use requested `createNextStage`. You can inspect the current state of the current active stage's instance and decide whether or not we need to propagate. Typically, you always need to progress from certain stages so you normally only need to check what stage we are in, or what type of it (since certain tourney's keep going for a while until everything's sufficiently untied).

```js
MyTourney.prototype._mustPropagate = function () {
  return this.inGroupStage() || this.inFFA(); // above example
}
```

But sometimes you will need a more complicated check, like if your final stage can keep going until everything is untied (like `FfaTb` and `GroupStageTb`). Here an example from `FfaTb`

```js
FfaTb.prototype._mustPropagate = function (stg, inst, opts) {
  // regardless of current instance type:
  // only stop if last round played and we no longer need tiebreaking
  return !this.inFinal() ||
         (opts.limit && TieBreaker.isNecessary(inst, opts.limit));
};
```


#### _createNext :: (stage, inst, opts) -> Tourney/Tournament
The most imortant stage is the forwarder. When we `_mustPropagate` and `stageDone`, this will be called when `createNextStage` is requested. In this case you must ALWAYS produce the next tournament. If you are unable to do so, you implemented `_mustPropagate` wrongly.

```js
MyTourney.prototype._createNext = function (stage, inst, opts) {
  // called when stageDone && _mustPropagate
  if (this.inGroupStage()) {
    return Ffa.from(inst, opts.groupStage.limit, opts.ffa);
  }
  // otherwise it must be FFA
  return Duel.from(inst, opts.ffa.limit, opts.duel);
};
```

Most of the heavy lifting here is done for you by delegating to the next tourney types `from` function. This is automatically generated for all `Tournament` instances, as well as `Tourney` instances. All you need to do is remember what stage leads to the next, and how many to let through.
This MUST map onto what you defined in your `invalid` function to avoid impossible errors.


### results
The arguably most important feature of tourneys is the ability to get detailed statistics of all the players as the tourney progresses. Thankfully, this is usually gotten completely for free because of a simple assumption:

The number of players in stage N+1 is always less than or equal to the number of players in staeg N.

Thus the default results simply update the results for the players in the current stage, and leave the old ones at the end.

That said, there are a few things you may want to do:

#### Implementing custom results
##### _proxyRes
In certain cases you do not want to even look at the old results, like if you are in a tiebreaker stage, and just want to proxy results calls onto the tiebreaker instance in this case.

To do this simply implement this function to specify when to proxy results onto the current instance:

```js
SomeTourney.prototype._proxyRes = function () {
  return this.inTieBreaker(); 
};
```

##### _updateRes :: (Old Result, New Result)
You may want to update the new result attributes based on attributes in the previous. In this case you can implement this function.

```js
SomeTourney.prototype._updateRes = function (r, prev) {
  r.for += prev.for;
  r.against += prev.against;
  r.wins += prev.wins;
}
```

#### Overriding results
Not recommended. Requires a more detailed understanding of how the tourney base class works.


### stage identification
You should provide helpers to let users know what stage they are in. This avoids people from digging into the brain of the underlying state machine. In general make one for every stage:

```js
SomeTourney.prototype.inGroupStage = function () {
  return this.getName(1) === 'GroupStage-Tb';
};
SomeTourney.prototype.inTieBreaker = function () {
  return this.getName(2) === 'GroupStage-Tb::TieBreaker';
};
```

Note the internal `getName(n)` helper which looks `n` levels down and joins all the found names with '::'. Since `GroupStage-Tb` contains either a `GroupStage` or `TieBreaker` as its active instance, the one two levels down is either `GroupStage-Tb::GroupStage` or `GroupStage-Tb::Tiebreaker`. Regardless of which of the two we are in, this is still arguably considered to be part of the groupstage. But how you choose this is up to you. Just think about it.