module.exports = {
  opacity: function (el, op) {
    el.style.opacity = op;
  },
  show: function (el) {
    el.removeAttribute("hidden");
  },
  hide: function (el) {
    el.setAttribute("hidden", "");
  },
  $time: document.getElementById("time"),
  $container: document.getElementById("container"),
  $game: document.getElementById("game"),
  $title: document.querySelector("header > .title"),
  $score: document.getElementById("score"),
  $cancel: document.getElementById("cancel"),
  $help: document.getElementById("help")
};
