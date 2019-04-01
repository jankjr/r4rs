module.exports = {
  extends: ["prettier"],
  env: {},
  rules: {
    "prettier/prettier": "error"
  },
  plugins: ["prettier"],
  parser: "babel-eslint",
  settings: {
    react: {
      version: "detect"
    }
  }
};
