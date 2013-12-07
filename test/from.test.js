var FfaTb = require('ffa-tb')
  , GsTb = require('groupstage-tb')
  , test = require('tap').test;

test("ffa-from-gs", function (t) {
  var gs = new GsTb(25, { groupSize: 5, limit: 5 });
  var ms = gs.currentStage();
  ms.forEach(function (m) {
    var bestScore = m.p[0] < m.p[1] ? [1,0] : [0,1];
    gs.score(m.id, m.id.s === 1 ? [1,1] : bestScore);
  });
  var fullLen = ms.length;
  t.ok(gs.stageComplete(), 'gs stage done');
  t.ok(!gs.isDone(), 'but need to tiebreak');
  t.ok(gs.createNextStage(), 'could make tiebreakers');
  ms = gs.currentStage();
  t.equal(ms.length, fullLen / 5, "only one group needs breakers");
  ms.forEach(function (m) {
    gs.score(m.id, m.p[0] > m.p[1] ? [1,0] : [0,1]);
  });
  t.ok(gs.stageComplete, 'tb stage done');
  t.ok(gs.isDone(), 'no further tb stages needed');

  // TODO: make this work
  var ffa = FfaTb.from(gs, 5); // should be able to use defaults
  ms = ffa.currentStage();
  t.deepEqual(ms, [{ id: { s: 1, r: 1, m: 1 }, p: [21,22,23,24,25] }], 'one match');

  t.end();
});
