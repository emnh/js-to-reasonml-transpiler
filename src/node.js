import scriptData from './example-node.txt';
var Lib = require('./lib.js');

var evalTimeout = 2000;

var fs = require('fs');

var scriptData = fs.readFileSync('./src/example-node.txt', 'utf-8');

(async () => {
  var compiled = await Lib.compile(scriptData, evalTimeout);

  var outFileName = './src/Test.re';
  console.log('Writing ' + outFileName);
  fs.writeFileSync(outFileName, compiled);
})();
