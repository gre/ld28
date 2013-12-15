var Zanimo = require("zanimo");
var _ = require("lodash");
var Q = require("q");

var dom = require("../dom");
var waitNextClick = require("../waitNextClick");
var smoothstep = require("smoothstep");
var dimensions = require("../dimensions");

var Qimage = require("qimage");
var imgCat = Qimage("assets/cat.svg");

function Cat (x, size) {
  this.el = document.createElement("canvas");
  this.el.style.opacity = 0;
  this.el.className = "cat";
  this.el.style.left = x+"px";
  this.el.width = size;
  this.el.height = size;
  this.ctx = this.el.getContext("2d");
  imgCat.then(_.bind(this.draw, this));
}

Cat.prototype = {
  draw: function (img) {
    var c = this.ctx;
    c.drawImage(img, 0, 0, c.canvas.width, c.canvas.height);
  },
  move: function (x, y, duration) {
    return Zanimo.transition(this.el, "transform", "translate("+x+"px,"+y+"px)", duration||0);
  },
  fadeIn: function (s) {
    return Zanimo.transition(this.el, "opacity", 1, s);
  },
  fadeOut: function (s) {
    return Zanimo.transition(this.el, "opacity", 0, s);
  },
  destroy: function () {
    this.el.parentNode.removeChild(this.el);
  }
};

function CatHouse (x, width, speed, sequenceIn, sequenceOut, nbAtTheEnd) {
  this.width = width;
  this.speed = speed;
  this.sequenceIn = sequenceIn;
  this.sequenceOut = sequenceOut;
  this.nbAtTheEnd = nbAtTheEnd;
  this.el = document.createElement("div");
  this.el.className = "cathouse";
  this.el.style.left = x+"px";
  this.el.style.width = width+"px";
  this.house = document.createElement("canvas");
  this.house.className = "house";
  this.house.height = this.house.width = Math.min(120, width);
  this.house.style.left = ((width-this.house.width)/2)+"px";
  this.house.style.top = ((dimensions.height-this.house.height)/2)+"px";
  this.ctx = this.house.getContext("2d");
  this.el.appendChild(this.house);
  this.btn = document.createElement("button");
  this.btn.className = "submit";
  this.btn.innerHTML = "This One!";
  this.btns = document.createElement("div");
  this.btns.className = "buttons";
  this.btns.appendChild(this.btn);
  dom.hide(this.btns);
  this.el.appendChild(this.btns);
  this.cats = [];
  this.totalCatsEntered = 0;
  this.totalCatsLeaved = 0;
  this.color = Math.floor(255*Math.random());
  this.drawHouse(0);
}

CatHouse.prototype = {
  drawHouse: function (lighted) {
    lighted = Math.min(7, lighted);
    var c = this.ctx;
    c.clearRect(0,0,c.canvas.width,c.canvas.height);
    c.save();
    c.scale(c.canvas.width, c.canvas.height);
    c.fillStyle = "hsl("+this.color+", 20%, 30%)";
    c.fillRect(0.2, 0.15, 0.05, 0.2);
    c.fillStyle = "hsl("+this.color+", 20%, 50%)";
    c.moveTo(0.5, 0);
    c.beginPath();
    c.lineTo(1, 0.5);
    c.lineTo(0.8, 0.5);
    c.lineTo(0.8, 1);
    c.lineTo(0.2, 1);
    c.lineTo(0.2, 0.5);
    c.lineTo(0, 0.5);
    c.lineTo(0.5, 0);
    c.fill();
    c.fillStyle = lighted & 1 ? "hsl(50, 80%, 80%)" : "rgba(0,0,0,0.1)";
    c.fillRect(0.55, 0.65, 0.2, 0.35);
    c.fillStyle = lighted & 2 ? "hsl(50, 80%, 80%)" : "rgba(0,0,0,0.1)";
    c.fillRect(0.25, 0.5, 0.2, 0.2);
    c.fillStyle = lighted & 4 ? "hsl(50, 80%, 80%)" : "rgba(0,0,0,0.1)";
    c.fillRect(0.6, 0.3, 0.1, 0.1);
    c.restore();
  },
  addCat: function () {
    var size = 50;
    var speed = this.speed;
    var cat = new Cat((this.width-size)/2, size);
    this.el.appendChild(cat.el);
    return cat.move(0,0)
      .then(function(){
        return cat.fadeIn(100);
      })
      .then(function(){
        return cat.move(0,dimensions.height / 2, speed);
      })
      .then(_.bind(function(){
        ++this.totalCatsEntered;
        this.cats.push(cat);
        this.drawHouse(Math.min(3, this.totalCatsEntered));
      }, this));
  },
  removeCat: function () {
    if (this.cats.length===0) return;
    var cat = this.cats.splice(0,1)[0];
    ++this.totalCatsLeaved;
    this.drawHouse(this.totalCatsEntered);
    return cat.move(0, dimensions.height, this.speed)
      .then(function(){
        return cat.fadeOut(100);
      })
      .then(function () {
        cat.destroy();
      });
  },
  runMoves: function () {
    var sin = this.sequenceIn;
    var sout = this.sequenceOut;
    var self = this;
    function moves (i) {
      var waits = [];
      if (sin[i]) {
        waits.push(self.addCat());
      }
      if (sout[i]) {
        waits.push(self.removeCat());
      }
      waits.push(Q.delay(self.speed));
      return Q.all(waits)
        .delay(50)
        .then(function () {
          if (i < sin.length || i < sout.length)
            return moves(i+1);
          else {
            if (self.totalCatsEntered - self.totalCatsLeaved !== self.nbAtTheEnd) {
              throw new Error("Failure nbAtTheEnd assertion : "+[self.totalCatsEntered, self.totalCatsLeaved, self.nbAtTheEnd]);
            }
          }
        });
    }
    return Q.fcall(moves, 0);
  }
};

function Cats (nb, speed, seqlength) {
  console.log("new Cats("+nb+","+speed+")");
  this.el = document.createElement("div");
  this.el.className = "g-cats";

  var housesParams = _.map(_.range(0, nb), function (i) {
    var seqin  = _.map(_.range(0, seqlength), function () {
      return Math.random() < 0.8 ? 1 : 0;
    });
    var out = _.reduce(seqin, function (o, cat) {
      var leave = o.entered > 0 && Math.random() < 0.7 ? 1 : 0;
      var seq = o.seq.concat([ leave ]);
      return { entered: o.entered + cat - leave, seq: seq };
    }, { entered: 0, seq: [] });
    var seqout = out.seq;
    var nbAtTheEnd = out.entered;
    return {
      seqin: seqin,
      seqout: seqout,
      nbAtTheEnd: nbAtTheEnd
    };
  });

  /// Now, we have to make sure there is only one house with one cat at the end...

  var oneHousesParams = _.filter(housesParams, function (h) {
    return h.nbAtTheEnd === 1;
  });
  var notOneHousesParams = _.difference(housesParams, oneHousesParams);
  
  var house, i;
  if (oneHousesParams.length === 0) {
    // Take a random house which need to be transform to a "one cat"
    house = notOneHousesParams.splice(Math.floor(Math.random()*oneHousesParams.length), 1)[0];
    if (house.nbAtTheEnd === 0) {
      // Just add one more cat in the sequence
      var noCats = house.seqin.map(function(cat,i){ return [cat,i]; }).filter(function(o){
        return o[0] === 0;
      });
      house.seqin[_.sample(noCats)[1]] = 1;
    }
    else {
      // Too much cats! Backward to add cats leave
      for (i=house.seqin.length-1; i>=0 && house.nbAtTheEnd!==1; --i) {
        if (house.seqout[i] === 0) {
          house.seqout[i] = 1;
          house.nbAtTheEnd --;
        }
      }
    }
    house.nbAtTheEnd = 1;
    oneHousesParams.push(house);
  }
  else if (oneHousesParams.length > 1) {
    while (oneHousesParams.length > 1) {
      house = oneHousesParams.splice(Math.floor(Math.random()*oneHousesParams.length), 1)[0];
      // Not enough cat, let's add one when we can
      for (i=0; i<house.seqin.length && house.nbAtTheEnd===1; ++i) {
        if (house.seqin[i] === 0) {
          house.seqin[i] = 1;
          house.nbAtTheEnd ++;
        }
      }
      // Because previous can fail, backward to remove some leave
      for (i=house.seqin.length-1; i>=0 && house.nbAtTheEnd===1; --i) {
        if (house.seqout[i] === 1) {
          house.seqout[i] = 0;
          house.nbAtTheEnd ++;
        }
      }
      notOneHousesParams.push(house);
    }
  }

  // Creating the houses

  var w = Math.floor(dimensions.width/nb);
  this.houses = _.map(housesParams, function (params, i) {
    var house = new CatHouse(i*w, w-20, speed, params.seqin, params.seqout, params.nbAtTheEnd);
    return house;
  });

  _.each(this.houses, function (house) {
    this.el.appendChild(house.el);
  }, this);

  this.end = Q.race(_.map(this.houses, function (catHouse) {
    return waitNextClick(catHouse.btn)
    .then(function () {
      return catHouse;
    });
  }))
  .then(function (catHouse) {
    var success = catHouse.nbAtTheEnd===1;
    return success ? 2*seqlength*nb : 0;
  });
}

Cats.prototype = {
  message: "Which house has 1 cat?",
  score: function () {
    return 0;
  },

  enter: function (container) {
    container.innerHTML = "";
    container.appendChild(this.el);
    var runs = _.map(this.houses, function (house) {
      return house.runMoves();
    });
    return Q.all(runs)
      .then(_.bind(function () {
        _.each(this.houses, function (house) {
          house.drawHouse(0);
          dom.show(house.btns);
        });
      }, this));
  },

  submit: function () {
    return this.score();
  },

  leave: function () {
    this.leaving = true;
    var houseSpeed = 1000;
    var catSpeed = 500;
    var catY = Math.round(dimensions.height * 0.6);
    var animateHouse = function (house, y, moveDuration) {
      return Zanimo.transition(house, "transform", "translateY("+y+"px)", moveDuration, "linear");
    };
    var animateCats = function (cats, width, y, duration) {
      if (cats.length === 0) return Q();
      var portion = 1/cats.length;
      return Q.all(_.map(cats, function (cat, i) {
        var x = Math.round((0.5+i)*portion*width - width/2);
        return cat.move(x, y, duration);
      }));
    };
    var animations = _.map(this.houses, function (catHouse) {
      var success = catHouse.nbAtTheEnd===1;
      if (!success) {
        catHouse.btn.innerHTML = "✘";
        catHouse.btn.setAttribute("disabled", "disabled");
        return Q.delay(1000)
          .then(function(){
            return Q.all([
              animateHouse(catHouse.house, -Math.round(0.9*catHouse.house.height), houseSpeed),
              animateCats(catHouse.cats, catHouse.width/2, catY, catSpeed)
            ]);
          });
      }
      else {
        catHouse.btn.innerHTML = "✓";
        catHouse.drawHouse(999);
        var cat = catHouse.cats[0];
        var x = Math.round(0.2*catHouse.house.width);
        return cat.move(x, dimensions.height / 2, catSpeed)
          .delay(50)
          .then(function(){
            cat.el.style.zIndex = 3;
            return cat.move(x, catY, catSpeed);
          });
      }
    });

    return Q.all(animations).delay(1000);
  }
};

Cats.createForDifficulty = function (difficulty) {
  var nb = 2+Math.round(Math.pow(difficulty, 1.5) * 4);
  var speed = Math.round(500+1000*Math.pow(1-difficulty, 1.2));
  var seqlength = Math.floor(2 + difficulty * difficulty * 8);
  return new Cats(nb, speed, seqlength);
};

Cats.loaded = Q.all([
  imgCat
]);

module.exports = Cats;
