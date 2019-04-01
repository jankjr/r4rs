const path = require("path");
const { runFile } = require("./eval");

const runTests = () => {
  try {
    console.log(runFile(path.join(__dirname, "run.scm")));
  } catch (e) {
    console.error(e);
  }
};

runTests();
