// predicates for distinct types

const make = (type, value, phase) => phase ? ({ type, value, phase }) : ({ type, value });
const pair = (a, b) => make("pair", [a, b]);
const nil = make("null", null);
module.exports.make = make
module.exports.True = make("boolean", true);
module.exports.False = make("boolean", false);
module.exports.pair = pair
module.exports.nil = nil;
module.exports.symbol = (name, phase) => !phase ? make("symbol", name) : make("symbol", name, phase);
module.exports.list = (entries, first = nil) => entries.reduceRight((l, r) => pair(r, l), first)
module.exports.isPair = exp => exp.type === "pair";
module.exports.isVector = exp => exp.type === "vector";
module.exports.isProcedure = exp => exp.type === "procedure" || exp.type === "native-procedure";
module.exports.isNative = exp => exp.type === "native-procedure";
module.exports.isSymbol = exp => exp.type === "symbol";
module.exports.isString = exp => exp.type === "string";
module.exports.isBoolean = exp => exp.type === "boolean";
module.exports.isPort = exp => exp.type === "port";
module.exports.isNil = exp => exp.type === "null";
module.exports.isChar = exp => exp.type === "char";
module.exports.isNumber = exp => exp.type === "int" || exp.type === "float";
module.exports.isFalse = v => v.type === "boolean" && v.value === false;