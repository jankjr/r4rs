{
  const{
    make,
    pair,
    nil,
    symbol,
    list,
    True,
    False
  } = require("./types");
  const desugar = (t, e) => list([symbol(t), e])
}

Source "source"
  = expressions:Exp* {
    return expressions
  }

Exp = _ abbr:Abbr? _ exp:(Terminal / SExp) _ {
    if (abbr) {
      return desugar(abbr, exp)
    }
  return exp
}

Abbr = "'" { return "quote" }
     / "`" { return "quasiquote" }
     / ",@" { return "unquote-splicing" }
     / "," { return "unquote" }
SExp = _ v:"#"? _ exp:_SExp {
  if (v) {
    return pair(symbol("vector"), exp);
  }
  return exp
}

_SExp = _ "(" _ exps:SExps _ ")" _ {
  return exps
} /  _ "[" _ exps:SExps _ "]" _ {
  return exps
}

SExps = x:Exp* xs:(_ "." _ Exp)? {
    if (xs) {
      return list(x, xs[3])
    }
  return list(x)
}

Terminal = Boolean / Character / Number / String / Identifier

Character = "#\\newline" {
  return make("char", "\n")
} / "#\\space" {
  return make("char", " ")
} / "#\\" c:[^ \t\n\r;] {
  return make("char", c)
}

Identifier = x:Initial xs:Subsequent* { return symbol(x + xs.join("")) }
           / PecularIdentififer { return symbol(text()) }
Initial = Letter / SpecialInitial
Letter = [a-zA-Z]
SpecialInitial = "!" / "$" / "%" / "&" / "*" / "/" / ":" / "<" / "=" / ">" / "?" / "~" / "_" / "^"
Subsequent = Initial / Digit / SpecialSubsequent
SpecialSubsequent = "." / "+" / "-"
PecularIdentififer = "+" / "-" / "..."
String "string"
 = "\"" chrs:StringChr* "\"" { return make("string", chrs.join("")) }

StringChr "char"
 = [^\\"]
 / "\\\\" { return "\\" }
 / "\\\"" { return "\"" }

Boolean "boolean"
  = "#t" { return True }
  / "#f" { return False }

Number "sign number"
 = s:"-"? n:_Number {
  if (s) {
    n.value *= -1;
  }
  return n;
 }

_Number "number"
  = int:Digits frac:("." Digits)? {
    if (!frac) return make("int", parseInt(int))
    return make("float", parseFloat(int + frac.join("")))
  }
  / "." Digits {
    return make("float", parseFloat(text()))
  }

Digits "digits" = d:Digit+ { return d.join("") }
Digit "digit" = [0-9]

_ "whitespace"
  = [ \t]* (";"[^\n]*)? [\n\r]?