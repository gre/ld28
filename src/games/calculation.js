var Zanimo = require("zanimo");
var _ = require("lodash");
var Q = require("q");

var dom = require("../dom");
var smoothstep = require("smoothstep");
var mix = require("../mix");
var dimensions = require("../dimensions");

function RadioGroup (elements) {
  this.elements = elements;
  this.selectedIndex = -1;
}

RadioGroup.prototype = {
  value: function () { // Return the selected element or undefined
    return this.elements[this.selectedIndex];
  },
  selectValue: function (v) {
    this.selectedIndex = _.indexOf(this.elements, v);
  }
};

function StaticElement (value) {
  this._value = value;
}

StaticElement.prototype = {
  value: function () {
    return this._value;
  }
};

function Equation (components) {
  this.components = components;
}

Equation.prototype = {
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

Equation.generate = function (totalNumbers, operandsRadios, numbersRadios, decades, extraChoices, maxChoices) {
  var i;
  var maxNumber = 10 * (1+decades);
  var totalOperands = totalNumbers - 1;
  operandsRadios = Math.min(totalOperands, operandsRadios);
  numbersRadios = Math.min(totalNumbers, numbersRadios);
  var availableNumbers = _.range(0, maxNumber);
  var availableOperands = ['+','-'];

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
    return Math.floor(Math.random() * maxNumber);
  }
  function getRandomOperand () {
    return availableOperands[Math.floor(Math.random() * availableOperands.length)];
  }

  function evaluate (formula) {
    return (0,eval)(_.reduce(formula, function (formula, op) {
      return formula + op;
    }, ""));
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
        extrasRepartition[ind] = Math.min(maxChoices, extrasRepartition[ind]+1);
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

    return _.map(base, function (choices, i) {
      if (choices instanceof Array) {
        var solution = base[i][correctPath[i]];
        choices = [solution].concat(_.without(choices, solution)); // put solution on top
        choices = _.take(choices, 2 + extrasRepartition[i]);
        choices = _.shuffle(choices);
      }
      return choices;
    });
  }

  var components = _.map(generate(), function (n) {
    return n instanceof Array ? new RadioGroup(n) : new StaticElement(n);
  });
  return new Equation(components);
};

function Calculation (equation) {
  console.log("new Calculation()");
  this.el = document.createElement("div");
  this.el.className = "g-Calculation";

  this.equation = equation;
}

Calculation.prototype = {
  message: "Make it equals 1",

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

Calculation.createForDifficulty = function (difficulty) {
  var equation = Equation.generate(
    Math.floor(mix(2, 4, difficulty)),
    Math.floor(mix(0, 2, difficulty)),
    Math.floor(mix(1, 3, difficulty)),
    Math.floor(mix(0, 2, difficulty)),
    Math.floor(mix(5, 0, difficulty))
  );
  return new Calculation(equation);
};

module.exports = Calculation;


