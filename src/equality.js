const { isProcedure, isNumber, True, False } = require("./types");
const isSameType = (a, b) => {
  if (a.type !== b.type) {
    if (isNumber(a) && isNumber(b)) return true;
    if (isProcedure(a) && isProcedure(b)) return true;
    return false;
  }
  return true;
}
const isEqv = (a, b) => a.value === b.value ? True : False;
const isEqual = (a, b) => {
  if (a.type === "vector") {
    if (a.value === b.value) return True;
    if (a.value.length !== b.value.length) return False;
    for (let i = 0; i < a.value.length; i++) {
      if (isEqual(a.value[i], b.value[i]) === False) return False;
    }
    return True;
  }
  if (a.type === "pair") {
    if (a.value === b.value) return True;
    if (isEqual(a.value[0], b.value[0]) === False) return False;
    return isEqual(a.value[1], b.value[1]);
  }
  return isEqv(a, b);
}

module.exports.isSameType = isSameType
module.exports.isEqv = isEqv
module.exports.isEqual = isEqual
