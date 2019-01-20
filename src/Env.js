// represents a scheme variable scope

class Env {
  constructor(parent) {
    this.parent = parent;
    this.scope = {};
    this.syntaxRules = {};
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
      return this.scope[name]
    }
    if (this.parent) return this.parent.lookup(name);
    throw new Error(name + " is not defined");
  }
  define(k, v) {
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
    }
    else if (this.parent) {
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