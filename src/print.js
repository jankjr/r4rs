const { isPair, isNil } = require("./types");

const { car, cdr } = require("./listUtils");

const chalk = require("chalk");
let level = 0;
const indent = () => " ".repeat(level);
const printExp = (exp, top = true) => {
  if (!exp) return "(undefined)";
  switch (exp.type) {
    case "boolean":
      if (exp.value) return chalk.red("#t");
      else return chalk.red("#f");
    case "char":
      return chalk.green("#\\" + exp.value);
    case "port":
      return chalk.blue(`[port ${exp.value.name}]`);
    case "float":
    case "int":
      return chalk.yellow(exp.value.toString());
    case "string":
      return !top ? chalk.green(`"${exp.value}"`) : exp.value;
    case "symbol":
      if (exp.phase !== -1) return `${exp.value}$${exp.phase}`;
      return exp.value;
    case "procedure":
      if (exp.value.name) {
        return chalk.red(`[procedure ${exp.value.name}]`);
      }
      return chalk.red("[procedure]");
    case "native-procedure":
      return chalk.red("[native-procedure]");
    case "pair":
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
    case "null":
      return "()";
    case "vector":
      return `#(${exp.value.map(e => printExp(e, false)).join(" ")})`;
    default:
      throw new Error("unknown type " + exp);
  }
};
const expToString = exp => {
  if (!exp) return "(undefined)";
  switch (exp.type) {
    case "boolean":
      if (exp.value) return "#t";
      else return "#f";
    case "char":
      return "#\\" + exp.value;
    case "port":
      return `[port ${exp.value.name}]`;
    case "float":
    case "int":
      return exp.value.toString();
    case "string":
      return `"${exp.value}"`;
    case "symbol":
      return exp.value;
    case "procedure":
      if (exp.value.name) {
        return `[procedure ${exp.value.name}]`;
      }
      return "[procedure]";
    case "native-procedure":
      return "[native-procedure]";
    case "pair":
      let res = [];
      while (isPair(exp)) {
        res.push(expToString(car(exp)));
        exp = cdr(exp);
      }
      if (isNil(exp)) {
        return `(${res.join(" ")})`;
      }
      return `(${res.join(" ")} . ${expToString(exp)})`;
    case "null":
      return "()";
    case "vector":
      return `#(${exp.value.map(expToString).join(" ")})`;
  }
};

module.exports.printExp = printExp;
module.exports.expToString = expToString;
