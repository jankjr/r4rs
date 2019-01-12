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

const builtInRules = {
  delay: exp => {
    return callExp(
      symbol("make-promise"),
      lambdaExp([], ...toList(exp))
    );
  },
  cond: exp => {
    if (isNil(exp)) return nil;
    if (!isPair(exp)) throw new Error("Invalid cond claus");
    const claus1 = car(exp);
    const claus2 = cdr(exp);
    const claus1Exps = toList(claus1);
    if (claus1Exps.length === 0) return nil;
    if (claus1Exps.length === 1) {
      return list([
        symbol("or"),
        claus1,
        list([
          symbol("cond"),
          ...toList(claus2)
        ])
      ]);
    }
    if (claus1Exps.length === 2) {
      const [test, then] = claus1Exps;
      if (isSymbol(test) && test.value === "else") {
        return pair(
           symbol("begin"),
           pair(then, nil)
        )
      }
      return ifExp(
        test,
        pair(
           symbol("begin"),
           pair(then, nil)
        ),
        list([
          symbol("cond"),
          ...toList(claus2)
        ])
      )
    }
    if (claus1Exps.length === 3) {
      const [test, arrow, recipient] = claus1Exps;
      if (!(isSymbol(arrow) && arrow.value === "=>")) {
        throw new Error("Invalid cond clause");
      }
      return letExp([
          ["test-result", test],
          ["thunk2", lambdaExp([], recipient)],
          ["thunk3", lambdaExp([], pair(
            symbol("cond"),
            pair(claus2, nil)
          ))]
        ],
        ifExp(symbol("test-result"),
          callExp(callExp(symbol("thunk2")), symbol("test-result")),
          callExp(symbol("thunk3"))
        )
      );
    }
    throw new Error("Invalid cond claus " + claus1Exps.length);
  },
  and: exp => {
    const exps = toList(exp);
    if (exps.length === 0) return True;
    let out = letExp([
      ["test", exps[exps.length - 1]]
    ], ifExp(
      symbol("test"),
      symbol("test"),
      False
    ));
    for (var i = exps.length - 2; i >= 0; i--) {
      out = ifExp(exps[i], out, False);
    }
    return out;
  },
  or: exp => {
    const exps = toList(exp);
    if (exps.length === 0) return True;
    let out = letExp([
      ["test", exps[exps.length - 1]]
    ], ifExp(
      symbol("test"),
      symbol("test"),
      False
    ));
    for (var i = exps.length - 2; i >= 0; i--) {
      out =letExp([
        ["test", exps[i]]
      ], ifExp(
        symbol("test"),
        symbol("test"),
        out
      ));
    }
    return out;
  },
  begin: exp => {
    return list([
      list([
        symbol("lambda"),
        nil,
        ...toList(exp)
      ]),
    ]);
  },
  "letrec": exp => {
    const formals = car(exp);
    const body = toList(cdr(exp));
    const args = [];
    const nilApp = [];
    const intExps = [];
    listEach(formals, exp => {
      const [name, val] = toList(exp);
      args.push(name);
      nilApp.push(nil);
      intExps.push(list([
        symbol("set!"),
        name,
        val
      ]));
    });
    return list([
      list([
        symbol("lambda"),
        list(args),
        ...intExps,
        ...toList(cdr(exp))
      ]),
      ...nilApp
    ]);
  },
  "let*": exp => {
    const formals = car(exp);
    const body = toList(cdr(exp));
    const defineStms = [];
    listEach(formals, exp => {
      const [name, val] = toList(exp);
      defineStms.push(list([
        symbol("define"),
        name,
        val
      ]));
    });
    return pair(list([
      symbol("lambda"),
      nil,
      ...defineStms,
      ...toList(cdr(exp))
    ]), nil)
  },
  let: exp => {
    const definitions = car(exp);
    const formals = [];
    const args = [];
    listEach(definitions, exp => {
      const symbol = car(exp);
      const val = car(cdr(exp));
      formals.push(symbol);
      args.push(val);
    });
    const body = pair(symbol("begin"), cdr(exp));
    return list([
      list([
        symbol("lambda"),
        list(formals),
        body
      ]),
      ...args
    ])
  }
};
module.exports = {
  builtInRules,
  letExp,
  ifExp,
  callExp,
  lambdaExp
}