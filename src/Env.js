// represents a scheme variable scope

class Env {
  constructor(parent) {
    this.parent = parent;
    this.scope = {};
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
  set(k, v) {
    if (k in this.scope) {
      this.scope[k] = v;
    }
    if (this.parent) this.parent.set(k, v);
    throw new Error(name + " is not defined");
  }
  subscope() {
    return new Env(this);
  }
}

module.exports.Env = Env;