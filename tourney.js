var $ = require('autonomy');

var prepTournaments = function (trns, stage) {
  var currentStage = [];
  for (var i = 0; i < trns.length; i += 1) {
    var ms = trns[i].matches;
    for (var k = 0; k < ms.length; k += 1) {
      var m = ms[k];
      m.id.t = stage; // sub tournament
      m.id.p = i+1; // parallel segment
      currentStage.push(m);
    }
  }
  return currentStage;
};

// TODO: find sensible start signatures so we can implement .sub
function Tourney(trns) {
  this._trns = trns;
  this._ready = false;
  this._done = false;
  this._stage = 1;
  this._oldRes = [];
  this.matches = prepTournaments(trns, this._stage);
  this.numPlayers = trns.reduce(function (acc, trn) {
    return acc + trn.numPlayers;
  }, 0);
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

// Tourney::from and Tourney::_replace are identical to Tournaments..


// TODO: getter?
Tourney.prototype.currentStage = function () {
  return this._trns[0].matches;
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
  for (var i = 0; i < this._trns.length; i += 1) {
    var trn = this._trns[i];
    for (var k = 0; k < trn.matches.length; k += 1) {
      var m = trn.matches[k];
      var copy = {
        id: $.extend({ t: this.stage, p: i+1 }, m.id),
        p: m.p.slice()
      };
      if (m.m) {
        copy.m = m.m.slice();
      }
      this.matches.push(copy);
    }
  }

  var trns = this._createNext(/*this._stage*/);
  if (!trns.length) {
    this._done = true;
    return false;
  }
  this._stage += 1;
  this._trns = trns;
  var newMatches = prepTournaments(trns, this._stage);
  this.matches = this.matches.concat(newMatches);
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
  return this._trns[0].unscorable(id, score, allowPast);
};

Tourney.prototype.score = function (id, score, allowPast) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  // score in current tournament - we know _trn.unscorable passes at this point
  // TODO: score parallel
  if (this._trns[0].score(id, score, allowPast)) {
    this._ready = this._trns[0].isDone();
    return true;
  }
  return false;
};

Tourney.prototype.upcoming = function (playerId) {
  return $.extend({ t: this._stage }, this._trns[0].upcoming(playerId));
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
  var currRes = this._trns[0].results();
  // _oldRes maintained as results from previous stage(s)
  var knockedOutResults = this._oldRes.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(currRes, r.seed);
  });

  return currRes.concat(knockedOutResults);
};

module.exports = Tourney;
