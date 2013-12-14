
var dom = require("./dom");

function setScore (score) {
  var html = "00000000000000"+score;
  dom.$score.innerHTML = html;
}

function setTimeProgress (remaining) {
  dom.$time.style.width = (100*remaining)+"%";
}

module.exports = {
  setScore: setScore,
  setTimeProgress: setTimeProgress
};
