var Base = require('./');

var stageAttach = function (ms, stage) {
  ms.forEach(function (m) {
    m.id.t = stage;
  });
};

// signature => Ctor usage as in ffadynamic.js
// TODO: find sensible start signatures so we can implement .sub
function Dynamic(trn) {
  this._trn = trn;
  this._ready = false;
  this._stage = 1;
  stageAttach(trn.matches, this._stage);
  this.numPlayers = trn.numPlayers; // TODO: initial always good starting point?
  this.matches = trn.matches.slice();
}

Dynamic.inherit = function (Klass, Initial) {
  Initial = Initial || Dynamic;
  Klass.prototype = Object.create(Initial.prototype);

  // TODO: defaults for _verify _progress _limbo _early and _initResult ?
  Klass.idString = Initial.idString;
  Object.defineProperty(Klass.prototype, 'rep', {
    value: Klass.idString
  });

  // TODO: configure?
  Klass.inherit = function (SubKlass) {
    return Initial.inherit(SubKlass, Klass);
  };

  // TODO: sub?
};

Dynamic.prototype.endStage = function () {
  if (!this._ready) {
    throw new Error("cannot start next stage until current one is done");
  }

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

  this._stage += 1;
  this._trn = this._nextStage();
  stageAttach(this._trn.matches, this._stage);
  this.matches = this.matches.concat(this._trn.matches);
  this._ready = false;
};

Dynamic.prototype.stageDone = function () {
  return this._ready;
};

Dynamic.prototype.unscorable = function (id, score, allowPast) {
  if (id.t != null && id.t !== this._stage) {
    return "cannot rescore finished stages";
  }
  // Note that classical tournaments just disregard the id.t flag
  return this._trn.unscorable(id, score, allowPast);
};

Dynamic.prototype.score = function (id, score, allowPast) {
  var invReason = this.unscorable(id, score, true);
  if (invReason !== null) {
    console.error("failed scoring match %s with %j", this.rep(id), score);
    console.error("reason:", invReason);
    return false;
  }
  // score in current tournament - we know _trn.unscorable passes at this point
  if (this._trn.score(id, score, allowPast)) {
    // copy score to global match list
    //this.findMatch($.extend({ t: this._stage }, id)).m = score;
    this._ready = this._trn.isDone();
    return true;
  }
  return false;
};

Dynamic.prototype.upcoming = function (playerId) {
  var id = this._trn.upcoming();
  if (!id) {
    // TODO: could predict across stage borders (broadly) if results[i].pos <= adv
    // though expensive for just this.. TODO: cache results?
  }
  if (id) {
    return $.extend({ t: this._stage }, id);
  }
};

// TODO: isDone
