var test = require('tap').test
  , Tourney = require('../')
  , Tournament = require('tournament');

test("tourney stages", function (t) {
  var Challenge = Tournament.sub('Challenge', function (opts, initParent) {
    var match = { id: { s: 1, r: 1, m: 1}, p: [1, 2] };
    initParent([match]);
  });
  Challenge.configure({
    invalid: function (np) {
      if (np !== 2) {
        return "Challenge can only have two players";
      }
      return null;
    }
  });
  Challenge.prototype._stats = function (res, m) {
    if (m.m && m.m[0] !== m.m[1]) {
      var w = (m.m[0] > m.m[1]) ? m.p[0] : m.p[1];
      Tournament.resultEntry(res, w).pos -= 1; // winner === winner of match
    }
    return res;
  };

  // create a Tourney that runs 3 challenges
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

  t.end();
});
