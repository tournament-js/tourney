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

var invalid = function (trns) {
  if (!Array.isArray(trns) || !trns.length) {
    return "Cannot create tourney without a starting stage";
  }
  for (var i = 0; i < trns.length; i += 1) {
    var trn = trns[i];
    // NB: Want to check (trn instanceof Tournament), but this won't work if
    // the required version of tournament is slightly different - thus fuzzy check
    if (Object(trn) !== trn) {
      return "Stage 1 tourney " + i + " isn't a Tournament";
    }
    if (!Array.isArray(trn.matches)) {
      return "Stage 1 tourney " + i + " does not have matches";
    }
    if (!trn.numPlayers) {
      return "Stage 1 tourney " + i + " does not have positive numPlayers";
    }
  }
  return null;
};

function Tourney(trns) {
  var invReason = invalid(trns);
  if (invReason !== null) {
    throw new Error(invReason);
  }
  this._trns = trns;
  this._ready = false;
  this._done = false;
  this._stage = 1;
  this._oldRes = [];
  this.matches = prepTournaments(trns, this._stage);

  this.numPlayers = this._trns.reduce(function (acc, trn) {
    return acc + trn.numPlayers;
  }, 0);
}

Tourney.inherit = function (Klass, Initial) {
  Initial = Initial || Tourney;
  Klass.prototype = Object.create(Initial.prototype);

  // TODO: defaults for _verify _progress _limbo _early and _initResult ?
  Klass.prototype.rep = Klass.idString;

  Klass.inherit = function (SubKlass) {
    return Initial.inherit(SubKlass, Klass);
  };
};

// Tourney::from and Tourney::_replace are identical to Tournaments..


// TODO: getter?
Tourney.prototype.currentStage = function (p) {
  return this._trns[(p - 1) || 0].matches;
};

//Tourney.prototype.currentPlayers = function (partialId) {
//  return this._trn.players(partialId);
//};

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
  var p = (id.p - 1) || 0
  if (p != null && p >= this._trns.length) {
    return "invalid parallel stage number";
  }
  // Note that classical tournaments just disregard the id.t flag
  return this._trns[p].unscorable(id, score, allowPast);
};

Tourney.prototype.score = function (id, score, allowPast) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  // score in current tournament - we know _trn.unscorable passes at this point
  var p = (id.p - 1) || 0;
  if (this._trns[p].score(id, score, allowPast)) {

    this._ready = this._trns.reduce(function (acc, trn) {
      return acc && trn.isDone();
    }, true);

    return true;
  }
  return false;
};

Tourney.prototype._parallelGuard = function (name) {
  if (this._trns.length > 1) {
    var str = "No default " + name + " implementation for parallel stages exist";
    throw new Error(str);
  }
};

Tourney.prototype.upcoming = function (playerId) {
  this._parallelGuard('Tourney::upcoming');
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

/**
 * results
 *
 * default implementation for non-parallel touraments
 * for parallel stages, results makes no sense and implementations have to define
 * what it means by either manually merging, or doing their own computations
 */
Tourney.prototype.results = function () {
  this._parallelGuard('Tourney::results');
  var currRes = this._trns[0].results();
  // _oldRes maintained as results from previous stage(s)
  var knockedOutResults = this._oldRes.filter(function (r) {
    // players not in current stage exist in previous results below
    return !resultEntry(currRes, r.seed);
  });

  return currRes.concat(knockedOutResults);
};

module.exports = Tourney;
