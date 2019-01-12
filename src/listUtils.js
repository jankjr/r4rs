const {
  isPair,
  isNil
 } = require("./types");

const assertPair = exp => {
  if (isPair(exp)) return true;
  throw new Error("not pair");
}
const assert = (t, msg) => {
  if (!t) throw new Error(msg);
  return true;
};
const car = exp => assertPair(exp) && exp.value[0];
const cdr = exp => assertPair(exp) && exp.value[1];
const listEach = (exp, fn) => {
  let i = 0;
  while(isPair(exp)) {
    fn(car(exp), i);
    i += 1;
    exp = cdr(exp);
  }
  if (!isNil(exp)) throw new Error("Invalid list");
}
const toList = exp => {
  if (isNil(exp)) return [];
  assertPair(exp);
  let out = [];
  while(isPair(exp)) {
    out.push(car(exp));
    exp = cdr(exp);
  }
  if (isNil(exp)) {
    return out;
  }
  throw new Error("Bad list")
}

module.exports = {
  assertPair,
  assert,
  car,
  cdr,
  listEach,
  toList
}