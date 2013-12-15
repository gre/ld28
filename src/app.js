var Q = require("q");
var _ = require("lodash");
var Qstart = require("qstart");
var Zanimo = require("zanimo");
var dom = require("./dom");
var waitNextClick = require("./waitNextClick");
var Games = require("./games");
var intro = require("./intro");
var outro = require("./outro");
var timeoutWithTicks = require("./timeoutWithTicks");
var stats = require("./stats.js");

var never = Q.defer().promise;

function start () {
  return Q()
    .then(intro)
    .then(_.partial(runMiniGames, 10, 0))
    .then(outro);
}

function runMiniGames (nb, totalScore) {
  if (nb <= 0) return totalScore;
  stats.setTimeProgress(1);
  stats.setScore(totalScore);
  var difficulty = (10-nb) / 10;
  return Q.fcall(nextMiniGame, difficulty, totalScore)
    .then(function (score) {
      return runMiniGames(nb-1, totalScore+score);
    });
}

function gameSuccess (score) {
  return score || 0;
}

function gameFailure (e) {
  if (e.message !== "timeout" && e.message !== "cancelled") {
    console.log(e);
    console.log(e.stack);
  }
  return 0;
}

function nextMiniGame (difficulty, totalScore) {
  var Game = Games[Math.floor(Math.random()*Games.length)];
  var game = Game.createForDifficulty(difficulty);
  var timeout = game.defaultTimeout || 10000;
  var gameEnd = game.end || never;

  dom.$help.innerHTML = game.message || "";

  return Q()
    .then(function(){
      return Q.race([
        Q.fcall(_.bind(game.enter, game), dom.$game),
        waitNextCancel().then(function(e){ return Q.reject(new Error("cancelled")); })
      ]);
    })
    .then(function () {
      return Q.race([
        gameEnd
          .progress(function (score) {
            stats.setScore(totalScore+score);
          }),
        timeoutWithTicks(Q.race([gameEnd, waitNextCancel()]), timeout)
          .progress(stats.setTimeProgress)
          .then(_.bind(game.submit, game))
      ]);
    })
    .then(gameSuccess, gameFailure)
    .then(function (score) {
      return Q.fcall(_.bind(game.leave, game)).thenResolve(score);
    });
}

function waitNextCancel () {
  return waitNextClick(dom.$cancel);
}

Q.all([
  Qstart,
  Q.all(_.map(Games, function (G) { return G.loaded || Q(); }))
]).delay(200).then(start).done();

window.Q = Q;
window._ = _;
