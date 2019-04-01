const path = require("path");
const { runFile } = require("./eval");

const runTests = () => {
  try {
    console.log("stdlib!");
    runFile(path.join(__dirname, "tests/stdlib.scm"));
    console.log("macros!");
    runFile(path.join(__dirname, "tests/macros.scm"));
    console.log("done!");
  } catch (e) {
    console.error(e);
  }
};

runTests();
