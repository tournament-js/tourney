var $ = require('interlude');
var Tournament = require('tournament');

function Id(t, id) {
  $.extend(this, id); // Tournament style { s, r, m }
  this.t = t; // add stage number - override if exists (from sub Tourney)
}

Id.prototype.toString = function () {
  return "T" + this.t + " S" + this.s + " R" + this.r + " M" + this.m;
};

//------------------------------------------------------------------
// Setup and statics
//------------------------------------------------------------------

function Tourney(np, inst) {
  this._inst = inst;
  this.matches = inst.matches; // proxy reference
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
    _mustPropagate: false,
    _proxyRes: false,
    _updateRes: null
  };
  Object.keys(methods).forEach(function (fn) {
    // Implement a default if not already implemented (when Initial is Tourney)
    Klass.prototype[fn] = Initial.prototype[fn] || $.constant(methods[fn]);
  });

  Klass.configure = function (obj) {
    // Preserve Tournament API for invalid and defaults
    Tournament.configure(Klass, obj, Initial);
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
// Pure proxy methods
//------------------------------------------------------------------

Tourney.prototype.unscorable = function (id, score, allowPast) {
  return this._inst.unscorable(id, score, allowPast);
};
Tourney.prototype.score = function (id, score) {
  return this._inst.score(id, score);
};
Tourney.prototype.upcoming = function (playerId) {
  return this._inst.upcoming(playerId);
};
Tourney.prototype.players = function (id) {
  return this._inst.players(id);
};
Tourney.prototype.findMatch = function (id) {
  return this._inst.findMatch(id);
};
Tourney.prototype.findMatches = function (id) {
  return this._inst.findMatches(id);
};

//------------------------------------------------------------------
// Helpers for piping modules together
//------------------------------------------------------------------

Tourney.prototype.getName = function (depth) {
  var names = [];
  for (var inst = this._inst; inst ; inst = inst._inst) {
    names.push(inst.name);
  }
  return names.slice(0, depth).join('::');
};

Tourney.prototype.isDone = function () {
  // self-referential isDone for Tourney's (checking if subTourneys are done)
  // but this eventually ends in a Tournament::isDone()
  return this._inst.isDone() &&
        !this._mustPropagate(this._stage, this._inst, this._opts);
};

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

  // extend current matches' ids with `t` = this._stage (overwriting if necessary)
  var completedMatches = formatCurrent(this._stage, this.matches);
  Array.prototype.push.apply(this.oldMatches, completedMatches);

  // update results for players still in it
  this._oldRes = this.results();

  this._stage += 1;
  // propagate createNext if we have a Tourney instance embedded
  if (this._inst.hasStages && !this._inst.isDone()) {
    this._inst.createNextStage();
    this.matches = this._inst.matches; // update link
    return true;
  }
  // and seal it down if all its stages were done
  if (this._inst.hasStages) {
    this._inst.complete();
  }

  // otherwise _createNext needs to handle progression
  this._inst = this._createNext(this._stage, this._inst, this._opts);
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
// Extra helpers - probably won't be included
//------------------------------------------------------------------
/*
Tourney.prototype.rounds = function (stage) {
  return helper.partitionMatches(this.allMatches(), 'r', 't', stage);
};

Tourney.prototype.section = function (stage) {
  return helper.partitionMatches(this.allMatches(), 's', 't', stage);
};

Tourney.prototype.stages = function (section) {
  return helper.partitionMatches(this.allMatches(), 't', 's', section);
};
*/

//------------------------------------------------------------------
// Results
//
// If current instance does not report results for all players,
// we append knocked out players' results from their previous stage.
// By induction, all players always exist in `results`.
//------------------------------------------------------------------

// NB: same as Tournament.resultEntry but does not throw
var resultEntry = function (res, p) {
  return $.firstBy(function (r) {
    return r.seed === p;
  }, res);
};

Tourney.prototype.results = function () {
  var curr = this._inst.results();
  if (this._proxyRes()) {
    return curr;
  }

  var previous = this._oldRes;
  var knockOut = previous.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(curr, r.seed);
  });

  var updater = this._updateRes.bind(this);
  return curr.map(function (r) {
    var old = resultEntry(previous, r.seed);
    if (old) {
      updater(r, old);
    }
    return r;
  }).concat(knockOut);
};

//------------------------------------------------------------------

module.exports = Tourney;
