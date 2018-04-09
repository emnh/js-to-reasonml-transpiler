var A = function(arg) { this.x = arg; };
exports.A = A;
exports.createA = function(arg) { 
  return new A(arg);
};
exports.acceptA1 = function(a) { return a.x; };
exports.scoped = {
  scoped2: {
    acceptA3: function(a) { return a.x; }
  },
  acceptA2: function(a) { return a.x; }
};
