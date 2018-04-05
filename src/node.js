import scriptData from './example-node.txt';
var Lib = require('./lib.js');

var fs = require('fs');

var evalTimeout = 2000;

var scriptData = fs.readFileSync('./src/example-node.txt', 'utf-8');

(async () => {
  var compiled = await Lib.compile(scriptData, evalTimeout);

  var outFileName = './src/TestNode.re';
  console.log('Writing ' + outFileName);
  fs.writeFileSync(outFileName, compiled);
})();
