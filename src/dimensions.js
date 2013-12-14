var dom = require("./dom");
var rect = dom.$game.getBoundingClientRect();

module.exports = {
  width: rect.width,
  height: rect.height
};
