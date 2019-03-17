// represents a scheme variable scope
const {
  syntacticForms,
  isSymbol
} = require("./types");
const { defineSyntax } = require("./preludeSyntaxRules");
class Env {
  constructor(parent) {
    if (parent) {
      this.root = parent.root;
    } else {
      this.root = this;
    }

    this.parent = parent;
    this.scope = {};
    this.syntaxRules = {
      "define-syntax": defineSyntax
    };
  }
  isSyntaxRule(symbol) {
    if (!isSymbol(symbol)) throw new Error("Not symbol " + symbol.type);
    return syntacticForms.has(symbol.value) || this.lookupSyntaxRule(symbol.value) !== null;
  }
  lookupSyntaxRule(name) {
    if (name in this.syntaxRules) {
      return this.syntaxRules[name];
    }
    if (this.parent) return this.parent.lookupSyntaxRule(name);
    return null;
  }
  lookup(name) {
    if (name in this.scope) {
      return this.scope[name];
    }
    if (this.parent) return this.parent.lookup(name);
    throw new Error(name + " is not defined");
  }
  isDefined(name) {
    if (name in this.scope || name in this.syntaxRules) {
      return true
    }
    if (this.parent) return this.parent.isDefined(name);
    return false;
  }
  define(k, v) {
    if (this.scope[k]) throw new Error(k + " already defined");
    this.scope[k] = v;
  }
  defineSyntax(k, v) {
    if (this.parent) this.parent.defineSyntax(k, v);
    else {
      this.syntaxRules[k] = v;
    }
  }
  set(k, v) {
    if (k in this.scope) {
      this.scope[k] = v;
    } else if (this.parent) {
      this.parent.set(k, v);
    } else {
      throw new Error(k + " is not defined");
    }
  }
  subscope() {
    return new Env(this);
  }
}

module.exports.Env = Env;
