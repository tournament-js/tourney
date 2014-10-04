var Tourney = require(process.env.TOURNEY_COV ? '../tourney-cov.js' : '../')
  , Tournament = require('tournament');

// a silly tournament implementation to test Tourney with
var Challenge = Tournament.sub('Challenge', function (opts, initParent) {
  var ms = [];
  for (var i = 0; i < this.numPlayers/2; i += 1) {
    ms.push({ id: { s: 1, r: 1, m: i+1}, p: [2*i+1, 2*i+2] });
  }
  initParent(ms);
});
Challenge.configure({
  invalid: function (np) {
    if (np % 2 !== 0) {
      return "Challenge can only have a multiple of two players";
    }
    return null;
  }
});
Challenge.prototype._stats = function (res, m) {
  if (m.m && m.m[0] !== m.m[1]) {
    var w = (m.m[0] > m.m[1]) ? m.p[0] : m.p[1];
    var l = (m.m[0] > m.m[1]) ? m.p[1] : m.p[0];
    Tournament.resultEntry(res, w).pos = 1;
    Tournament.resultEntry(res, l).pos = this.numPlayers/2 + 1;
  }
  return res;
};

// create a Tourney that runs 2 challenges
var Trn = Tourney.sub('Trn', function (opts, initParent) {
  this.idx = 0;
  initParent(new Challenge(this.numPlayers));
});
Trn.configure({
  defaults: function (np, opts){
    return opts;
  },
  invalid: function (np, opts) {
    return Challenge.invalid(np, opts);
  }
});
Trn.prototype._mustPropagate = function () {
  return this.idx === 0;
};
Trn.prototype._createNext = function () {
  this.idx += 1;
  return Challenge.from(this._inst, 2);
};

exports.doubleChallenge = function (t) {
  t.equal(Trn.invalid(3), "Challenge can only have a multiple of two players");
  var trn = new Trn(2);
  t.ok(trn._inst instanceof Challenge, 'Trn made a Challenge instance');

  t.equal(trn.oldMatches.length, 0, "no cached the matches yet");
  t.equal(trn.matches.length, 1, "one match");
  t.deepEqual(trn.matches[0].id, { s:1, r:1, m:1 }, "all ones in id");

  t.ok(trn.score(trn.matches[0].id, [1,0]), "could score it");
  t.ok(trn.stageDone(), "challenge 1 stage complete");
  t.ok(trn.createNextStage(), "could create next stage");
  t.ok(!trn.isDone(), "but not yet done");

  t.ok(trn._inst instanceof Challenge, 'Trn made another Challenge instance');
  t.equal(trn.oldMatches.length, 1, "cached the match from first Challenge");

  t.ok(trn.score(trn.matches[0].id, [1,0]), "could score it");
  t.ok(trn.stageDone(), "challenge 2 stage complete");
  t.ok(!trn.createNextStage(), "could not create any more stages - complete");

  t.ok(trn.isDone(), 'tourney done');

  t.done();
};
