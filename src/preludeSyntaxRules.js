const {
  isPair,
  isSymbol,
  isNil,
  pair,
  nil,
  symbol,
  list,
  True,
  False
 } = require("./types");

const {
  isEqual,
  isSameType
} = require("./equality");
const {
  car,
  cdr,
  listEach,
  toList
} = require("./listUtils");


const letExp = (definitions, ...body) => list([
  symbol("let"),
  list(definitions.map(
    ([name, init]) => list([
      symbol(name), init
    ])
  )),
  ...body
]);

const ifExp = (test, then, elseExp) => list([
  symbol("if"),
  test,
  then,
  elseExp
]);

const callExp = (exp, ...args) => list([
  exp,
  ...args
]);

const lambdaExp = (args, ...body) => list([
  symbol("lambda"),
  list(args.map(symbol)),
  ...body
]);

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
const parsePattern = (exp, tag, literals, bound) => {
  if (isSymbol(exp)) {
    if (exp.value === "...")  {
      throw new Error("Invalid ellipsis");
    }
    if (syntacticForms.has(exp.value) || literals.has(exp.value) || exp.value === tag) {
      return {
        type: "literal",
        value: exp.value
      }
    }
    if (bound.has(exp.value)) {
      throw new Error("Bound symbol " + exp.value + " reused");
    }
    bound.add(exp.value);
    return {
      type: "bound",
      value: exp.value
    }
  }
  if (isPair(exp)) {
    const matchers = [];
    let ellipsis = null;
    let last = null;
    do {
      const [x, xs] = exp.value;
      if (isSymbol(x)) {
        if (x.value === "...") {
          if (!isNil(xs)) throw new Error("Invalid ellipsis position");
          ellipsis = matchers.pop();
          exp = xs;
          break;  
        }
      }
      matchers.push(parsePattern(x, tag, literals, bound));
      exp = xs;
    } while(isPair(exp));

    if (!isNil(exp)) {
      if (ellipsis) throw new Error("Cannot mix ellipsis and .");
      last = parsePattern(exp, tag, literals, bound);
    }
    return {
      type: "pattern",
      matchers,
      last,
      ellipsis
    }
  }
  return {
    type: "const",
    value: exp
  }
};

const createPatternMatcher = (exp, tag, literals) => {
  const bound = new Set();
  const pattern = parsePattern(exp, tag, literals, bound);
  return {
    bound,
    pattern
  };
};

const parseExpansion =  (exp, match, macroTag, literals, env, usedBindings = new Set()) => {
  if (isSymbol(exp)) {
    if (match.bound.has(exp.value)) {
      usedBindings.add(exp.value);
      return {
        type: "bound",
        value: exp.value,
        bindings: new Set([exp.value])
      };
    }
    if (literals.has(exp.value) || syntacticForms.has(exp.value) || macroTag === exp.value || env.lookupSyntaxRule(exp.value)) {
      return exp;
    }

    return {
      type: "free",
      value: exp.value,
      bindings: new Set()
    }
  }
  if (isPair(exp)) {
    const thisBindings = new Set();
    const expansions = [];
    do {
      const [x, xs] = exp.value;
      if (isSymbol(x) && x.value === "...") {
        if (!expansions[expansions.length - 1].type === "bound") throw new Error("cannot expand type");
        expansions[expansions.length - 1] = {
          type: "expand",
          child: expansions[expansions.length - 1],
          bindings: expansions[expansions.length - 1].bindings
        }
      } else {
        expansions.push(parseExpansion(x, match, macroTag, literals, env, thisBindings));
      }
      exp = xs;
    } while(isPair(exp));
    const last = isNil(exp) ? nil : parseExpansion(exp, match, macroTag, literals, env, thisBindings);
    thisBindings.forEach(b => usedBindings.add(b));
    return {
      type: "list",
      expansions,
      last,
      bindings: thisBindings
    };
  }
  return {
    type: "const",
    value: exp,
    bindings: new Set()
  }
};
const matchExp = (pattern, exp) => {
  switch (pattern.type) {
    case "literal":
      return isSymbol(exp) && exp.value === pattern.value ? {} : null;
    case "bound":
      return {  
        [pattern.value]: exp
      };
    case "const":
      if (!isSameType(pattern.value, exp)) return null;
      if (isEqual(pattern.value, exp) !== True) return null;
      return {};
    case "pattern":
      let out = {};
      for (let i = 0; i < pattern.matchers.length; i++) {
        if (!isPair(exp)) {
          return null;
        }
        let submatch = matchExp(pattern.matchers[i], exp.value[0]);
        if (!submatch) return null;
        Object.assign(out, submatch);
        exp = exp.value[1];
      }
      if (pattern.ellipsis) {
        listEach(exp, sub => {
          if (!out) return;
          const m = matchExp(pattern.ellipsis, sub)
          if (!m) out = null;
          else {
            Object.keys(m).forEach(key => {
              out[key] = out[key] || [];
              out[key].push(m[key]);
            });
          }
        })
      } else if (pattern.last) {
        if (isPair(exp)) return null;
        let submatch = matchExp(pattern.last, exp);
        if (!submatch) return null;
        Object.assign(out, submatch);
      } else {
        if (!isNil(exp)) return null;
      }
      return out;
    default: throw new Error("invalid pattern" + pattern.type);
  }
}
let phase = 0;
const runExpansion = (vars, exp) => {
  switch(exp.type) {
    case "symbol": return exp;
    case "const": return exp.value;
    case "bound":
      return vars[exp.value] || null;
    case "free": return symbol(exp.value, phase);
    case "list":
      let out = [];
      for (let i = 0; i < exp.expansions.length; i++) {
        const e = exp.expansions[i];
        if (e.type === "expand") {
          switch (e.child.type) {
            case "list":
              const subscopes = [];
              const arrays = [];
              const nonArrays = [];
              let arrayLen = null;
              e.child.bindings.forEach(key => {
                if (Array.isArray(vars[key])) {
                  if (arrayLen === null) {
                    arrayLen = vars[key].length;
                  } else {
                    if (arrayLen !== vars[key].length) {
                      throw new Error("Ambigious expansion");
                    }
                  }
                  arrays.push([key, vars[key]]);
                } else {
                  nonArrays.push(vars[key]);
                }
              });
              if (arrays.length === 0) throw new Error("Nothing to expand");
              for (let j = 0; j < arrayLen; j++) {
                const scope = {};
                nonArrays.forEach(k => scope[k] = vars[k]);
                arrays.forEach(([key, array]) => scope[key] = array[j]);
                out.push(runExpansion(scope, e.child));
              }
              break;
            case "bound":
              const n = runExpansion(vars, e.child);
              if (n === null) continue;
              out = out.concat(n);
              break;
            default: throw new Error("Invalid expansion")
          }
        } else {
          const n = runExpansion(vars, e);
          if (!n) throw new Error("Unvalid exp");
          out.push(n);
        }
      }
      if (isNil(exp.last)) return list(out);
      return list(out, runExpansion(vars, exp.last));
    default:
      throw new Error("unhandled" + exp.type);
  }
};
const performExpansion = (boundVars, expander) => {
  phase += 1;
  return runExpansion(boundVars, expander);
}
const makeSyntax = (tag, rules) => {
  return (xs, env, exp) => {
    for (let i = 0; i < rules.length; i++) {
      const match = matchExp(rules[i].matcher.pattern, exp);
      if (!match) continue;
      const expanded = performExpansion(match, rules[i].expander);
      return expanded;
    }
    throw new Error("Cannot expand " + tag);
  }
}
const builtInRules = {
  "define-syntax": (exp, env) => {
    const [tag, rules] = toList(exp);
    if (!isSymbol(tag) ) {
      throw new Error("Expected symbol");
    }
    const macroTag = tag.value;
    const [syntaxRules, literals, ...rulesArray] = toList(rules);
    if (!isSymbol(syntaxRules) || syntaxRules.value !== "syntax-rules") {
      throw new Error("Expected syntax rules");
    }
    const literalStrings = new Set(toList(literals).map(lit => {
      if (!isSymbol(lit)) throw new Error("syntax rules literals must be symbosl");
      return lit.value;
    }));
    if (literalStrings.size !== 0) console.log("literals: " + [...literalStrings]);
    env.defineSyntax(
      macroTag,
      makeSyntax(macroTag, rulesArray.map(rule => {
        const [ pattern, template ] = toList(rule);
        const matcher = createPatternMatcher(pattern, macroTag, literalStrings);
        return {
          pattern,
          matcher,
          template,
          expander: parseExpansion(template, matcher, macroTag, literalStrings, env)
        };
      }))
    );
    return nil;
  },
  begin: exp => {
    if (!isPair(exp)) throw new Error("Invalid list");
    const [command, sequence] = exp.value;
    if (isNil(sequence)) return command;
    /**
     * (
     *   (lambda (ignore thunk) (thunk))
       <command>
       (lambda () (begin <sequence>)))
     */
    return list([
      list([
        symbol("lambda"),
        list([
          symbol("ignore"),
          symbol("thunk")
        ]),
        list([
          symbol("thunk")
        ])
      ]),
      command,
      list([
        symbol("lambda"),
        nil,
        pair(
          symbol("begin"),
          sequence
        )
      ])
    ]);
  }
};
module.exports = {
  builtInRules,
  letExp,
  ifExp,
  callExp,
  lambdaExp
}