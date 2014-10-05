var $ = require('interlude');
var Tournament = require('tournament');
var helper = Tournament.helpers;

function Id(t, id) {
  $.extend(this, id); // Tournament style { s, r, m }
  this.t = t; // do after extend to override if `id.t` exists
}

Id.prototype.toString = function () {
  return "T" + this.t + " S" + this.s + " R" + this.r + " M" + this.m;
};

//------------------------------------------------------------------
// Setup and statics
//------------------------------------------------------------------

function Tourney(np, inst) {
  this._inst = inst;
  this.matches = inst.matches; // reference to above to match Tournament API
  this.oldMatches = []; // stash matches from completed instances here
  this._stage = 1;
  this._oldRes = [];
  // for determining when we can expect Tourney API
  Object.defineProperty(this, 'hasStages', { value: true });
}

Tourney.inherit = function (Klass, Initial) {
  Initial = Initial || Tourney;
  Klass.prototype = Object.create(Initial.prototype);

  var methods = {
    _createNext: false,
    _mustPropagate: false
  };
  Object.keys(methods).forEach(function (fn) {
    // Implement a default if not already implemented (when Initial is Tourney)
    Klass.prototype[fn] = Initial.prototype[fn] || $.constant(methods[fn]);
  });

  Klass.configure = function (obj) {
    // Preserve Tournament API for invalid and defaults
    return Tournament.configure(Klass, obj, Initial);
  };

  Klass.from = function (inst, numPlayers, opts) {
    // Since Tourney instances have same interface, can reuse Tournament.from
    var from = Tournament.from(Klass, inst, numPlayers, opts);
    from._oldRes = inst.results();
    return from;
  };

  // ignore inherited `sub` and `inherit` for now for sanity
};

Tourney.defaults = Tournament.defaults;
Tourney.invalid = Tournament.invalid;

Tourney.sub = function (name, init, Initial) {
  // Preserve Tournament API. This ultimately calls Tourney.inherit
  return Tournament.sub(name, init, Initial || Tourney);
};

//------------------------------------------------------------------
// Methods mimicing Tournaments API
//------------------------------------------------------------------

Tourney.prototype.unscorable = function (id, score, allowPast) {
  return this._inst.unscorable(id, score, allowPast);
};

Tourney.prototype.score = function (id, score) {
  return this._inst.score(id, score);
};

Tourney.prototype.upcoming = function (playerId) {
  return helper.upcoming(this.matches, playerId);
};

Tourney.prototype.players = function (id) {
  return helper.players(helper.findMatches(this.matches, id || {}));
};

Tourney.prototype.isDone = function () {
  // self-referential isDone for Tourney's (checking if subTourneys are done)
  // but this eventually ends in a Tournament::isDone()
  return this._inst.isDone() && !this._mustPropagate(this._stage);
};

//------------------------------------------------------------------
// Helpers for piping modules together
//------------------------------------------------------------------

Tourney.prototype.stageDone = function () {
  return this._inst[this._inst.hasStages ? 'stageDone' : 'isDone']();
};

var formatCurrent = function (stage, ms) {
  // prepare matches from a completed instance for oldMatches
  // NB: if `ms` come from a Tourney, the stage `t` key will be overridden
  // and will use the counter relative to this Tourney
  return ms.map(function (m) {
    var o = { id: new Id(stage, m.id), p: m.p.slice() };
    if (m.m) {
      o.m = m.m.slice();
    }
    return o;
  });
};


Tourney.prototype.createNextStage = function () {
  if (!this.stageDone()) {
    throw new Error("cannot start next stage until current one is done");
  }
  if (this.isDone()) {
    return false;
  }

  // update results for players still in it
  this._oldRes = this.results();

  // extend current matches' ids with `t` = this._stage (overwriting if necessary)
  var completedMatches = formatCurrent(this._stage, this.matches);
  Array.prototype.push.apply(this.oldMatches, completedMatches);

  // _createNext cannot fail now - if it does implementation's fault
  this._stage += 1;
  this._inst = this._createNext(this._stage); // releases old instance
  this.matches = this._inst.matches;
  return true;
};

Tourney.prototype.complete = function () {
  if (!this.isDone()) {
    throw new Error("cannot complete a tourney until it is done");
  }
  // last oldMatches extend
  var completedMatches = formatCurrent(this._stage, this.matches);
  Array.prototype.push.apply(this.oldMatches, completedMatches);
  this.matches = [];
  this.unscorable = $.constant("cannot score matches after completing a tourney");
  this.score = function () {
    console.error(this.unscorable());
    return false;
  };
};

//------------------------------------------------------------------
// Match finders - looks at union of active and inactive
//
// These are purely convenience methods for UI and application
// Tourney & implementations end up using the ones on this._inst
//------------------------------------------------------------------

/*Tourney.prototype.allMatches = function () {
  return this.oldMatches.concat(formatCurrent(this._stage, this.matches));
};

Tourney.prototype.findMatch = function (id) {
  return helper.findMatch(this.allMatches(), id);
};
Tourney.prototype.findMatches = function (id) {
  return helper.findMatches(this.allMatches(), id);
};

Tourney.prototype.rounds = function (stage) {
  return helper.partitionMatches(this.allMatches(), 'r', 't', stage);
};

Tourney.prototype.section = function (stage) {
  return helper.partitionMatches(this.allMatches(), 's', 't', stage);
};

Tourney.prototype.stages = function (section) {
  return helper.partitionMatches(this.allMatches(), 't', 's', section);
};

Tourney.prototype.matchesFor = function (playerId) {
  return helper.matchesForPlayer(this.allMatches(), playerId);
};
Tourney.prototype.players = function (id) {
  return helper.players(this.findMatches(id || {}));
};*/

//------------------------------------------------------------------
// Results
//
// If current instance does not report results for all players,
// we append knocked out players' results from their previous stage.
// By induction, all players always exist in `results`.
//------------------------------------------------------------------

// TODO: use Tournament.resultEntry and make it not throw
var resultEntry = function (res, p) {
  return $.firstBy(function (r) {
    return r.seed === p;
  }, res);
};

Tourney.prototype.results = function () {
  var currRes = this._inst.results();
  // _oldRes maintained as results from previous stage(s)
  var knockedOutResults = this._oldRes.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(currRes, r.seed);
  });

  return currRes.concat(knockedOutResults);
};

//------------------------------------------------------------------

module.exports = Tourney;
