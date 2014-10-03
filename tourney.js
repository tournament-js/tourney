var $ = require('interlude');
var Tournament = require('tournament');
var helper = Tournament.helpers;

function Id(t, s, r, m) {
  this.t = t;
  this.s = s;
  this.r = r;
  this.m = m;
}

Id.prototype.toString = function () {
  return "T" + this.t + " S" + this.s + " R" + this.r + " M" + this.m;
};

function Tourney() {
  this.stage = 1;
  this.oldMatches = []; // now we are just a storage place for matches...
  this._oldRes = []; // TODO: needs the tournament..
}

Tourney.inherit = function (Klass, Initial) {
  Initial = Initial || Tourney;
  Klass.prototype = Object.create(Initial.prototype);

  var methods = {
    _mustPropagate: false,
    _createNext: false
  };
  Object.keys(methods).forEach(function (fn) {
    // Implement a default if not already implemented (when Initial is Tourney)
    Klass.prototype[fn] = Initial.prototype[fn] || $.constant(methods[fn]);
  });

  Klass.configure = function (obj) {
    // invalid and defaults have the same format so can reuse the inheritance
    return Tournament.configure(Klass, obj, Initial);
  };

  // ignore Klass.sub and Klass.inherit for now for sanity
};

Tourney.sub = function (name ,init, Initial) {
  Tournament.sub(name, init, Initial || Tourney);
};

// TODO: Tourney::from and Tourney::_replace
Tourney.prototype.active = function () {
  return this._current(); // needs to be implemented in subclass
};

var formatCurrent = function (stg, active) {
  return active.map(function (m) {
    var o = {
      id: new Id(stg, m.id.s, m.id.r, m.id.m),
      p: m.p.slice(),
    };
    if (m.m) {
      o.m = m.m.slice();
    }
    return o;
  });
};
Tourney.prototype.matches = function () {
  return this.oldMatches.concat(formatCurrent(this.stage, this.active()));
};

Tourney.prototype.createNextStage = function () {
  if (!this.stageComplete()) {
    throw new Error("cannot start next stage until current one is done");
  }

  // update oldRes at end of each stage
  // NB: this.results() has more info than this._trns[i].results()
  this._oldRes = this.results(); // NB: forces an implementation in parallel mode

  // copy finished rounds matches into big list under a stage guarded ID
  var completedMatches = formatCurrent(this.stage, this.active());
  Array.prototype.push.apply(this.oldMatches, completedMatches);

  // TODO: maybe _createNext can return results from that stage?
  if (!this._createNext(this.stage + 1)) {
    return false;
  }

  this.stage += 1;
  return true;
};

// TODO:  ensure subs implement this themselves..
//Tourney.prototype.isStageComplete = function () {
//  return this._stageComplete();
//};

Tourney.prototype.isDone = function () {
  return this.isStageComplete() && !this._mustPropagate();
};

Tourney.prototype.upcoming = function (playerId) {
  // fine to look through old and current matches for this iff all matches needs playing
  // TODO: ensure duel does not have a bug in it because of this...
  // one thing here to keep in mind regardless: nothing in oldMatches is upcoming ever
  // or at least should not be, so may as well just use active
  return helper.upcoming(this.matches(), playerId);
};

Tourney.prototype.findMatch = function (id) {
  return helper.findMatch(this.matches(), id);
};
Tourney.prototype.findMatches = function (id) {
  return helper.findMatches(this.matches(), id);
};

Tourney.prototype.rounds = function (stage) {
  return helper.partitionMatches(this.matches(), 'r', 't', stage);
};

Tourney.prototype.section = function (stage) {
  return helper.partitionMatches(this.matches(), 's', 't', stage);
};

Tourney.prototype.stages = function (section) {
  return helper.partitionMatches(this.matches(), 't', 's', section);
};

Tourney.prototype.matchesFor = function (playerId) {
  return helper.matchesForPlayer(this.matches(), playerId);
};
Tourney.prototype.players = function (id) {
  return helper.players(this.findMatches(id || {}));
};


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
