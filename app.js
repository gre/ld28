var Q = require("q");
var _ = require("lodash");
var Qstart = require("qstart");
var Zanimo = require("zanimo");

var Memo = require("./game/memo");

var Games = [ Memo ]; // more to come...

function start () {
  return Q()
    .then(intro)
    .then(_.partial(runMiniGames, 10, 0))
    .then(outro);
}

function intro () { console.log("TODO intro"); }
function outro (score) { console.log("TODO outro", score); }

function runMiniGames (nb, totalScore) {
  if (nb <= 0) return totalScore;
  return Q.fcall(nextMiniGame, 0)
   .then(function (score) {
     console.log(totalScore, score);
     return runMiniGames(nb-1, totalScore+score);
   });
}

function gameSuccess (score) {
  console.log("TODO mini game Success");
  return score || 0;
}

function gameFailure () {
  console.log("TODO mini game Failed");
  return 0;
}

function nextMiniGame (difficulty) {
  var Game = Games[Math.floor(Math.random()*Games.length)];
  var game = Game.createForDifficulty(difficulty);
  var timeout = game.defaultTimeout || 10000;

  return Q()
    .then(game.enter)
    .then(_.partial(waitNextSubmitBeforeTimeout, timeout))
    .then(game.submit)
    .then(gameSuccess, gameFailure)
    .then(function (score) {
      return Q.fcall(game.leave).thenResolve(score);
    });
}

function waitNextSubmitBeforeTimeout (time) {
  return Q.fcall(waitNextSubmit).timeout(time);
}

// Watch the Ok button submission once
function waitNextSubmit () {
  var btn = document.getElementById("validate");
  var d = Q.defer();
  btn.addEventListener("click", function listener (e) {
    btn.removeEventListener(listener);
    d.resolve();
  });
  return d.promise;
}

Qstart.then(start).done();


