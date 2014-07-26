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

exports.sequential = function (t) {
  // create a Tourney that runs 2 challenges
  var Trn = function Trn(np) {
    this.numPlayers = np;
    this.ch = new Challenge(np);
    this.idx = 0;
    Tourney.call(this, [this.ch]);
  };
  Tourney.inherit(Trn, Tourney);
  Trn.prototype._createNext = function () {
    if (this.idx >= 1) {
      return [];
    }
    this.idx += 1;
    this.ch = Challenge.from(this.ch, 2);
    return [this.ch];
  };

  var trn = new Trn(2);
  var stg = trn.currentStage()[0];
  t.ok(stg instanceof Challenge, 'Trn made a Challenge instance');

  t.equal(stg.matches.length, 1, "one match");
  t.deepEqual(stg.matches[0].id, { s:1, r:1, m:1 }, "all ones in id");

  t.ok(stg.score(stg.matches[0].id, [1,0]), "could score it");
  t.ok(trn.stageComplete(), "challenge 1 stage complete");
  t.ok(trn.createNextStage(), "could create next stage");

  var stg2 = trn.currentStage()[0];
  t.ok(stg2 instanceof Challenge, 'Trn made a Challenge instance');

  t.ok(stg2.score(stg2.matches[0].id, [1,0]), "could score it");
  t.ok(trn.stageComplete(), "challenge 2 stage complete");
  t.ok(!trn.createNextStage(), "could not create any more stages - complete");

  t.ok(trn.isDone(), 'tournament done');

  t.done();
};

exports.parallel = function (t) {
  // create a Tourney that runs 2x2 challenges
  var Trn = function Trn(np) {
    this.numPlayers = np;
    this.ch1 = new Challenge(np);
    this.ch2 = new Challenge(np);
    this.idx = 0;
    Tourney.call(this, [this.ch1, this.ch2]);
  };
  Tourney.inherit(Trn, Tourney);
  Trn.prototype._createNext = function () {
    if (this.idx >= 1) {
      return [];
    }
    this.idx += 1;
    this.ch1 = Challenge.from(this.ch1, 2);
    this.ch2 = Challenge.from(this.ch2, 2);
    return [this.ch1, this.ch2];
  };
  Trn.prototype.results = function () {
    return []; // need a parallel implementation of this
  };

  var trn = new Trn(2);
  var stgs = trn.currentStage();
  t.equal(stgs.length, 2, 'two challenges in first round');

  var stg1 = stgs[0];
  t.ok(stg1 instanceof Challenge, 'Trn made a Challenge instance 1');

  t.equal(stg1.matches.length, 1, "one match 1");
  t.deepEqual(stg1.matches[0].id, { s:1, r:1, m:1 }, "all ones in id 1");

  t.ok(stg1.score(stg1.matches[0].id, [1,0]), "could score it 1");
  t.ok(stg1.isDone(), 'stg1 is done');

  // ensure one stage partly done =!> stageComplete()
  t.ok(!trn.stageComplete(), "challenge 1 stage NOT complete");
  try {
    trn.createNextStage();
    t.ok(false, 'somehow created new stage');
  }
  catch (e) {
    t.ok(true, 'could not create new stage yet');
  }

  var stg2 = stgs[1];
  t.ok(stg2 instanceof Challenge, 'Trn made a Challenge instance 2');
  t.equal(stg2.matches.length, 1, "one match 2");
  t.deepEqual(stg2.matches[0].id, { s:1, r:1, m:1 }, "all ones in id 2");
  t.ok(stg2.score(stg2.matches[0].id, [1,0]), "could score it 2");
  t.ok(stg2.isDone(), 'stg2 is done');

  // but now we should be done with the stage
  t.ok(trn.stageComplete(), "challenge 1 stage complete");
  t.ok(trn.createNextStage(), "could create next stage");

  // verify second stage works equally

  var stgs2 = trn.currentStage();
  t.equal(stgs2.length, 2, 'two challenges in second round');


  var stg21 = stgs2[0];
  t.deepEqual(stg21.matches[0].id, { s:1, r:1, m:1 }, "all ones in id 1");
  t.ok(stg21.score(stg21.matches[0].id, [1,0]), "could score it 1");
  t.ok(stg21.isDone(), 'stg21 is done');

  var stg22 = stgs2[1];
  t.deepEqual(stg22.matches[0].id, { s:1, r:1, m:1 }, "all ones in id 2");
  t.ok(stg22.score(stg22.matches[0].id, [1,0]), "could score it 2");
  t.ok(stg22.isDone(), 'stg22 is done');

  t.ok(trn.stageComplete(), "challenge 2 stage complete");
  t.ok(!trn.createNextStage(), "could not create any more stages - complete");

  t.ok(trn.isDone(), 'tournament done');

  t.done();
};
