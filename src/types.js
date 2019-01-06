// predicates for distinct types

module.exports.isPair = exp => exp.type === "pair";
module.exports.isVector = exp => exp.type === "vector";
module.exports.isProcedure = exp => exp.type === "procedure" || exp.type === "native-procedure";
module.exports.isNative = exp => exp.type === "native-procedure";
module.exports.isSymbol = exp => exp.type === "symbol";
module.exports.isString = exp => exp.type === "string";
module.exports.isBoolean = exp => exp.type === "boolean";
module.exports.isNil = exp => exp.type === "null";
module.exports.isChar = exp => exp.type === "char";
module.exports.isNumber = exp => exp.type === "int" || exp.type === "float";