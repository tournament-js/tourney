var $ = require('autonomy');

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
  this._done = false;
  this._stage = 1;
  this._oldRes = [];
  this.numPlayers = 0;
  this._trns = trns;

  this.numPlayers = this._trns.reduce(function (acc, trn) {
    acc += trn.numPlayers;
  }, 0);
  this.matches = [];
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

// TODO: Tourney::from and Tourney::_replace

// public exposure of tournaments - shallow copy  as to not mess up _trns array
Tourney.prototype.currentStage = function () {
  return this._trns.slice();
};

var disabledScore = function () {
  throw new Error("Cannot score a tournament in a tourney after stage complete");
};

Tourney.prototype.createNextStage = function () {
  if (!this.stageComplete()) {
    throw new Error("cannot start next stage until current one is done");
  }

  // update oldRes at end of each stage
  // NB: this.results() has more info than this._trns[i].results()
  this._oldRes = this.results(); // NB: forces an implementation in parallel mode

  // copy finished rounds matches into big list under a stage guarded ID
  for (var i = 0; i < this._trns.length; i += 1) {
    var trn = this._trns[i];

    for (var k = 0; k < trn.matches.length; k += 1) {
      var m = trn.matches[k];
      var copy = {
        id: $.extend({ t: this._stage, p: i+1 }, m.id),
        p: m.p.slice()
      };
      if (m.m) {
        copy.m = m.m.slice();
      }
      this.matches.push(copy);
    }
    trn.score = disabledScore;
  }

  var trns = this._createNext(/*this._stage*/);
  if (!trns.length) {
    this._done = true;
    // NB: this._trns left untouched
    return false;
  }
  this._stage += 1;
  this._trns = trns;
  return true;
}
;
Tourney.prototype.stageComplete = function () {
  return this._trns.every(function (tr) {
    return tr.isDone();
  });
};

Tourney.prototype._parallelGuard = function (name) {
  if (this._trns.length > 1) {
    var str = "No default " + name + " implementation for parallel stages exist";
    throw new Error(str);
  }
};

Tourney.prototype.upcoming = function (playerId) {
  // TODO: maybe extend so we just specify which .p rather than parallelGuard
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
