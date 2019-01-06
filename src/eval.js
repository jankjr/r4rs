/**
 * This is the scheme interpreter
 */

const grammar = require('./grammar.js')
const { isPair, isVector, isProcedure, isNative, isSymbol, isString, isBoolean, isNil, isChar, isNumber } = require("./types");
const { Env } = require("./Env");
const make = (type, value) => ({ type, value });
const pair = (a, b) => make("pair", [a, b])
const nil = make("null", null);
const symbol = name => make("symbol", name)
const list = (entries, first = nil) => entries.reduceRight((l, r) => pair(r, l), first)
const True =  make("boolean", true);
const False =  make("boolean", false);
const Zero = make("int", 0);
const jsValToScmVal = v => {
  const t = typeof v;
  switch(t) {
    case "number": return v === 0 ? Zero : make("float", v);
    case "boolean": return v === true ? True : False;
    case "string": return make("string", v);
  }
}
const makeNative = (fn, minArgC, maxArgC=minArgC) => make("native-procedure", args => {
  if (args.length < minArgC || args.length > maxArgC) throw new Error("Invalid argument cound");
  if (minArgC === 1 && maxArgC === 1) {
    return fn(args[0])
  }
  if (isFinite(maxArgC)) {
    return fn(...args)  
  }
  return fn(args);
})
const wrapPred = fn => make("native-procedure", args => {
  assertLen(args, 1);
  return make("boolean", fn(args[0]))
})
const assertLen = (arr, n) => {
  if (arr.length !== n) throw new Error(`Expected ${n} arguments, got ${arr.length}`);
  return true;
}

const assertPair = exp => {
  if (isPair(exp)) return true;
  throw new Error("not pair");
}

const assertType = (e, t) => {
  if (e.type !== t) throw new Error("Expected expression of type " + t + " got " + e.type);
  return true;
};
const assert = (t, msg) => {
  if (!t) throw new Error(msg);
  return true;
};

const car = exp => assertPair(exp) && exp.value[0];
const cdr = exp => assertPair(exp) && exp.value[1];
const cdar = exp => car(cdr(exp))

const prelude = new Env();
const makeOp = (fn, id, opName) => {
  return make("native-procedure", args => {
    return jsValToScmVal(args.reduce((l, r) => {
      if (!isNumber(r)) {
        throw new Error(opName + " only accepts numbers");
      }
      return fn(l, r.value)
    }, id));
  })
}
const toList = exp => {
  assertPair(exp);
  let out = [];
  for(;;) {
    const v = car(exp);
    out.push(v),
    exp = cdr(exp);
    if (!isPair(exp)) {
      break;
    }
  }
  if (isNil(exp)) {
    return out;
  }
  throw new Error("Bad list")
}

const makeRelatonalOp = (fn, op) => makeNative(args => {
  for (var i = 0; i < args.length; i++) {
    if (!isNumber(args[i])) throw new Error(op + " only works for numbers");
  }
  for (var i = 1; i < args.length; i++) {
    const x = args[i - 1];
    const y = args[i];
    if (!fn(x.value, y.value)) return jsValToScmVal(false);
  }
  return jsValToScmVal(true);
}, 2, Infinity)

Object.assign(prelude.scope, {
  // "eqv?"
  // "eq?"
  // "equal?"
  // "append"
  // "reverse"
  // "list-ref"
  // "memq"
  // "memv"
  // "member"
  // "assq"
  // "assv"
  // "assoc"
  "pair?": wrapPred(isPair),
  "cons": makeNative(pair, 2),
  "length": makeNative(l => {
    let i = 0;
    while(isPair(l)) {
      i += 1;
      l = cdr(l);
    }
    if (isNil(l)) return jsValToScmVal(i);
    throw new Error("length expects a list, got pair");
  }, 1),
  "list?": makeNative(l => {
    if (!isPair(l)) return False;
    while(isPair(l)) l = cdr(l);
    return jsValToScmVal(isNil(l));
  }, 1),
  car: makeNative(car, 1),
  caar: makeNative(v => car(car(v)), 1),
  list: makeNative(args => list(args), 1, Infinity),
  cadr: makeNative(v => car(cdr(v)), 1),
  cdr: makeNative(cdr, 1),
  "set-car!": makeNative((pair, value) => {
    assertType(pair, "pair");
    pair.value[0] = value;
    return undefined;
  }, 2),
  "set-cdr!": makeNative((pair, value) => {
    assertType(pair, "pair");
    pair.value[1] = value;
    return undefined;
  }, 2),
  "symbol?": wrapPred(isSymbol),
  "symbol->string": makeNative(v => (assertType(v, "symbol"), jsValToScmVal(v.value)), 1),
  "string?": wrapPred(isString),
  "string->symbol": makeNative(v => (assertType(v, "string"), symbol(v.value)), 1),
  "boolean?": wrapPred(isBoolean),
  "not": makeNative(v => (assertType(v, "boolean"), jsValToScmVal(!v.value)), 1),
  "nil?": wrapPred(isNil),
  "eval": make("native-procedure", (args, env) => (assertLen(args, 1), evalSExp(args[0], env, true))),
  "char?": wrapPred(isChar),
  "number?": wrapPred(isNumber),
  "procedure?": wrapPred(isProcedure),

  "vector?": wrapPred(isVector),
  "vector-set!": makeNative((v, k, o) => {
    assertType(v, "vector");
    if (!isNumber(k)) {
      throw new Error("2nd arg of vector-ref must be number");
    }
    if (v.value.length < k.value) {
      throw new Error("vector-ref out of range");
    }
    v.value[k.value] = o;
    return undefined;
  }, 3),
  "vector->list": makeNative(v => (assertType(v, "vector"), toList(v.value)), 1),
  "list->vector": makeNative(l => make("vector", toList(l)), 1),
  "vector-ref": makeNative((v, k) => {
    assertType(v, "vector");
    if (!isNumber(k)) {
      throw new Error("2nd arg of vector-ref must be number");
    }
    if (v.value.length < k.value) {
      throw new Error("vector-ref out of range");
    }
    return v.value[k.value];
  }, 2),
  "vector-fill": makeNative((v, fill) => {
    assertType(v, "vector");
    v.value.fill(fill);
    return undefined;
  }, 2),
  "vector-length": makeNative(v => {
    assertType(v, "vector");
    return jsValToScmVal(v.value.length);
  }, 1),
  "make-vector": makeNative((k, fill=nil) => make("vector", new Array(k.value).fill(fill)), 1, 2),
  "+": makeOp((l, r) => l + r, 0, "+"),
  "*": makeOp((l, r) => l * r, 1, "*"),
  "-": make("native-procedure", args => {
    if (!isNumber(args[0])) throw new Error("- only taskes numbers " + args[0].type);
    if (args.length === 1) {
      return jsValToScmVal(-args[0].value);
    }
    let v = args[0].value;
    for (var i = 1; i < args.length; i++) {
      v -= args[i].value
    }
    return jsValToScmVal(v);
  }),
  "/": makeOp((l, r) => l / r, 1, "/"),
  "<": makeRelatonalOp((l, r) => l < r, "<"),
  "<=": makeRelatonalOp((l, r) => l <= r, "<="),
  ">": makeRelatonalOp((l, r) => l > r, ">"),
  ">=": makeRelatonalOp((l, r) => l >= r, ">="),
  "=": make("native-procedure", args => {
    if (args.length < 2) throw new Error("= needs at least 2 arguments");
    const first = args[0].value;
    if (!isNumber(args[0])) throw new Error("= only taskes numbers " + args[0].type);
    for (var i = 1; i < args.length; i++) {
      if (!isNumber(args[i])) throw new Error("= only taskes numbers");
      if (first !== args[i].value) {
        return False;
      }
    }
    return True;
  }),
  "zero?": makeNative(v => (assert(isNumber(v), "zero? expects number"), jsValToScmVal(v.value === 0)), 1),
  "positive?": makeNative(v => (assert(isNumber(v), "positive? expects number"), jsValToScmVal(v.value >= 0)), 1),
  "negative?": makeNative(v => (assert(isNumber(v), "negative? expects number"), jsValToScmVal(v.value < 0)), 1),
  "odd?": makeNative(v => (assert(isNumber(v), "odd? expects number"), jsValToScmVal(v.value % 2 === 1)), 1),
  "even?": makeNative(v => (assert(isNumber(v), "even? expects number"), jsValToScmVal(v.value % 2 === 0)), 1),
  "max": makeNative(v => jsValToScmVal(v.reduce((l, r) => {
    if (!isNumber(r)) throw new Error("max only works for numbers");
    return Math.max(l, r.value);
  }, -Infinity)), 2, Infinity),
  "min": makeNative(v => jsValToScmVal(v.reduce((l, r) => {
    if (!isNumber(r)) throw new Error("nub only works for numbers");
    return Math.min(l, r.value);
  }, Infinity)), 2, Infinity),
  "floor": makeNative(v => (assert(isNumber(v), "floor expects number"), jsValToScmVal(Math.floor(v.value))), 1), 
  "ceiling": makeNative(v => (assert(isNumber(v), "ceiling expects number"), jsValToScmVal(Math.ceil(v.value))), 1), 
  "round": makeNative(v => (assert(isNumber(v), "ceiling expects number"), jsValToScmVal(Math.round(v.value))), 1),
  // "truncate"
  "number-string":makeNative((v, k) => {
    assert(isNumber(v), "number->string expects number")
    if (!k) return jsValToScmVal(v.toString());
    assert(isNumber(k), "number->string radiux must be a number")
    return jsValToScmVal(v.toString(k.value));
  }, 1, 2),
  "string->number": makeNative((v, k) => {
    assertType(v, "string");
    if (!k) return jsValToScmVal(parseFloat(v.value));
    assert(isNumber(k), "string->number radix must be number");
    if (k.value === 10) return jsValToScmVal(parseFloat(v.value));
    return jsValToScmVal(parseInt(v.value, k.value));
  }, 1, 2),
  "apply": make("native-procedure", (args, callEnv) => {
    const fn = args[0];
    assert(isProcedure(fn), "first arg of apply must be procedure");
    if (args.length === 2 && isPair(args[1])) {
      args = toList(args[1]);
    } else {
      args = args.slice(1);
    }
    if(fn.type === "native-procedure") {
      return fn.value(args, callEnv);
    }
    const {
      body,
      params,
      env
    } = fn.value;
    const newEnv = env.subscope();
    params.formals.forEach((name, i) => {
      newEnv.define(name, args[i]);
    });
    if (params.hasRest) {
      if (args.length < params.formals.length) {
        throw new Error(`Invalid parameter length expected at least ${params.formals.length} got ${args.length}`);
      }
      newEnv.define(params.restArgName, list(args.slice(params.restFrom)));
    } else {
      if (args.length !== params.formals.length) {
        throw new Error(`Invalid parameter length expected ${params.formals.length} got ${args.length}`);
      }
    }
    return evalSExp(body, newEnv, true);
  }, 2)
})




const makeProcedure = (formals, body, env) => {
  const params = {
    formals: [],
    hasRest: false,
    restFrom: null,
    restArgName: null
  };
  let formalsArr = formals
  for(;;) {
    const v = car(formalsArr);
    if (!isSymbol(v) && v.value in syntacticKeywords) {
      throw new Error("Invalid formals definition, expected symbol got " + v.type);
    }
    params.formals.push(v.value);
    formalsArr = cdr(formalsArr);
    if (!isPair(formalsArr)) {
      break;
    }
  }
  if (isSymbol(formalsArr)) {
    if (formalsArr.value in syntacticKeywords) {
      throw new Error("Rest arg cannot have name " + v.value);
    }
    params.hasRest = true;
    params.restFrom = params.formals.length;
    params.restArgName = formalsArr.value;
  } else if (!isNil(formalsArr)) {
    throw new Error("Invalid rest arg type " + v.type);
  }

  return {
    body,
    env,
    params
  }
}

const isFalse = v => v.type === "boolean" && v.value === false;
const syntacticKeywords = {
  quote: (exp, env) => exp.value[0],
  lambda: (exp, env) => make(
    'procedure',
    makeProcedure(
      car(exp),
      cdr(exp),
      env
    )
  ),
  vector: (exp, env) => make("vector", toList(exp).map(v => evalSExp(v, env))),
  and: (exp, env) => {
    const terms = toList(exp);
    if (terms.length <= 1) {
      throw new Error("Invalid number of clauses in 'and' clause");
    }
    for (var i = 0; i < terms.length; i++) {
      const firstTerm = evalSExp(terms[i], env, false);
      if (isFalse(firstTerm)) {
        return jsValToScmVal(false);
      }
    }
    return jsValToScmVal(true);
  },
  or: (exp, env) => {
    const terms = toList(exp);
    if (terms.length <= 1) {
      throw new Error("Invalid number of clauses in 'and' clause");
    }
    for (var i = 0; i < terms.length; i++) {
      const firstTerm = evalSExp(terms[i], env, false);
      if (!isFalse(firstTerm)) {
        return jsValToScmVal(true);
      }
    }
    return jsValToScmVal(false);
  },
  "set!": (exp, env) => {
    const l = toList(exp);
    if (l.length !== 2) {
      throw new Error("set! must have 2 clauses");
    }
    const [name, value] = l;
    if (!isSymbol(name) || name.value in syntacticKeywords)
      throw new Error("invalid id applied to set")
    const v = evalSExp(value, env, false);
    env.set(name.value, v);
    return v;
  },
  begin: (exp, env, tailPosition) => {
    const exps = toList(exp);
    for (var i = 0; i < exps.length - 1; i++) {
      evalSExp(exps[i], env, false);
    }
    return evalSExp(exps[exps.length - 1], env, tailPosition);
  },
  if: (exp, env, tailPosition) => {
    const li = toList(exp);
    if (li.length !== 2 && li.length !== 3) {
      throw new Error("If must have 2 or 3 clauses")
    }
    const test = evalSExp(li[0], env, false)
    if (!isFalse(test)) {
      return evalSExp(li[1], env, tailPosition);
    }
    if (li[2]) return evalSExp(li[2], env, tailPosition);
    return undefined
  },
  define: (exp, env) => {
    const head = car(exp);
    const expression = cdar(exp);
    if (isPair(head)) {
      // define procedure
      const name = car(head);
      env.define(name.value,
        make(
          'procedure',
          makeProcedure(
            cdr(head),
            expression,
            env
          )
        )
      );
    } else if (isSymbol(head)) {
      // define variable
      env.define(head.value, evalSExp(expression, env, false));
    }
    return undefined;
  }
}

const evalNative = (fn, xs, env) => fn(toList(xs).map(v => evalSExp(v, env)), env);

const evalProcedure = ({ body, params, env }, xs, callEnv) => {
  const argArr = toList(xs).map(v => evalSExp(v, callEnv, false));
  const newEnv = env.subscope();
  params.formals.forEach((name, i) => {
    newEnv.define(name, argArr[i]);
  });
  if (params.hasRest) {
    if (argArr.length < params.formals.length) {
      throw new Error(`Invalid parameter length expected at least ${params.formals.length} got ${argArr.length}`);
    }
    newEnv.define(params.restArgName, list(argArr.slice(params.restFrom)));
  } else {
    if (argArr.length !== params.formals.length) {
      throw new Error(`Invalid parameter length expected ${params.formals.length} got ${argArr.length}`);
    }
  }
  return evalSExp(body, newEnv, true);
}

const evalSExp = (exp, env, tailPosition=false) => {
  // All raw symbols should be redirectly looked up
  if (isSymbol(exp)) {
    return env.lookup(exp.value);
  }

  if (!isPair(exp)) {
    return exp;
  }
  const [x, xs] = exp.value;
  if (!isSymbol(x)) {
    throw new Error("Cannot apply " + x.type);
  }

  const sym = x.value;

  // syntax
  if (syntacticKeywords[sym]) {
    return syntacticKeywords[sym](xs, env, tailPosition);
  }
  const value = env.lookup(sym);
  if (!isProcedure(value)) {
    throw new Error(sym + " is not applicable");
  }
  if (isNative(value)) {
    return evalNative(value.value, xs, env)
  }
  return evalProcedure(value.value, xs, env);
}

const printExp = exp => {
  if (!exp) return "(undefined)"
  switch(exp.type) {
    case "boolean":
    case "float":
    case "int": return exp.value.toString();
    case "string": return `"${exp.value}"`;
    case "symbol": return exp.value;
    case "char": return `'${exp.value}'`;
    case "procedure": return "[procedure]";
    case "native-procedure": return "[native-procedure]";
    case "symbol": return "[native-procedure]";
    case "pair":
      if (isNil(exp.value[1])) {
        return printExp(exp.value[0]);
      }
      return `(${printExp(exp.value[0])} ${printExp(exp.value[1])})`;
    case "null": return "()";
    case "vector": return `[${exp.value.map(printExp).join(", ")}]`
  }
}

const repl = () => {
  const env = new Env(prelude);
  const repl = require('repl');
  const r = repl.start({ prompt: '> ', eval: evalCmd, writer: myWriter });
  function evalCmd(cmd, context, filename, callback) {
    const exps = grammar.parse(cmd);
    let result = null;
    try {
      exps.forEach(exp => {
        result = evalSExp(exp, env);
      });  
    } catch(e) {
      console.error(e);
    }
    callback(null, printExp(result));
  }
  function myWriter(output) {
    return output;
  }
}

repl();
