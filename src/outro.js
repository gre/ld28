var Q = require("q");
var QanimationFrame = require("qanimationframe");
var _ = require("lodash");
var Zanimo = require("zanimo");
var dom = require("./dom");
var waitNextClick = require("./waitNextClick");

var $el = document.createElement("div");
$el.className = "outro";

var $title = document.createElement("h1");
$title.innerHTML = "Your score:";
$el.appendChild($title);

var $score = document.createElement("h2");
$score.className = "score";
$el.appendChild($score);

function outro (score) {
  dom.$help.innerHTML = "";
  dom.$game.innerHTML = "";
  dom.$game.appendChild($el);
  $score.innerHTML = ""+score;
}

module.exports = outro;
