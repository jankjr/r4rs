const {
  isPair,
  isSymbol,
  isNil,
  pair,
  nil,
  symbol,
  list,
  True,
  False,
  syntacticForms,
  incPhase
} = require("./types");
const { printExp } = require("./print");

const { isEqual, isSameType } = require("./equality");
const { car, cdr, listEach, toList } = require("./listUtils");

const parsePattern = (exp, tag, literals, bound, env) => {
  if (isSymbol(exp)) {
    if (exp.value === "...") {
      throw new Error("Invalid ellipsis");
    }
    if (
      syntacticForms.has(exp.value) ||
      literals.has(exp.value) ||
      exp.value === tag
    ) {
      return {
        type: "literal",
        value: exp.value
      };
    }
    if (bound.has(exp.value)) {
      throw new Error("Bound symbol " + exp.value + " reused");
    }
    bound.add(exp.value);
    return {
      type: "bound",
      value: exp.value
    };
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
      matchers.push(parsePattern(x, tag, literals, bound, env));
      exp = xs;
    } while (isPair(exp));

    if (!isNil(exp)) {
      if (ellipsis) throw new Error("Cannot mix ellipsis and .");
      last = parsePattern(exp, tag, literals, bound, env);
    }
    return {
      type: "pattern",
      matchers,
      last,
      ellipsis
    };
  }

  return {
    type: "const",
    value: exp
  };
};

const createPatternMatcher = (exp, tag, literals, parseEnv) => {
  const bound = new Set();
  const pattern = parsePattern(exp, tag, literals, bound, parseEnv);
  return {
    bound,
    pattern
  };
};

const parseExpansion = (
  exp,
  match,
  macroTag,
  literals,
  env,
  usedBindings = new Set(),
  parseEnv
) => {
  if (isSymbol(exp)) {
    if (match.bound.has(exp.value)) {
      usedBindings.add(exp.value);
      return {
        type: "bound",
        value: exp.value,
        bindings: new Set([exp.value])
      };
    }
    if (
      literals.has(exp.value) ||
      syntacticForms.has(exp.value) ||
      macroTag === exp.value ||
      env.lookupSyntaxRule(exp.value)
    ) {
      return exp;
    }

    return {
      type: "free",
      value: exp.value,
      bindings: new Set()
    };
  }
  if (isPair(exp)) {
    const thisBindings = new Set();
    const expansions = [];
    do {
      const [x, xs] = exp.value;
      if (isSymbol(x) && x.value === "...") {
        if (!expansions[expansions.length - 1].type === "bound")
          throw new Error("cannot expand type");
        expansions[expansions.length - 1] = {
          type: "expand",
          child: expansions[expansions.length - 1],
          bindings: expansions[expansions.length - 1].bindings
        };
      } else {
        expansions.push(
          parseExpansion(x, match, macroTag, literals, env, thisBindings, parseEnv)
        );
      }
      exp = xs;
    } while (isPair(exp));
    const last = isNil(exp)
      ? nil
      : parseExpansion(exp, match, macroTag, literals, env, thisBindings, parseEnv)
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
  };
};

const matchExp = (pattern, exp) => {
  switch (pattern.type) {
    case "literal":
      if (isSymbol(exp) && exp.value === pattern.value) return {};
      throw new Error("Expected " + pattern.value + " got " + printExp(exp));
    case "bound":
      return {
        [pattern.value]: exp
      };
    case "const":
      if (!isSameType(pattern.value, exp)) {
        throw new Error("Expected " + pattern + " got " + printExp(exp));
      }
      if (isEqual(pattern.value, exp) !== True) {
        throw new Error("Expected " + pattern + " got " + printExp(exp));
      }
      return {};
    case "pattern":
      let out = {};
      for (let i = 0; i < pattern.matchers.length; i++) {
        if (!isPair(exp)) {
           throw new Error("Expected pair, got " + printExp(exp));
        }
        let submatch = matchExp(pattern.matchers[i], exp.value[0]);
        Object.assign(out, submatch);
        exp = exp.value[1];
      }
      if (pattern.ellipsis) {
        listEach(exp, sub => {
          const m = matchExp(pattern.ellipsis, sub);
          Object.keys(m).forEach(key => {
            out[key] = out[key] || [];
            out[key].push(m[key]);
          });
        });
      } else if (pattern.last) {
        if (isPair(exp)) {
           throw new Error("Unexpected pair, got " + printExp(exp));
        }
        let submatch = matchExp(pattern.last, exp);
        Object.assign(out, submatch);
      } else {
        if (!isNil(exp)) {
           throw new Error("Expected end of list " + printExp(exp));
        }
      }
      return out;
    default:
      throw new Error("invalid pattern" + pattern.type);
  }
};
let phase = 0;
const performExpansion = (boundVars, expander, env) => {
  phase += 1;
  return runExpansion(boundVars, expander, env);
};

const runExpansion = (vars, exp, env) => {
  switch (exp.type) {
    case "symbol":
      if (syntacticForms.has(exp.value)) return exp;
      return symbol(exp.value, phase);
    case "const":
      return exp.value;
    case "bound":
      return vars[exp.value] || null;
    case "free":
      return symbol(exp.value, phase);
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
                nonArrays.forEach(k => (scope[k] = vars[k]));
                arrays.forEach(([key, array]) => (scope[key] = array[j]));
                out.push(runExpansion(scope, e.child, env));
              }
              break;
            case "bound":
              const n = runExpansion(vars, e.child, env);
              if (n === null) continue;
              out = out.concat(n);
              break;
            default:
              throw new Error("Invalid expansion");
          }
        } else {
          const n = runExpansion(vars, e, env);
          if (!n) throw new Error("Unvalid exp");
          out.push(n);
        }
      }
      if (isNil(exp.last)) return list(out);
      return list(out, runExpansion(vars, exp.last, env));
    default:
      throw new Error("unhandled" + exp.type);
  }
};

const makeSyntax = (tag, rules, defEnv) => {
  return (xs, expEnv, exp) => {
    let errors = [];
    for (let i = 0; i < rules.length; i++) {
      let match = null;
      try {
        match = matchExp(rules[i].matcher.pattern, exp);
        if (!match) continue;
      } catch(e) {
        errors.push(e.message);
        continue;
      }
      const expanded = performExpansion(match, rules[i].expander, defEnv, expEnv);
      return expanded;
    }
    throw new Error("Cannot expand " + tag + "\n" + errors.join("\n"));
  };
};

const defineSyntax = (exp, parseEnv) => {
  const [tag, rules] = toList(exp);
  if (parseEnv.isSyntaxRule(tag)) {
    throw new Error(`Cannot redefine core form ${tag.value}`);
  }

  const [syntaxRules, literals, ...rulesArray] = toList(rules);
  if (!isSymbol(syntaxRules) || syntaxRules.value !== "syntax-rules") {
    throw new Error("Expected syntax rules");
  }

  const literalStrings = new Set(
    toList(literals).map(lit => {
      if (!isSymbol(lit)) {
        throw new Error("Syntax-rules literals must be symbols");
      }

      return lit.value;
    })
  );

  const syntaxRule = makeSyntax(
    tag.value,
    rulesArray.map(rule => {
      const [pattern, template] = toList(rule);
      const matcher = createPatternMatcher(pattern, tag.value, literalStrings, parseEnv);
      return {
        pattern,
        matcher,
        template,
        expander: parseExpansion(
          template,
          matcher,
          tag.value,
          literalStrings,
          parseEnv
        )
      };
    }),
    parseEnv
  );

  parseEnv.defineSyntax(tag.value, syntaxRule);
  return nil;
}
module.exports = {
  defineSyntax
};
