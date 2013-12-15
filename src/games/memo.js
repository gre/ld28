var Zanimo = require("zanimo");
var _ = require("lodash");
var Q = require("q");

var dom = require("../dom");
var smoothstep = require("smoothstep");
var dimensions = require("../dimensions");

var MARGIN = 16;

function getRandomColor () {
  return "hsl("+
    Math.floor(255*Math.random())+
    ", 60%, 60%)";
}

function Card (x, y, w, h, number) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
  this.number = number;
  this.el = document.createElement("div");
  this.el.className = "card";
  this.el.style.background = getRandomColor();
  this.el.style.width = w+"px";
  this.el.style.height = h+"px";
}

Card.prototype = {
  transform: function (x, y, scale, duration) {
    return Zanimo.transition(this.el, "transform", "translate("+x+"px, "+y+"px) scale("+scale+")", duration||0);
  },
  setVisibility: function (on) {
    this.visible = on;
    this.el.innerHTML = this.failed ? "✘" : on ? this.number : "";
  },
  setFailed: function (o) {
    this.failed = true;
    this.setVisibility(this.visible);
    this.el.style.background = "hsl(0,0%,60%)";
  }
};

function Memo (nbx, nby, total, invisibilityAfter) {
  console.log("new Memo("+nbx+","+nby+","+total+")");
  this.el = document.createElement("div");
  this.el.className = "g-memo";
  this.el.style.fontSize = (Math.round(2000/nby)/10)+"px";
  var cardxw = Math.floor((dimensions.width+MARGIN) / nbx);
  var cardyh = Math.floor((dimensions.height+MARGIN) / nby);
  this.cardw = Math.floor(cardxw - MARGIN);
  this.cardh = Math.floor(cardyh - MARGIN);
  this.cards = [];
  this.dispersionx = dimensions.width - cardxw;
  this.dispersiony = dimensions.height - cardyh;
  this.invisibilityAfter = invisibilityAfter;

  this.invisibility = Q.delay(this.invisibilityAfter)
    .then(_.bind(function () {
      if (this.leaving) return;
      return Q.all(_.map(this.cards, function (card) {
        return Q.delay(1000*Math.random())
                .then(_.bind(card.setVisibility, card, false));
      }));
    }, this));

  var numberOneIndexes = (function (withoutNumberOne, total) {
    return _.map(_.range(0, total), function () {
      return withoutNumberOne.splice(Math.floor(withoutNumberOne.length*Math.random()), 1)[0];
    });
  }(_.range(0, nbx*nby), total));

  for (var x=0; x<nbx; ++x) {
    for (var y=0; y<nby; ++y) {
      var i = x * nby + y;
      var number = _.contains(numberOneIndexes, i) ? 1 : Math.floor(2+9*Math.random()) % 10;
      var card = new Card(x*cardxw, y*cardyh, this.cardw, this.cardh, number);
      this.cards[i] = card;
      card.initialx = Math.round(dimensions.width/2  + (Math.random()-0.5)*this.dispersionx);
      card.initialy = Math.round(dimensions.height/2 + (Math.random()-0.5)*this.dispersiony);
      card.setVisibility(true);
      card.transform(card.initialx, card.initialy, 0).done();
    }
  }
  _.each(this.cards, function (card) {
    this.el.appendChild(card.el);
  }, this);
  this.endD = Q.defer();
  this.end = this.endD.promise;
  this.failures = 0;
  this.total = total;
  this.clicks = 0;
}

Memo.prototype = {
  message: "Click the 1's",
  onClick: function (e) {
    var target = e.target;
    if (target.className !== "card") return;
    var index = _.indexOf(target.parentNode.children, target);
    var card = this.cards[index];
    if (!card || card.destroyed) return;
    if (card.number !== 1) {
      card.setFailed(true);
      this.failures ++;
      return;
    }
    this.clicks ++;
    card.destroyed = true;
    card.transform(card.x, card.y, 0, 200)
      .then(_.bind(this.checkScore, this))
      .done();
  },

  score: function () {
    var bonus = this.clicks === this.total && this.failures === 0 ? 50 : 0;
    return Math.max(0, bonus + 10 * this.clicks - 20 * this.failures);
  },

  checkScore: function () {
    var score = this.score();
    this.endD.notify(score);
    if (this.clicks === this.total) {
      this.endD.resolve(score);
    }
  },

  bind: function () {
    this.el.addEventListener("click", this._onClick=_.bind(this.onClick, this));
  },

  unbind: function () {
    this.el.removeEventListener("click", this._onClick);
  },

  enter: function (container) {
    container.innerHTML = "";
    container.appendChild(this.el);
    var popAfterMax = 500;
    var scaleUp = 300;
    var speed = 600;
    var animation = _.partial(function (cards) {
      return Q.all(_.map(cards, function (card) {
        return Q()
          .delay(Math.floor(popAfterMax*Math.random()))
          .then(function () {
            return card.transform(card.initialx, card.initialy, 1, scaleUp);
          })
          .delay(10)
          .then(function () {
            return card.transform(card.x, card.y, 1, speed);
          });
      }));
    }, this.cards);

    Q.delay(50)
      .then(animation)
      .then(_.bind(this.bind, this));

    return animation;
  },

  submit: function () {
    return this.score();
  },

  leave: function () {
    this.leaving = true;
    this.unbind();

    var dispersion = 0.5;

    var animation = _.partial(function (cards, scaleDown, popAfterMax, moveOut) {
      return Q.all(_.map(cards, function (card) {
        if (card.destroyed) return Q();
        if (card.number === 1) card.setVisibility(true);
        return Q()
          .then(function(){
            return card.transform(card.x, card.y, card.number === 1 ? 1 : 0.8, scaleDown);
          })
          .delay(Math.floor((card.number===1 ? 500 : 0)+popAfterMax*Math.random()))
          .then(function () {
            var x = Math.round((Math.random()<0.5 ? -card.w/dimensions.width-dispersion*Math.random() : 1+dispersion*Math.random())*dimensions.width);
            var y = Math.round((Math.random()<0.5 ? -card.h/dimensions.height-dispersion*Math.random() : 1+dispersion*Math.random())*dimensions.height);
            return card.transform(x, y, 0, moveOut);
          });
      }));
    }, this.cards, 100, 300, 500);

    return Q.delay(50)
      .then(animation);
  }
};

Memo.createForDifficulty = function (difficulty) {
  var s = 3 + 7 * difficulty * difficulty;
  var w = Math.round(s);
  var h = Math.round(s * 2/3);
  var numberOfCards = Math.floor(1+w*h*smoothstep(0, 4, 1-Math.pow(1-difficulty, 1.5)));
  var invisibilityAfter = 2000 + 3000*smoothstep(0, 1, difficulty);
  return new Memo(w, h, numberOfCards, invisibilityAfter);
};

module.exports = Memo;
