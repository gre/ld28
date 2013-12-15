var Q = require("q");

module.exports = function (btn) {
  var d = Q.defer();
  btn.addEventListener("click", function listener (e) {
    btn.removeEventListener("click", listener);
    d.resolve(e.target);
  }, false);
  return d.promise;
};
