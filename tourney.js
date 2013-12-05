var $ = require('autonomy');

var stageAttach = function (ms, stage) {
  ms.forEach(function (m) {
    m.id.t = stage;
  });
};

// TODO: find sensible start signatures so we can implement .sub
function Tourney(trn) {
  this._trn = trn;
  this._ready = false;
  this._done = false;
  this._stage = 1;
  this._oldRes = [];
  stageAttach(trn.matches, this._stage);
  this.numPlayers = trn.numPlayers; // TODO: initial always good starting point?
  this.matches = trn.matches.slice();
}

Tourney.inherit = function (Klass, Initial) {
  Initial = Initial || Tourney;
  Klass.prototype = Object.create(Initial.prototype);

  // TODO: defaults for _verify _progress _limbo _early and _initResult ?
  Object.defineProperty(Klass.prototype, 'rep', {
    value: Klass.idString
  });

  // TODO: configure?
  Klass.inherit = function (SubKlass) {
    return Initial.inherit(SubKlass, Klass);
  };

  // TODO: sub?
};

// TODO: getter?
Tourney.prototype.currentStage = function () {
  return this._trn.matches;
};

Tourney.prototype.currentPlayers = function (partialId) {
  return this._trn.players(partialId);
};

Tourney.prototype.createNextStage = function () {
  if (!this._ready) {
    throw new Error("cannot start next stage until current one is done");
  }

  // update oldRes at end of each stage
  // NB: this.results() has more info than this._trn.results()
  this._oldRes = this.results();

  // copy finished rounds matches into big list under a stage guarded ID
  this._trn.matches.forEach(function (m) {
    var copy = {
      id: $.extend({ t: this.stage }, m.id),
      p: m.p.slice()
    };
    if (m.m) {
      copy.m = m.m.slice();
    }
    this.matches.push(copy);
  }.bind(this));

  var trn = this._createNext(/*this._stage*/);
  if (trn === null) {
    return false;
  }
  this._stage += 1;
  this._trn = trn;
  stageAttach(this._trn.matches, this._stage);
  this.matches = this.matches.concat(this._trn.matches);
  this._ready = false;
  return true;
};

Tourney.prototype.stageComplete = function () {
  return this._ready;
};

Tourney.prototype.unscorable = function (id, score, allowPast) {
  if (id.t != null && id.t !== this._stage) {
    return "cannot rescore finished stages";
  }
  // Note that classical tournaments just disregard the id.t flag
  return this._trn.unscorable(id, score, allowPast);
};

Tourney.prototype.score = function (id, score, allowPast) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  // score in current tournament - we know _trn.unscorable passes at this point
  if (this._trn.score(id, score, allowPast)) {
    this._ready = this._trn.isDone();
    return true;
  }
  return false;
};

Tourney.prototype.upcoming = function (playerId) {
  return $.extend({ t: this._stage }, this._trn.upcoming(playerId));
};

Tourney.prototype.isDone = function () {
  return this._done;
};

var resultEntry = function (res, p) {
  return $.firstBy(function (r) {
    return r.seed === p;
  }, res);
};

Tourney.prototype.results = function () {
  var currRes = this._trn.results();
  // _oldRes maintained as results from previous stage(s)
  var knockedOutResults = this._oldRes.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(currRes, r.seed);
  });

  return currRes.concat(knockedOutResults);
};

module.exports = Tourney;
