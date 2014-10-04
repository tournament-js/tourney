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
  this.stage = 1;
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

  // ignore inherited `sub`, `inherit`, and `from` for now for sanity
};

Tourney.defaults = Tournament.defaults;
Tourney.invalid = Tournament.invalid;

Tourney.sub = function (name, init) {
  // Preserve Tournament API. This ultimately calls Tourney.inherit
  return Tournament.sub(name, init, Tourney);
};

// TODO: Tourney.from should be almost identical to Tournament's
// but it cannot replaceMatches
// so that part either needs to be virtual
// or Klass.from is configured manually s.t.:
//  - Klass.from(inst, np, opts)
//  - -> var firstInst = FirstKlass.from(inst, np, subSetOfOpts);
//  - return new Klass(firstInst); // special ctor?

//------------------------------------------------------------------
// Helpers for piping modules together
//------------------------------------------------------------------

Tourney.prototype.stageDone = function () {
  return this._inst[this._inst.hasStages ? 'stageDone' : 'isDone']();
};

Tourney.prototype.isDone = function () {
  // self-referential isDone for Tourney's (checking if subTourneys are done)
  // but this eventually ends in a Tournament::isDone()
  return this._inst.isDone() && !this._mustPropagate();
};

var formatCurrent = function (stage, ms) {
  // prepare matches from a completed instance for oldMatches
  // NB: if `ms` come from a Tourney, the stage `t` key will be overridden
  // and will use the counter relative to this Tourney
  return ms.map(function (stage, m) {
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

  // extend current matches' ids with `t` = this.stage (overwriting if necessary)
  var completedMatches = formatCurrent(this.stage, this.matches);
  Array.prototype.push.apply(this.oldMatches, completedMatches);

  if (this.isDone()) {
    this.matches = []; // ensure no double copies into oldMatches
    return false;
  }

  // _createNext cannot fail now - if it does implementation's fault
  this._inst = this._createNext(this.stage + 1);
  this.matches = this._inst.matches;
  this.stage += 1; // update after _createNext in case stage identifiers use counter
  return true;
};

//------------------------------------------------------------------
// Stuff dealing with current matches
//------------------------------------------------------------------
Tourney.prototype.unscorable = function (id, score, allowPast) {
  return this._inst.unscorable(id, score, allowPast);
};

Tourney.prototype.score = function (id, score) {
  return this._inst.score(id, score);
};

Tourney.prototype.upcoming = function (playerId) {
  // no upcoming in oldMatches so just look in active
  // TODO: this is end user stuff though.. maybe extend with Id?
  return helper.upcoming(this.matches, playerId);
};

//------------------------------------------------------------------
// Match finders - looks at union of active and inactive
//
// These are purely convenience methods for end user.
// Tourney & implementations end up using the ones on this._inst
//------------------------------------------------------------------

Tourney.prototype.findMatch = function (id) {
  return helper.findMatch(this.union(), id);
};
Tourney.prototype.findMatches = function (id) {
  return helper.findMatches(this.union(), id);
};

Tourney.prototype.rounds = function (stage) {
  return helper.partitionMatches(this.union(), 'r', 't', stage);
};

Tourney.prototype.section = function (stage) {
  return helper.partitionMatches(this.union(), 's', 't', stage);
};

Tourney.prototype.stages = function (section) {
  return helper.partitionMatches(this.union(), 't', 's', section);
};

Tourney.prototype.matchesFor = function (playerId) {
  return helper.matchesForPlayer(this.union(), playerId);
};
Tourney.prototype.players = function (id) {
  return helper.players(this.findMatches(id || {}));
};

//------------------------------------------------------------------
// Results - Not finialized
//------------------------------------------------------------------

var resultEntry = function (res, p) {
  return $.firstBy(function (r) {
    return r.seed === p;
  }, res);
};

Tourney.prototype.results = function () {
  // TODO: this.current no longer exposed to tourney, but need results..
  var currRes = this.current.results();
  // _oldRes maintained as results from previous stage(s)
  var knockedOutResults = this._oldRes.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(currRes, r.seed);
  });

  return currRes.concat(knockedOutResults);
};

module.exports = Tourney;
