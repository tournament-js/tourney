var Tourney = require(process.env.TOURNEY_COV ? '../tourney-cov.js' : '../')
  , $ = require('interlude')
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
Challenge.prototype._safe = $.constant(true); // always allow rescore while in stage

// create a Tourney that runs 2 challenges
var Trn = Tourney.sub('Trn', function (opts, initParent) {
  Object.defineProperty(this, 'stages', { value: opts.stages });
  initParent(new Challenge(this.numPlayers));
});
Trn.configure({
  defaults: function (np, opts){
    opts.stages = (opts.stages | 0) ? (opts.stages | 0): 2;
    return opts;
  },
  invalid: function (np, opts) {
    return Challenge.invalid(np, opts);
  }
});
Trn.prototype._mustPropagate = function (stg) {
  return (stg < this.stages);
};
Trn.prototype._createNext = function () {
  return Challenge.from(this._inst, this.numPlayers / 2);
};

exports.challengeChain = function (t) {
  t.equal(Trn.invalid(7), "Challenge can only have a multiple of two players", 'in');
  var trn = new Trn(8); // by defaults, a 2-stage
  t.ok(trn._inst instanceof Challenge, 'Trn made a Challenge instance');

  t.equal(trn.oldMatches.length, 0, "no cached the matches yet");
  t.equal(trn.matches.length, 4, "matches");
  t.deepEqual(trn.matches.map($.get('p')),
    [ [1,2], [3,4], [5,6], [7,8] ],
    "match players contents"
  );
  t.deepEqual(trn.findMatch({s:1, r:1, m:4}), $.last(trn.matches), 'findMatch');
  t.deepEqual(trn.findMatches({r:1}), trn.matches, 'findMatches');

  t.ok(!trn.stageDone(), "stage not done - so the next thing will throw");
  try {
    trn.createNextStage();
  }
  catch (e) {
    t.equal(e.message, "cannot start next stage until current one is done", 'did');
  }

  t.deepEqual(trn.players(), $.range(8), "players");
  trn.matches.forEach(function (m) {
    t.ok(trn.score(m.id, [0, 1]), 'score lowest seed winning t1');
  });

  t.ok(trn.stageDone(), "challenge 1 stage complete");
  try {
    trn.complete();
  }
  catch (e) {
    t.equal(e.message, "cannot complete a tourney until it is done", "duh");
  }
  t.ok(trn.createNextStage(), "could create next stage");
  t.ok(!trn.isDone(), "but not yet done");

  t.ok(trn._inst instanceof Challenge, 'Trn made another Challenge instance');
  t.equal(trn.oldMatches.length, 4, "cached the matches from first Challenge");

  t.deepEqual(trn.players(), [2,4,6,8], 'winners forwarded');

  trn.matches.forEach(function (m) {
    t.ok(trn.score(m.id, [0,1]), 'score lowest seed winning t2');
  });

  t.ok(trn.stageDone(), "challenge 2 stage complete");
  t.ok(!trn.createNextStage(), "could not create any more stages - complete");

  t.ok(trn.isDone(), 'tourney done');
  var t2m1 = { s: 1, r: 1, m: 1 };
  t.ok(trn.score(t2m1, [0,2]), "can still rescore without past access");
  t.equal(trn.unscorable(t2m1, [0, 2]), null, "unscorable is slave to _safe");
  trn.complete(); // seal it

  t.equal(trn.oldMatches.length, 4+2, 'everything saved here now');
  t.equal(trn.matches.length, 0, 'and nothing left');
  t.ok(!trn.score({ s:1, r:1, m:1 }, [1,0]), "cannot rescore now");
  t.deepEqual(trn.oldMatches, [
      // stage 1
      { id: { t: 1, s: 1, r: 1, m: 1}, p: [1,2], m: [0,1] },
      { id: { t: 1, s: 1, r: 1, m: 2}, p: [3,4], m: [0,1] },
      { id: { t: 1, s: 1, r: 1, m: 3}, p: [5,6], m: [0,1] },
      { id: { t: 1, s: 1, r: 1, m: 4}, p: [7,8], m: [0,1] },
      // stage 2
      { id: { t: 2, s: 1, r: 1, m: 1}, p: [2,4], m: [0,2] }, // was rescored
      { id: { t: 2, s: 1, r: 1, m: 2}, p: [6,8], m: [0,1] }
    ], 'full match verification'
  );

  // verify results are sensible
  var expRes = [
    { seed: 4, wins: 0, for: 0, against: 0, pos: 1 },
    { seed: 8, wins: 0, for: 0, against: 0, pos: 1 },
    { seed: 2, wins: 0, for: 0, against: 0, pos: 3 },
    { seed: 6, wins: 0, for: 0, against: 0, pos: 3 },
    { seed: 1, wins: 0, for: 0, against: 0, pos: 5 },
    { seed: 3, wins: 0, for: 0, against: 0, pos: 5 },
    { seed: 5, wins: 0, for: 0, against: 0, pos: 5 },
    { seed: 7, wins: 0, for: 0, against: 0, pos: 5 }
  ];
  t.deepEqual(trn.results(), expRes, 'full results verification');

  // verify that we can chain this into another Tourney
  var from = Trn.from(trn, 2, { stages: 1 }); // explicity specify a 1-stage
  t.deepEqual(from.players(), [4,8], 'forwarded the top 2 from Tourney');
  t.deepEqual(trn.upcoming(4), trn.matches, "4 is in the final");
  t.deepEqual(from.matches[0].p, [4,8], 'and they are in m1');
  t.ok(from.score(from.matches[0].id, [1, 0]), 'score final');
  t.ok(from.isDone(), 'and it is done');
  from.complete();

  // verify results have been updated where it counts
  expRes[1].pos = 2;
  t.deepEqual(from.results(), expRes, 'from results verification');

  // Ensure Matches in oldMatches are all Tourney style Ids with their own toString
  t.equal(from.oldMatches.length, 1, "one match in this tourney"); // TODO: copy old?
  t.equal($.last(from.oldMatches).id + '', "T1 S1 R1 M1", "id relative to this trn");

  t.done();
};
