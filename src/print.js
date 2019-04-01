const {
  isPair,
  isNil,
  T_STRING,
  T_CHAR,
  T_SYMBOL,
  T_INT,
  T_FLOAT,
  T_BOOLEAN,
  T_PROC,
  T_NATIVE,
  T_PAIR,
  T_VECTOR,
  T_NULL,
  T_PORT
} = require("./types");

const { car, cdr } = require("./listUtils");

const chalk = require("chalk");
let level = 0;
const indent = () => " ".repeat(level);
const printExp = (exp, top = true) => {
  if (!exp) return "(undefined)";
  switch (exp.type) {
    case T_BOOLEAN:
      if (exp.value) return chalk.red("#t");
      else return chalk.red("#f");
    case T_CHAR:
      return chalk.green("#\\" + exp.value);
    case T_PORT:
      return chalk.blue(`[port ${exp.value.name}]`);
    case T_FLOAT:
    case T_INT:
      return chalk.yellow(exp.value.toString());
    case T_STRING:
      return !top ? chalk.green(`"${exp.value}"`) : exp.value;
    case T_SYMBOL:
      if (exp.phase !== -1) return `${exp.value}$${exp.phase}`;
      return exp.value;
    case T_PROC:
      if (exp.value.name) {
        return chalk.red(`[procedure ${exp.value.name}]`);
      }
      return chalk.red("[procedure]");
    case T_NATIVE:
      return chalk.red("[native-procedure]");
    case T_PAIR:
      let res = [];
      while (isPair(exp)) {
        res.push(printExp(car(exp), false));
        exp = cdr(exp);
      }
      if (isNil(exp)) {
        return `(${res.join(" ")})`;
      }
      const out = `(${res.join(" ")} . ${printExp(exp, false)})`;
      return out;
    case T_NULL:
      return "()";
    case T_VECTOR:
      return `#(${exp.value.map(e => printExp(e, false)).join(" ")})`;
    default:
      throw new Error("unknown type " + exp);
  }
};
const expToString = exp => {
  if (!exp) return "(undefined)";
  switch (exp.type) {
    case T_BOOLEAN:
      if (exp.value) return "#t";
      else return "#f";
    case T_CHAR:
      return "#\\" + exp.value;
    case T_PORT:
      return `[port ${exp.value.name}]`;
    case T_FLOAT:
    case T_INT:
      return exp.value.toString();
    case T_STRING:
      return `"${exp.value}"`;
    case T_SYMBOL:
      return exp.value;
    case T_PROC:
      if (exp.value.name) {
        return `[procedure ${exp.value.name}]`;
      }
      return "[procedure]";
    case T_NATIVE:
      return "[native-procedure]";
    case T_PAIR:
      let res = [];
      while (isPair(exp)) {
        res.push(expToString(car(exp)));
        exp = cdr(exp);
      }
      if (isNil(exp)) {
        return `(${res.join(" ")})`;
      }
      return `(${res.join(" ")} . ${expToString(exp)})`;
    case T_NULL:
      return "()";
    case T_VECTOR:
      return `#(${exp.value.map(expToString).join(" ")})`;
  }
};

module.exports.printExp = printExp;
module.exports.expToString = expToString;
