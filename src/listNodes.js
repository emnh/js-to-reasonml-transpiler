var esprima = require('esprima');

var escodegen = require('escodegen');

var Lib = require('./lib.js');

var fs = require('fs');

var data = fs.readFileSync(process.argv[2], 'utf8');

var syntax =
      esprima.parse(
        data,
        { raw: true, tokens: true, range: true, comment: true });
syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

var nodeTypes = {};
var nodeTypesList = [];

var postProcess = function(code, parentNode, node) {
  if (node !== null && node !== undefined && node.hasOwnProperty('type')) {
    if (!(node.type in nodeTypes)) {
      nodeTypes[node.type] = true;
      nodeTypesList.push(node.type);
    }
    /*
    if (node.type === 'SequenceExpression') {
      console.log(Lib.getCode(code, node));
    }
    */
  }
  return node;
}

Lib.walk(data, null, syntax, postProcess);

nodeTypesList.sort();
for (var i = 0; i < nodeTypesList.length; i++) {
  var nodeType = nodeTypesList[i];
  console.log(nodeType);
}
