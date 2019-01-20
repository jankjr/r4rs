/**
 * This is the scheme interpreter
 */
const grammar = require('./grammar.js')
const { isPair, isFalse, isVector, isProcedure, isPort, isNative, isSymbol, isString, isBoolean, isNil, isChar, isNumber,
  make,
  pair,
  nil,
  symbol,
  list,
  True,
  False
 } = require("./types");
const {
  car,
  cdr,
  listEach,
  toList
} = require("./listUtils");

const {
  isEqv,
  isEqual,
  isSameType
} = require("./equality");

const { Env } = require("./Env");
const Zero = make("int", 0);
const { builtInRules } = require("./preludeSyntaxRules");
const fs = require("fs");
const {
  printExp,
  expToString
} = require("./print");

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

const assertType = (e, t) => {
  if (e.type !== t) throw new Error("Expected expression of type " + t + " got " + e.type);
  return true;
};
const assert = (t, msg) => {
  if (!t) throw new Error(msg);
  return true;
};


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

class Continuation extends Error {
  constructor(args) {
    super("");
    this.args = args;
  }
}

Object.assign(prelude.syntaxRules, builtInRules);

const wrapEq = fn => make("native-procedure", args => {
  if (args.length !== 2) throw new Error("Equivalence operators take two arguments");
  const obj1 = args[0]
  const obj2 = args[1]
  if (!isSameType(obj1, obj2)) {
    return False;
  }
  return fn(obj1, obj2);
});
const isStartOfListOrNull = exp => isPair(exp) || isNil(exp);
const exitOperator = make("native-procedure", (args, env) => { throw new Continuation(args); });
const makeAssoc = eqFn => makeNative((exp, alist) => {
  if (isNil(exp)) return False;
  while(isPair(alist)) {
    const [x, xs] = alist.value;
    if (!isPair(x)) throw new Error("Not list of pairs");
    if (eqFn(exp, x.value[0]) === True) return x;
    alist = xs;
  }
  if (isNil(alist)) return False;
  throw new Error("Invalid list");
}, 2)

const makeMem = eqFn => makeNative((exp, alist) => {
  if (isNil(exp)) return False;
  while (isPair(alist)) {
    if (eqFn(exp, alist.value[0]) === True) return alist;
    alist = alist.value[1]
  }
  if (isNil(alist)) return False;
  throw new Error("Invalid list");
}, 2);
Object.assign(prelude.scope, {
  "memq": makeMem(isEqv),
  "memv":makeMem(isEqv),
  "member":makeMem(isEqual),
  "eqv?": wrapEq(isEqv),
  "eq?": wrapEq(isEqv),
  "equal?": wrapEq(isEqual),
  "append": makeNative((a, b) => list(toList(a), b), 2),
  "reverse": makeNative(list => {
    if (isNil(list)) return nil;
    let out = nil;
    listEach(list, exp => {
      out = pair(exp, out);
    });
    return out;
  }, 1),
  "string-append": make("native-procedure", args => make("string", args.map(i => {
      assertType(i, "string");
      return i.value;
    }).join(""))
  ),
  "string-ref": makeNative((string, i) => {
    assertType(string, "string");
    if (!isNumber(i)) throw new Error("2nd argument of string-ref should be an integer");
    const index = i.value;
    if (index < 0) throw new Error("index is negative");
    return make("char", string.value[index]);
  }, 2),
  "list-ref": makeNative((list, k) => {
    if (!isNumber(k)) throw new Error("2nd argument of list-ref should be an integer");
    let i = 0;
    while(isPair(list)) {
      if (i === k.value) return list.value[0];
      i += 1;
      list = list.value[1];
    }
    if (isNil(list)) throw new Error("Out of range");
    throw new Error("Invalid list");
  }, 2),
  "list-tail": makeNative((list, k) => {
    if (!isNumber(k)) throw new Error("2nd argument of list-ref should be an integer");
    let i = 0;
    while(isPair(list)) {
      if (i === k.value) return list.value[1];
      i += 1;
      list = list.value[1];
    }
    if (isNil(list)) throw new Error("Out of range");
    throw new Error("Invalid list");
  }, 2),
  "assv": makeAssoc(isEqv),
  "assq": makeAssoc(isEqv),
  "assoc": makeAssoc(isEqual),
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
  list: makeNative(args => list(args), 1, Infinity),
  car: makeNative(car, 1),
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
  "null?": wrapPred(isNil),
  "eval": make("native-procedure", (args, env) => (assertLen(args, 1), evalSExp(args[0], env, true))),
  "char?": wrapPred(isChar),
  "number?": wrapPred(isNumber),
  "procedure?": wrapPred(isProcedure),
  "call-with-current-continuation": make("native-procedure", (args, callEnv) => {
    assert(args.length === 1, "call-with-current-continuation takes on arg");
    const proc = args[0];
    assertType(proc, "procedure");
    try {
      return evalProcedure(proc.value, pair(
        exitOperator,
        nil
      ), callEnv);
    } catch(e) {
      if (e instanceof Continuation) {
        return e.args[0];
      } else {
        throw e;
      }
    }
  }, 1),
  vector: make("native-procedure", (args, env) => make("vector", args)),
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
  max: makeNative(v => jsValToScmVal(v.reduce((l, r) => {
    if (!isNumber(r)) throw new Error("max only works for numbers");
    return Math.max(l, r.value);
  }, -Infinity)), 2, Infinity),
  min: makeNative(v => jsValToScmVal(v.reduce((l, r) => {
    if (!isNumber(r)) throw new Error("nub only works for numbers");
    return Math.min(l, r.value);
  }, Infinity)), 2, Infinity),
  floor: makeNative(v => (assert(isNumber(v), "floor expects number"), jsValToScmVal(Math.floor(v.value))), 1), 
  ceiling: makeNative(v => (assert(isNumber(v), "ceiling expects number"), jsValToScmVal(Math.ceil(v.value))), 1), 
  round: makeNative(v => (assert(isNumber(v), "ceiling expects number"), jsValToScmVal(Math.round(v.value))), 1),
  // "truncate"
  "number->string":makeNative((v, k) => {
    assert(isNumber(v), "number->string expects number")
    if (!k) return jsValToScmVal(v.value.toString());
    assert(isNumber(k), "number->string radiux must be a number")
    return jsValToScmVal(v.value.toString(k.value));
  }, 1, 2),
  "string->number": makeNative((v, k) => {
    assertType(v, "string");
    if (!k) return jsValToScmVal(parseFloat(v.value));
    assert(isNumber(k), "string->number radix must be number");
    if (k.value === 10) return jsValToScmVal(parseFloat(v.value));
    return jsValToScmVal(parseInt(v.value, k.value));
  }, 1, 2),
  "output-port?": makeNative(port => {
    assertType(port, "port");
    return port.value.output;
  }, 1),
  "close-output-file": makeNative(port => {
    assertType(port, "port");
  }, 1),
  "open-output-file": makeNative(fileName => {
    assertType(fileName, "string");
    let f = null;
    let err = null;
    let open = false;
    let output = true;
    fs.open(fileName.value, "w", (e, file) => {
      if (e) {
        console.error(e);
        err = e;
      }
      f = file;
      open = e === null;
    })
    return make("port", {
      name: fileName.value,
      write: str => {
        if (!output) throw new Error("not output port");
        if (!open) throw new Error("port closed");
        fs.write(f, str, err => {
          if (err) {
            console.error(err);
          }
        })
      }
    })
  }, 1),
  display: makeNative((exp, port) => {
    if (!port) {
      process.stdout.write(printExp(exp))
    } else {
      if (!isPort(port)) throw new Error("2nd argument for display must be port");
      port.value.write(expToString(exp));
    }
    return undefined;
  }, 1, 2),
  apply: make("native-procedure", (args, callEnv) => {
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
  }, 2),
  map: make("native-procedure", (args, env) => {
    assert(args.length >= 2, "map takes at least two args");
    const proc = args[0];
    assert(isProcedure(proc), "map takes a proc as first argument");
    const argArrs = [];
    for (let i = 1; i < args.length; i++) {
      const arr = toList(args[i]);
      argArrs.push(arr);
      if (i !== 1) {
        assert(argArrs[0].length === arr.length, "all inputs to map must have same lenght");
      }
    }
    let out = [];
    for (var i = 0; i < argArrs[0].length; i++) {
      let zipped = [proc];
      for (var j = 0; j < argArrs.length; j++) {
        zipped.push(argArrs[j][i]);
      }
      out.push(prelude.scope.apply.value(zipped, env));
    }
    return list(out);
  }, 2, Infinity),
  "for-each": make("native-procedure", (args, env) => {
    assert(args.length >= 2, "for-each takes at least two args");
    const proc = args[0];
    assert(isProcedure(proc), "for-each takes a proc as first argument");
    const argArrs = [];
    for (let i = 1; i < args.length; i++) {
      const arr = toList(args[i]);
      argArrs.push(arr);
      if (i !== 1) {
        assert(argArrs[0].length === arr.length, "all inputs to for-each must have same lenght");
      }
    }
    for (var i = 0; i < argArrs[0].length; i++) {
      let zipped = [proc];
      for (var j = 0; j < argArrs.length; j++) {
        zipped.push(argArrs[j][i]);
      }
      prelude.scope.apply.value(zipped, env)
    }
   }, 2, Infinity)
})

const makeProcedure = (formals, body, env, name) => {
  const params = {
    formals: [],
    hasRest: false,
    restFrom: null,
    restArgName: null
  };
  if (isSymbol(formals)) {
    params.formals.push(formals.value);
  } else {
    let formalsArr = formals
    while(isPair(formalsArr)) {
      const v = car(formalsArr);
      if (!isSymbol(v) && v.value in syntaxticForms) {
        throw new Error("Invalid formals definition, expected symbol got " + v.type);
      }
      params.formals.push(v.value);
      formalsArr = cdr(formalsArr);
    }
    if (isSymbol(formalsArr)) {
      if (formalsArr.value in syntaxticForms) {
        throw new Error("Rest arg cannot have name " + v.value);
      }
      params.hasRest = true;
      params.restFrom = params.formals.length;
      params.restArgName = formalsArr.value;
    } else if (!isNil(formalsArr)) {
      throw new Error("Invalid rest arg type " + v.type);
    }
  }

  return {
    body: toList(body),
    env,
    params,
    name
  }
}

// Base syntax forms
const syntaxticForms = {
  unquote: () => { throw new Error("Invalid unquote") },
  "unquote-splicing": () => { throw new Error("Invalid unquote-splicing") },
  quasiquote: (exp, env) => {
    if (!isPair(exp)) return exp;
    let out = [];
    listEach(exp.value[0], e => {
      if (!isPair(e)) return out.push(e);
      const [x, xs] = e.value;
      if (!isSymbol(x)) return out.push(e);
      if (x.value === "unquote") {
        out.push(evalSExp(xs.value[0], env));
      } else if (x.value === "unquote-splicing") {
        const e = evalSExp(xs.value[0], env);
        if (isNil(e)) return;
        if (!isPair(e)) throw new Error("Unquote-splicing applied to non list");
        out = out.concat(toList(e));
      } else {
        out.push(e);
      }
    })
    return list(out);
  },
  quote: (exp, env) => exp.value[0],
  lambda: (exp, env) => {
    return make(
      'procedure',
      makeProcedure(
        car(exp),
        cdr(exp),
        env
      )
    );
  },
  "set!": (exp, env) => {
    const l = toList(exp);
    if (l.length !== 2) {
      throw new Error("set! must have 2 clauses");
    }
    const [name, value] = l;
    if (!isSymbol(name) || name.value in syntaxticForms)
      throw new Error("invalid id applied to set")
    const v = evalSExp(value, env, false);
    env.set(name.value, v);
    return v;
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
    if (isPair(head)) {
      // define procedure
      const name = car(head);
      env.define(name.value,
        make(
          'procedure',
          makeProcedure(
            cdr(head),
            cdr(exp),
            env,
            name.value
          )
        )
      );
    } else if (isSymbol(head)) {
      // define variable
      env.define(head.value, evalSExp(car(cdr(exp)), env, false));
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
  let out = null;
  body.forEach((exp, i) => {
    out = evalSExp(exp, newEnv, i === body.length - 1)
  });
  return out;
}

const evalSExp = (exp, env, tailPosition=false) => {
  // All raw symbols should be redirectly looked up
  if (isSymbol(exp)) {
    return env.lookup(exp.value);
  }

  if (!isPair(exp)) {
    return exp;
  }
  let [x, xs] = exp.value;
  if (isSymbol(x) && x.value in syntaxticForms) {
    return syntaxticForms[x.value](xs, env, tailPosition);
  }
  x = evalSExp(x, env, tailPosition);
  if (!isProcedure(x)) {
    throw new Error(x.type + " is not applicable");
  }
  if (isNative(x)) {
    return evalNative(x.value, xs, env)
  }
  return evalProcedure(x.value, xs, env);
}

const _expand = (exp, env) => {
  if (!isPair(exp)) return exp;
  let [x, xs] = exp.value
  if (!isSymbol(x)) {
    return pair(_expand(x, env), _expand(xs, env));
  }
  const rule = env.lookupSyntaxRule(x.value);
  if (rule) {
    console.log(printExp(exp));
    const expanded = rule(xs, env, exp);
    console.log(printExp(expanded));
    return _expand(expanded, env);
  }
  return pair(x, _expand(xs, env));
}

const expand = (exp, env) => {
  const expanded = _expand(exp, env);
  // rename here
  // return renameExpandedSymbols(expanded);
  return expanded;
}

const makeEnv = () => {
  const env = new Env(prelude);
  const preludeSrc = fs.readFileSync(path.join(__dirname, "prelude.scm"), "utf-8");
  grammar.parse(preludeSrc).forEach(exp => evalSExp(expand(exp, env), env));
  return env;
}
const runFile = (src, env = makeEnv()) => grammar.parse(fs.readFileSync(src, "utf-8")).forEach(exp => {
  const expanded = expand(exp, env);
  console.log(printExp(expanded));
  evalSExp(expanded, env)
});

const runTests = () => {
  try {
    runFile(path.join(__dirname, "tests/stdlib.scm"));
  } catch(e) {
    console.error(e);
  }
}

const path = require("path");
const repl = () => {
  const env = makeEnv();
  console.log(`R4rsjs Interpreter version 0.1 🎉\nCopyright ©️  2019 Jan Kjærgaard`);
  const repl = require('repl');
  const r = repl.start({ prompt: '> ', eval: evalCmd, writer: myWriter });
  function evalCmd(cmd, context, filename, callback) {
    const exps = grammar.parse(cmd);

    let result = null;
    try {
      exps.forEach(exp => {
        const desugared = expand(exp, env);
        // console.log(printExp(desugared));
        result = evalSExp(desugared, env);
      });  
    } catch(e) {
      console.error(e);
    }
    if (result !== undefined) callback(null, printExp(result));
    else callback(null);
  }
  function myWriter(output) {
    return output;
  }
}
runFile(path.join(__dirname, "run.scm"))
// runTests()
// repl();
