var $ = require('interlude')
  , Tourney = require(process.env.TOURNEY_COV ? '../tourney-cov.js' : '../')
  , Tournament = require('tournament');

// simple tournament without progression and is just done when everything is
var SomeT = Tournament.sub('SomeT', function (opts, initParent) {
  this.opts = opts;
  var ms = [
    { id: { s: 1, r: 1, m: 1 }, p: [1,2] },
    { id: { s: 1, r: 1, m: 2 }, p: [3,4] },
  ];
  initParent(ms);
});
SomeT.configure({ invalid: $.constant(null) });

// simple tourney that creates 2 stages of SomeTs
function TestTrn(numPlayers) {
  if (numPlayers !== 8) {
    throw new Error("TestTrn must consist of 8 players");
  }
  var trns = [new SomeT(4), new SomeT(4)];
  this.playedR1 = false;
  Tourney.call(this, trns);
}
Tourney.inherit(TestTrn, Tourney);
// when stage one is done, we can _createNext
TestTrn.prototype._createNext = function () {
  if (this.playedR1) {
    return null;
  }
  this.playedR1 = true;
  return new SomeT(4); // round 2 is the only 'next' stage
};
TestTrn.prototype.results = $.constant([]); // noop results

exports.stages = function (t) {
  var trn = new TestTrn(8);
  var stage1 = trn.currentStage();
  t.equal(stage1.length, 2, "two SomeTs in first stage");
  var t1 = stage1[0];
  var t2 = stage1[1];
  t.ok(t1 instanceof SomeT, "t1 is SomeT");
  t.ok(t2 instanceof SomeT, "t2 is SomeT");
  t.ok(!t1.isDone(), "t1 not done yet in first stage");
  t.ok(!t2.isDone(), "t2 not done yet in first stage");

  // score stage 1
  t1.matches.forEach(function (m) {
    t1.score(m.id, [2,1]);
  });
  t2.matches.forEach(function (m) {
    t2.score(m.id, [2,1]);
  });
  t.ok(t1.isDone(), "t1 done in first stage");
  t.ok(t2.isDone(), "t2 done in first stage");

  // move to stage 2
  t.ok(trn.stageComplete(), "stage 1 is complete now");
  t.ok(trn.createNextStage(), "could create next stage");

  // verify we can't score tournaments in past stages
  try { t1.score(t1.matches[0].id, [1,0]); }
  catch (e) {
    t.equal(e.message, 'Cannot score a tournament in a tourney after stage complete', 'throw');
  }

  // score stage 2
  var stage2 = trn.currentStage();
  t.equal(stage2.length, 1, "one SomeT in second stage");
  var last = stage2[0];
  t.ok(!last.isDone(), "last is not done");
  last.matches.forEach(function (m) {
    last.score(m.id, [2,1]);
  });
  t.ok(last.isDone(), "last done in second stage");
  t.ok(trn.stageComplete(), "stage 2 complete");
  t.ok(!trn.createNextStage(), "no more stages");
  t.ok(trn.isDone(), "done flag set after failing to createNext");

  t.done();
};
