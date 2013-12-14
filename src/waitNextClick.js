var Q = require("q");

module.exports = function (btn, value) {
  var d = Q.defer();
  btn.addEventListener("click", function listener (e) {
    btn.removeEventListener(listener);
    d.resolve(value);
  });
  return d.promise;
};
