var Q = require("q");
var requestAnimationFrame = require("./requestAnimationFrame");

function timeoutWithTicks (promise, timeout, tickRate) {
  var d = Q.defer();
  promise.timeout(timeout, "timeout").then(d.resolve, d.reject).done();
  var end = Date.now()+timeout;
  if (!tickRate) {
    requestAnimationFrame(function loop () {
      if (d.promise.isFulfilled()) return;
      requestAnimationFrame(loop);
      d.notify((end-Date.now())/timeout);
    });
  }
  else {
    var i = setInterval(function () {
      if (d.promise.isFulfilled()) {
        clearInterval(i);
      }
      else {
        d.notify((end-Date.now())/timeout);
      }
    }, tickRate);
  }
  return d.promise;
}

module.exports = timeoutWithTicks;
