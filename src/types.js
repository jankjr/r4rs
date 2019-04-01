// predicates for distinct types

const TOPLEVELPHASE = -1;

const T_STRING = "string";
const T_CHAR = "char";
const T_SYMBOL = "symbol";
const T_INT = "int";
const T_FLOAT = "float";
const T_BOOLEAN = "boolean";
const T_PROC = "procedure";
const T_NATIVE = "native-procedure";
const T_PAIR = "pair";
const T_VECTOR = "vector";
const T_NULL = "null";
const T_PORT = "port";

module.exports.T_STRING = T_STRING;
module.exports.T_CHAR = T_CHAR;
module.exports.T_SYMBOL = T_SYMBOL;
module.exports.T_INT = T_INT;
module.exports.T_FLOAT = T_FLOAT;
module.exports.T_BOOLEAN = T_BOOLEAN;
module.exports.T_PROC = T_PROC;
module.exports.T_NATIVE = T_NATIVE;
module.exports.T_PAIR = T_PAIR;
module.exports.T_VECTOR = T_VECTOR;
module.exports.T_NULL = T_NULL;
module.exports.T_PORT = T_PORT;

class Value {
  constructor(type, value, phase=TOPLEVELPHASE) {
    this.type = type;
    this.value = value;
    this.phase = phase;
  }
}

const make = (type, value, phase) => new Value(type, value, phase);

const makeString = (value, phase) => make(T_STRING, value, phase);
const makeChar = (value, phase) => make(T_CHAR, value, phase);
const makeSymbol = (value, phase) => make(T_SYMBOL, value, phase);
const makeInt = (value, phase) => make(T_INT, value, phase);
const makeFloat = (value, phase) => make(T_FLOAT, value, phase);
const makeBoolean = (value, phase) => make(T_BOOLEAN, value, phase);
const makeProc = (value, phase) => make(T_PROC, value, phase);
const makeNative = (value, phase) => make(T_NATIVE, value, phase);
const makePair = (value, phase) => make(T_PAIR, value, phase);
const makeVector = (value, phase) => make(T_VECTOR, value, phase);

module.exports.makeString = makeString;
module.exports.makeChar = makeChar;
module.exports.makeSymbol = makeSymbol;
module.exports.makeInt = makeInt;
module.exports.makeFloat = makeFloat;
module.exports.makeBoolean = makeBoolean;
module.exports.makeProc = makeProc;
module.exports.makeNative = makeNative;
module.exports.makePair = makePair;
module.exports.makeVector = makeVector;

const pair = (a, b) => makePair([a, b]);
const nil = make(T_NULL, null);
const True = makeBoolean(true);
const False = makeBoolean(false);
const ZERO = makeInt(0);

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

module.exports.True = True;
module.exports.False = False;
module.exports.pair = pair;
module.exports.nil = nil;

module.exports.symbol = makeSymbol;

module.exports.list = (entries, first = nil) => entries.reduceRight((l, r) => pair(r, l), first);

const isPair = exp => exp.type === T_PAIR;
const isVector = exp => exp.type === T_VECTOR;
const isProcedure = exp => exp.type === T_PROC || exp.type === T_NATIVE;
const isNative = exp => exp.type === T_NATIVE;
const isSymbol = exp => exp.type === T_SYMBOL;
const isString = exp => exp.type === T_STRING;
const isBoolean = exp => exp.type === T_BOOLEAN;
const isPort = exp => exp.type === T_PORT;
const isNil = exp => exp.type === T_NULL;
const isChar = exp => exp.type === T_CHAR;
const isNumber = exp => exp.type === T_INT || exp.type === T_FLOAT;
const isFalse = v => v.type === T_BOOLEAN && v.value === false;
const isDefinedByMacro = sym => sym.phase !== TOPLEVELPHASE;

module.exports.jsValToScmVal = v => {
  const t = typeof v;
  switch (t) {
    case "number":
      if (v === 0) return ZERO;
      if (Math.floor(v) === v) return makeInt(v);
      return makeFloat(v);
    case "boolean":
      return v === true ? True : False;
    case "string":
      return makeString(v);
  }
}
module.exports.Zero = ZERO;
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
