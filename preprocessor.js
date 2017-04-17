const tsc = require('typescript');
const tsConfig = require('./tsconfig.json');

module.exports = {
  process(src, path) {
    let compiled = src;
    // compiles typescript if necessary
    if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      compiled = tsc.transpile(
        compiled,
        tsConfig.compilerOptions,
        path,
        []
      );
    }
    return compiled;
  },
};
