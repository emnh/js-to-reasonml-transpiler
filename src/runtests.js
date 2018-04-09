import root from 'window-or-global';

var Lib = require('./lib.js');

var fs = require('fs');

var path = require('path');

var cp = require('child_process');

var evalTimeout = 0;

var tests = Lib.tests;

var myDir = path.resolve('.');
var dirName = path.resolve('./rebuild');
var srcDirName = dirName + '/src';

(async () => {
  var bsb = path.resolve('./node_modules/.bin/bsb');
  if (!fs.existsSync(dirName)) {
    cp.execSync(bsb + ' -init rebuild -theme basic-reason', { cwd: myDir });
  }
  var i = 0;
  for (var name in tests) {
    i += 1;
    var value = tests[name];
    var program = value.program;
    var compiled;
    try {
      var logs = [];
      root.fakeConsole = {
        log: function(obj) {
          logs.push(obj);
        }
      };
      compiled = await Lib.compile(program, evalTimeout);
    } catch(error) {
      console.log("Test failed transpile: ", name);
      console.log(error.stack.toString());
      /*
      var ast = Lib.compileAST(program);
      console.log(ast);
      */
      continue;
    }
    var tempFileName = srcDirName + '/Temp' + i + '.re';
    var jsOutFileName = srcDirName + '/Temp' + i + '.bs.js';
    var cleanup = function() {
      try {
        fs.unlinkSync(tempFileName);
      } catch (error) {
      }
    };
    fs.writeFileSync(tempFileName, compiled);
    var js;
    try {
      /*
      var js = await bsb.compileFileSync('js', tempFileName);
      */
      try {
        fs.unlinkSync(jsOutFileName);
      } catch (error) {
      }
      cp.execSync(
          bsb, {
            cwd: dirName
          });
      js = fs.readFileSync(jsOutFileName, 'utf-8');
      js = js.replace('console.log', 'log');
    } catch (error) {
      cleanup();
      console.log("Test failed ReasonML compile: ", name);
      console.log(compiled);
      console.log(error.stdout.toString('utf-8'));
      console.log(error.stack.toString());
      continue;
      /*
      console.log(error.stack.toString());
      */
    }
    cleanup();
    var logs = [];
    root.fakeConsole = {
      log: function(obj) {
        logs.push(obj);
      }
    };
    try {
      eval(js);
    } catch(error) {
      console.log("Test failed eval: ", name);
      console.log(compiled);
      console.log(js);
      console.log(error.stack.toString());
      continue;
    }
    if (JSON.stringify(logs) != JSON.stringify(value.out)) {
      console.log("Test failed compare: ", name);
      console.log("Found: ", logs, ", expected: ", value.out);
      console.log(compiled);
      console.log(js);
      continue;
    }
    console.log("Test succeeded: ", name);
  }
})();
