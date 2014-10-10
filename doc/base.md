# Tourney :: Commonalities
All tourney types follos some simple principles: There is always only:

- One active instance at a time
- One set of `.matches` pointing to this instance
- One common way of progressing/checking stage progression
- One API - a tourney of tourneys/tournaments is a tourneys

Each tourney inherits from a common base class, whose API mimics that of [tournament](https://npmjs.org/package/tournament). For full details you should skim [tournament's API](https://github.com/clux/tournament/blob/master/doc/base.md) because to avoid duplication, overlaps in the API are not as extensively covered herein.

In this document:

- Example implementations `GroupStageTb`, `FfaTb`, `GroupStageTbDuel` are referenced lightly.
- The variable `trn` refers to an instance of one such implementation.

# Base class

## Match methods
The **CURRENT** matches array (for the active stage) is available on `trn.matches`.

### trn.matches :: [Match]
Each element in the match array look exactly like a tournament's one:

```js
var match = trn.matches[0];
match;
{ id: { s: 1, r: 1, m: 1} },
  p: [ 1, 5, 12, 16 ], // these 4 seeds play
  m: [ 4, 3, 2, 1 ] }  // these are their scores (in order of players above)
```

### trn.findMatch(id) :: Match
The normal helper to get a match from the current matches array if it exists in there. Returns a single match, or undefined.

### trn.findMatches(idPartial) :: [Match]
Find all matches in the current matches array for which the set of properties of a partial id match.

### trn.oldMatches :: [Match]
A match array that gets populated with matches from earlier stages and have their match IDs extended with the stage number they were found in.

```js
var gs = new GroupStageTb(4, { groupSize: 2, limit: 2 });
gs.oldMatches; // []
gs.matches
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ] },
  { id: { s: 2, r: 1, m: 1 },
    p: [ 2, 3 ] } ]
gs.matches.forEach(function (m) { gs.score(m.id, [1,1]); });
gs.matches;
[ { id: { s: 1, r: 1, m: 1 },
    p: [ 1, 4 ],
    m: [ 1, 0 ] },
  { id: { s: 2, r: 1, m: 1 },
    p: [ 2, 3 ],
    m: [ 1, 0 ] } ]
gs.oldMatches; // []
gs.createNextStage(); // true
gs.oldMatches;
[ { id: { s: 1, r: 1, m: 1, t: 1 },
    p: [ 1, 4 ],
    m: [ 1, 1 ] },
  { id: { s: 2, r: 1, m: 1, t: 1 },
    p: [ 2, 3 ],
    m: [ 1, 1 ] } ]
gs.matches; // tiebreakers for stage 1
```

Note that if you include a variable length tourney (perhaps due to including tiebreakers), and the first instance needs 3 stages to complete, then matches under stage 1, 2 and 3 will exist in oldMatches and correspond to these stages. Any future stage will be added under a stage number >3 to avoid clashes.

Note that it does **NOT** contain matches from the current stage as these are not ID-extended for the current stage yet.

### Proposed: trn.allMatches() :: [Match]
**Proposed** future method to get the concatenation of `oldMatches` and `.matches` where the latter have had their match ids stage extended. UI is still up in the air so it's not implemented yet.


### trn.results() :: [Result]
Return the current minimally guaranteed results for each player in the tourney, sorted by current minimally attained position.

### trn.upcoming(playerId) :: [Match]
Return the upcoming matches for a given player from the current match array.

### trn.isDone() :: Boolean
Returns whether or not the tourney is finished, i.e. all sub stages have been completed.

## Progress methods
### trn.score(matchId, mapScore) :: Boolean
Moves the current stage along. Attaches `mapScore` array to the match in the current `matches` array with the given `matchId` (not stage id extended) provided `trn.unscorable` did not complain.

If `trn.unscorable(matchId, mapScore, true)` returns a string, `score` will return `false` and log this string. Otherwise this method will return true and update the match.

### trn.unscorable(matchId, mapScore, allowPast) :: String || Null
Return the String reason why the match with the given `matchId` cannot be `score()`d with the current `mapScore`.

You should *NOT* use the `allowPast` option unless you are an admin explicitly rewriting history of an erroneously scored tournament.

If scoring is safe, this function will return `null`. Always guard on this to ensure `score()` succeeds. If `score()` is attempted without this check, `trn.score()` will log the error and not do the scoring.

If you do NOT guard, you will implicitly allow past matches to be re-scored, which you probably do not want.

# Tourney only methods
The following methods are unique to `Tourney` implementations and distinguish them from `Tournament` implementations. This is mainly because `Tournament` requires all matches created up front, whereas `Tourney` requires chunks of matches created up front per stage.

### trn.stageDone() :: Boolean
Return whether the current stage is complete.

### trn.createNextStage() :: Boolean
Locks down the current stage (so it can no longer be `score`d), move current `.matches` into `oldMatches` with current stage number extended into the ids. Then update `.matches` with the matches from the next instance.

Returns whether or not stage creation was possible (i.e. it returns `trn.stageDone() && !trn.isDone()`).

### trn.complete()
Method to lock down the last stage and move the last `.matches` into `.oldMatches` with last stage number extended into the ids. Then clear the current `.matches` array.

This will prevent any future scoring.

# Common conventions
Same details as for [tournaments](https://github.com/clux/tournament/blob/master/doc/base.md) apply for the following sections that have only been stubbed out:

## Ensuring Consistency
Briefly; always guard on `unscorable` before calling `score`.

## Ensuring Constructibility
Briefly; always guard on `.invalid(np, opts)` before doing `new SomeTourney(np, opts)`.
