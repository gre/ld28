var Q = require("q");
var QanimationFrame = require("qanimationframe");
var _ = require("lodash");
var Zanimo = require("zanimo");
var dom = require("./dom");
var waitNextClick = require("./waitNextClick");

var el = document.createElement("div");
el.className = "intro";

var title = document.createElement("h1");
title.className = 'title';
title.innerHTML = dom.$title.innerHTML;
el.appendChild(title);

var btn = document.createElement('button');
btn.className = 'start';
btn.innerHTML = 'Start';
el.appendChild(btn);

function intro () {
  dom.$help.innerHTML = "";
  dom.opacity(dom.$title, 0);
  dom.opacity(dom.$cancel, 0);
  dom.$game.innerHTML = "";
  dom.$game.appendChild(el);
  return Zanimo.transform(el, "translate(0, -100px) scale(0.5)")
    .then(Zanimo.transitionf("transform", "translate(0, 100px) scale(1)", 200, "ease-out"))
    .then(_.partial(waitNextClick, btn))
    .then(_.partial(dom.opacity, btn, 0))
    .thenResolve(el)
    .then(Zanimo.transitionf("transform", "translate(0, -100px) scale(0.5)", 500, "ease-out"))
    .then(_.partial(dom.opacity, dom.$title, 1))
    .then(_.partial(dom.opacity, dom.$cancel, 1))
    .then(_.partial(dom.hide, el));

}

module.exports = intro;
