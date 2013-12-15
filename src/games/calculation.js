var Zanimo = require("zanimo");
var _ = require("lodash");
var Q = require("q");
var QanimationFrame = require("qanimationframe");

var dom = require("../dom");
var smoothstep = require("smoothstep");
var mix = require("../mix");
var dimensions = require("../dimensions");
var waitNextClick = require("../waitNextClick");

var ITEMS_TEXT = {
  "*": "×",
  "/": "÷"
};

var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function spiralDistribution (n, radius) {
  return _.map(_.range(0, n), function (s) {
    var a = s * GOLDEN_ANGLE;
    var r = Math.sqrt(s/n) * radius;
    return {
      x: Math.cos(a)*r,
      y: Math.sin(a)*r
    };
  });
}

function circularDistribution (n, radius) {
  return _.map(_.range(0, n), function (s) {
    var a = 2*Math.PI*s / n;
    var r = radius;
    return {
      x: Math.cos(a)*r,
      y: Math.sin(a)*r
    };
  });
}


function centerOrigin (el) {
  el.style.transformOrigin = "50% 50%";
  el.style.mozTransformOrigin = "50% 50%";
  el.style.webkitTransformOrigin = "50% 50%";
}


function RadioGroup (elements, x, width) {
  this.items = elements;
  this.x = x;
  this.width = width;
  this.selectedIndex = -1;
  this.el = document.createElement("div");
  this.el.className = "radio-group";
  this.el.style.left = x+"px";
  this.el.style.opacity = 0;
  this.el.style.width = width+"px";

  this.bull = document.createElement("div");
  this.bull.className = "bull";
  this.bull.style.top = ((dimensions.height-width)/2)+"px";
  this.bull.style.left = 0+"px";
  this.bull.style.width = width+"px";
  this.bull.style.height = width+"px";
  centerOrigin(this.bull);
  this.el.appendChild(this.bull);

  Zanimo.transform(this.bull, "rotate(0deg)");
  this.els = _.map(_.zip(this.items, circularDistribution(this.items.length, 0.3*width)), function (o) {
    var item = o[0], pos = o[1];
    var el = document.createElement("span");
    var color = Math.floor(255*Math.random());
    el.style.background = "hsl("+color+", 50%, 50%)";
    el.className = "item";
    el.innerHTML = ITEMS_TEXT.hasOwnProperty(item) ? ITEMS_TEXT[item] : item;
    this.bull.appendChild(el);
    QanimationFrame(el).then(function () {
      var r = el.getBoundingClientRect();
      var w = r.width, h = r.height;
      Zanimo.transform(el, "translate("+Math.round(pos.x+width/2-w/2)+"px, "+Math.round(pos.y+width/2-h/2)+"px)");
    });
    return el;
  }, this);
}

RadioGroup.prototype = {
  visibility: function (v, duration) {
    return Zanimo.transition(this.el, "opacity", v, duration);
  },
  rotate: function (turns, duration) {
    return Zanimo.transition(this.bull, "transform", "rotate("+(turns*360)+"deg)", duration, "cubic-bezier(0.680, -0.550, 0.265, 1.550)");
  },
  value: function () { // Return the selected element or undefined
    return this.items[this.selectedIndex];
  },
  selectIndex: function (i) {
    var oldIndex = this.selectedIndex;
    this.selectedIndex = i;
    if (oldIndex !== -1) {
      this.els[oldIndex].className = "item";
    }
    this.els[i].className = "item selected";
  },
  getIndex: function () {
    return this.selectedIndex; // convention
  }
};

function StaticElement (value, x, width) {
  this._value = value;
  this.x = x;
  this.width = width;
  this.el = document.createElement("div");
  this.el.style.opacity = 0;
  this.el.style.width = width+"px";
  this.el.style.left = x+"px";
  this.el.style.top = ((dimensions.height-100)/2)+"px";
  this.el.style.width = width+"px";
  this.el.style.height = this.el.style.lineHeight = "100px";
  this.el.className = "static-element";
  Zanimo.transform(this.el, "translate(0px, 0px)");
  this.el.innerHTML = ITEMS_TEXT.hasOwnProperty(value) ? ITEMS_TEXT[value] : value;
}

StaticElement.prototype = {
  visibility: function (v, duration) {
    return Zanimo.transition(this.el, "opacity", v, duration);
  },
  setSize: function (size, duration) {

  },
  move: function (x, y, duration) {

  },
  value: function () {
    return this._value;
  },
  getIndex: function () {
    return 0; // convention
  }
};

function Equation (components, correctPath) {
  this.components = components;
  this.correctPath = correctPath;
  this.el = document.createElement("div");
  this.el.className = "equation";
  _.each(this.components, function (comp) {
    this.el.appendChild(comp.el);
  }, this);
}

Equation.prototype = {
  getSelectedPath: function () {
    return _.map(this.components, function (comp) {
      return comp.getIndex();
    });
  },
  value: function () {
    // I'm lazy to do it properly and doing a fucking eval() here ;)
    var formula = _.reduce(this.components, function (formula, comp) {
      if (formula === undefined) return;
      var value = comp.value();
      if (value === undefined) return;
      return formula + value;
    }, "");
    if (!formula) return;
    try {
      var value = (0, eval)(formula);
      if (typeof value === "number" && !isNaN(value) && isFinite(value))
        return value;
    }
    catch (e) {
      console.log("Eval failed: "+e);
      console.log(e.stack);
    }
  }
};

Equation.generate = function (totalNumbers, operandsRadios, numbersRadios, extraChoices, maxChoices, availableNumbers, availableOperands) {
  var i;
  var totalOperands = totalNumbers - 1;
  operandsRadios = Math.min(totalOperands, operandsRadios);
  numbersRadios = Math.min(totalNumbers, numbersRadios);

  var numberRadiosIndexes = _.range(0, totalNumbers);
  for (i=totalNumbers; i>numbersRadios; i--) {
    numberRadiosIndexes.splice(Math.floor(Math.random()*numberRadiosIndexes.length), 1);
  }
  var operandRadiosIndexes = _.range(0, totalOperands);
  for (i=totalOperands; i>operandsRadios; i--) {
    operandRadiosIndexes.splice(Math.floor(Math.random()*operandRadiosIndexes.length), 1);
  }

  function interleave (numbers, operands) {
    var components = [ numbers[0] ];
    for (i=0; i<operands.length; ++i) {
      components.push(operands[i]);
      components.push(numbers[i+1]);
    }
    return components;
  }

  function getRandomNumber () {
    return _.sample(availableNumbers);
  }
  function getRandomOperand () {
    return _.sample(availableOperands);
  }

  function evaluate (formula) {
    try {
      return (0,eval)(_.reduce(formula, function (formula, op) {
        return formula + op;
      }, ""));
    }
    catch (e) {
      return undefined;
    }
  }

  function cloneComponents (components) {
    return _.map(components, function (c) {
      return _.clone(c);
    });
  }

  function pathToFormula (components, path) {
    return _.map(path, function (index, i) {
      if (components[i] instanceof Array)
        return components[i][index];
      else
        return components[i];
    });
  }

  function findPath (components, predicate) {
    function rec_findPath (i, indexes) {
      var result = predicate(indexes);
      if (result) return result;
      if (i>=components.length) return;
      if (components[i] instanceof Array) {
        return _.find(components[i], function (value, choiceIndex) {
          var indexesClone = _.clone(indexes);
          indexesClone[i] = choiceIndex;
          return rec_findPath(i+1, indexesClone);
        });
      }
      else {
        return rec_findPath(i+1, indexes);
      }
    }
    return rec_findPath(0, _.map(_.range(0, components.length), function(){ return 0; }));
  }

  function generate (maxTry) {
    if (maxTry===undefined) maxTry = 100;
    if (maxTry===0) throw new Error("BUG!");
    var numbers = _.map(_.range(0, totalNumbers), function (i) {
      var isMultipleChoice = _.contains(numberRadiosIndexes, i);
      return isMultipleChoice ? _.shuffle(availableNumbers) : getRandomNumber();
    });
    var operands = _.map(_.range(0, totalOperands), function (i) {
      var isMultipleChoice = _.contains(operandRadiosIndexes, i);
      return isMultipleChoice ? _.shuffle(availableOperands) : getRandomOperand();
    });
    var correctPath;
    var base = interleave(numbers, operands);
    findPath(base, function (path) {
      var formula = pathToFormula(base, path);
      if (evaluate(formula) === 1) {
        correctPath = path;
        return true;
      }
    });
    if (!correctPath) {
      return generate(maxTry-1);
    }

    var extrasRepartition = (function(){
      var choiceIndexes = _.filter(_.map(base, function (c, i) {
        if (c instanceof Array) { return i; }
      }, function (i) {
        return i !== undefined;
      }));
      var extrasRepartition = _.map(choiceIndexes, function (index) { return 0; });
      _.each(_.range(0, extraChoices), function () {
        var ind = Math.floor(Math.random()*extrasRepartition.length);
        extrasRepartition[ind] = Math.max(0, Math.min(maxChoices-2, extrasRepartition[ind]+1));
      });
      return _.map(base, function (c, i) {
        var index = _.indexOf(choiceIndexes, i);
        if (index !== -1) {
          return extrasRepartition[index];
        }
        else {
          return 0;
        }
      });
    }());

    var newCorrectPath = [];

    return {
      components: _.map(base, function (choices, i) {
        if (choices instanceof Array) {
          var solution = base[i][correctPath[i]];
          choices = [solution].concat(_.without(choices, solution)); // put solution on top
          choices = _.take(choices, 2 + extrasRepartition[i]);
          choices = _.shuffle(choices);
          newCorrectPath[i] = _.indexOf(choices, solution);
        }
        else {
          newCorrectPath[i] = 0;
        }
        return choices;
      }),
      correctPath: newCorrectPath
    };
  }

  var gen = generate();
  var wx = Math.floor(dimensions.width / gen.components.length);
  var w = wx - 10;
  var components = _.map(gen.components, function (c, i) {
    var x = Math.floor(i * wx);
    return c instanceof Array ? new RadioGroup(c, x, w) : new StaticElement(c, x, w);
  });
  return new Equation(components, gen.correctPath);
};

function Calculation (equation, score) {
  this.scoreIfWin = score;
  this.el = document.createElement("div");
  this.el.className = "g-calculation";
  this.el.style.fontSize = Math.round(100/equation.components.length)+"px";
  this.equation = equation;
  this.el.appendChild(this.equation.el);

  this.endD = Q.defer();
  this.end = this.endD.promise;
}

Calculation.prototype = {
  message: "Make it equals 1",

  score: function () {
    if (this.equation.value() !== 1) return 0;
    return this.scoreIfWin;
  },

  checkAllSelected: function () {
    var value = this.equation.value();
    if (value !== undefined) {
      this.endD.resolve(this.score());
      return true;
    }
  },

  bindRadioGroup: function (radioGroup) {
    var end = this.end;
    var checkAllSelected = _.bind(this.checkAllSelected, this);
    function onceRadioGroup () {
      return Q.race(_.map(radioGroup.els, waitNextClick))
        .then(function(elt){
          radioGroup.selectIndex(_.indexOf(elt.parentNode.children, elt));
        })
        .then(checkAllSelected)
        .then(function(allSelected){
          if (!allSelected) {
            return Q.race([end, onceRadioGroup() ]);
          }
        });
    }
    return Q.race([ end, onceRadioGroup() ]);
  },

  enter: function (container) {
    container.innerHTML = "";
    container.appendChild(this.el);

    var e = this.equation;
    var self = this;

    var animation = 
      Q.delay(50)
      .then(function () {
        return Q.all(_.map(e.components, function (comp, i) {
          return Q.delay(500*i).then(function(){
            return comp.visibility(1, 500);
          })
          .then(function(){
            if (comp instanceof RadioGroup) {
              return comp.rotate(2, 1500)
                .then(function(){
                  self.bindRadioGroup(comp);
                });
            }
          });
        }));
      });

    return animation;
  },

  submit: function () {
    return this.score();
  },

  leave: function () {
    this.leaving = true;
    var e = this.equation;
    var self = this;

    var score = this.score();
    var selectedPath = e.getSelectedPath();
    var path;
    if (score === 0) path = e.correctPath;
    else path = selectedPath;

    var goodElements = [];
    var failedElements = [];
    for (var i=0; i<path.length; ++i) {
      var els = e.components[i].els;
      if (els) {
        if (score === 0 && selectedPath[i] !== -1 && path[i] !== selectedPath[i]) {
          failedElements.push(els[selectedPath[i]]);
        }
        goodElements.push(els[path[i]]);
      }
    }

    _.each(failedElements, function (el) {
      el.className += " failed";
    });

    var toRemove = _.flatten(_.map(e.components, function (comp, i) {
      var els = _.clone(comp.els || [comp.el]);
      els.splice(path[i], 1);
      return els;
    }));

    var fadeOutInvalids = function () {
      return Q.all(_.map(toRemove, function (el, i) {
        var extra = _.contains(failedElements, el);
        return Q.delay(i*50 + extra ? 300 : 0)
          .then(function(){
            return Zanimo.transition(el, "opacity", 0, 200);
          });
      }));
    };

    var fadeOut = function () {
      return Q.all(_.map(e.components, function (comp, i) {
        return Q.delay(100*i).then(function(){
          return comp.visibility(0, 500);
        });
      }));
    };

    var displaySolution = function () {
      var size = e.components[0].width;
      return Q.all(_.map(goodElements, function (el) {
        return Q.all([
          Zanimo.transition(el, "transform", "translate(0px, 0px)", 200),
          Zanimo.transition(el, "width", "100%", 200),
          Zanimo.transition(el, "height", "100%", 200),
          Zanimo.transition(el, "font-size", "2em", 200),
          Zanimo.transition(el, "line-height", "2em", 200)
        ]);
      }));
    };

    var equality = document.createElement("div");
    equality.className = "equality "+(score>0?"valid":"invalid");
    equality.style.opacity = 0;
    equality.innerHTML = "= 1";
    Zanimo.transform(equality, "translateY(50px) scale(0)");
    this.el.appendChild(equality);

    var displayEquality = function () {
      return Zanimo.transition(equality, "opacity", 1, 200)
        .then(Zanimo.transitionf("transform", "translateY(0px) scale(1)", 500));
    };

    var hideEquality = function () {
      return Zanimo.transition(equality, "opacity", 0, 200);
    };

    return Q.delay(50)
      .then(fadeOutInvalids)
      .then(displaySolution)
      .then(displayEquality)
      .delay(500)
      .then(fadeOut)
      .then(hideEquality)
      .delay(200);
  }
};

Calculation.createForDifficulty = function (difficulty) {
  var difficultyRandomness = 0.3;
  var totalNumbers = Math.floor(mix(2, 5, mix(difficulty*difficulty, Math.random(), difficultyRandomness)));
  var numbers = Math.floor(mix(0, 4, mix(difficulty, Math.random(), difficultyRandomness)));
  var operands = Math.floor(mix(numbers===0?1:0, 3, mix(difficulty, Math.random(), difficultyRandomness)));

  var maxNumber = Math.floor(mix(10, 30, mix(difficulty, Math.random(), difficultyRandomness)));
  var availableNumbers = _.range(Math.random()<0.5 ? 0 : 1, maxNumber);
  var availableOperands = _.take(['+' , '-' , "*" , "/"], Math.floor(mix(2, 4, Math.random())));
  
  var equation = Equation.generate(
    totalNumbers,
    operands,
    numbers,
    Math.floor(mix(5, 0, mix(difficulty, Math.random(), difficultyRandomness))),
    Math.floor(mix(4, 12, mix(difficulty, Math.random(), difficultyRandomness))),
    availableNumbers,
    availableOperands
  );
  return new Calculation(equation, Math.round(mix(30, 120, difficulty)));
};

module.exports = Calculation;


