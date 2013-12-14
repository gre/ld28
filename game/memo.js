
function Memo (nbx, nby) {
  console.log("new memo");
}

Memo.prototype = {
  enter: function () {
    console.log("enter");
  },

  submit: function () {
    console.log("submit");
    return 1; // score
  },

  leave: function () {
    console.log("leave");
  }
};

Memo.createForDifficulty = function (i) {
  return new Memo(4, 4);
};

module.exports = Memo;
