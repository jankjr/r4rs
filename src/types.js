// predicates for distinct types

const TOPLEVELPHASE = -1;
const make = (type, value, phase = TOPLEVELPHASE) => ({ type, value, phase });
const pair = (a, b) => make("pair", [a, b]);
const nil = make("null", null);
const True = make("boolean", true);
const False = make("boolean", false);

const syntacticForms = new Set([
  "if",
  "lambda",
  "quote",
  "define",
  "define-syntax",
  "let-syntax",
  "letrec-syntax",
  "set!",
  "quasiquote",
  "unquote",
  "unquote-splicing"
]);

module.exports.make = make;
module.exports.True = True;
module.exports.False = False;
module.exports.pair = pair;
module.exports.nil = nil;

module.exports.symbol = (name, phase) => make("symbol", name, phase);

module.exports.list = (entries, first = nil) =>
  entries.reduceRight((l, r) => pair(r, l), first);

const isPair = exp => exp.type === "pair";
const isVector = exp => exp.type === "vector";
const isProcedure = exp => exp.type === "procedure" || exp.type === "native-procedure";
const isNative = exp => exp.type === "native-procedure";
const isSymbol = exp => exp.type === "symbol";
const isString = exp => exp.type === "string";
const isBoolean = exp => exp.type === "boolean";
const isPort = exp => exp.type === "port";
const isNil = exp => exp.type === "null";
const isChar = exp => exp.type === "char";
const isNumber = exp => exp.type === "int" || exp.type === "float";
const isFalse = v => v.type === "boolean" && v.value === false;
const isDefinedByMacro = sym => sym.phase !== TOPLEVELPHASE;

module.exports.isPair = isPair;
module.exports.isVector = isVector;
module.exports.isProcedure = isProcedure;
module.exports.isNative = isNative;
module.exports.isSymbol = isSymbol;
module.exports.isString = isString;
module.exports.isBoolean = isBoolean;
module.exports.isPort = isPort;
module.exports.isNil = isNil;
module.exports.isChar = isChar;
module.exports.isNumber = isNumber;
module.exports.isFalse = isFalse;
module.exports.isDefinedByMacro = isDefinedByMacro;
module.exports.syntacticForms = syntacticForms;


module.exports.isSyntaxticForm = s => isSymbol(s) && syntacticForms.has(s.value);