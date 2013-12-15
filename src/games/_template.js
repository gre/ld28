var Zanimo = require("zanimo");
var _ = require("lodash");
var Q = require("q");

var dom = require("../dom");
var smoothstep = require("smoothstep");
var dimensions = require("../dimensions");


function GAME () {
  console.log("new GAME()");
  this.el = document.createElement("div");
  this.el.className = "g-GAME";
}

GAME.prototype = {
  message: "MESSAGE",

  score: function () {
    return 0;
  },

  enter: function (container) {
    container.innerHTML = "";
    container.appendChild(this.el);

    var animation = Q();

    return animation;
  },

  submit: function () {
    return this.score();
  },

  leave: function () {
    this.leaving = true;

    var animation = Q();

    return animation;
  }
};

GAME.createForDifficulty = function (difficulty) {
  return new GAME();
};

module.exports = GAME;


