var esprima = require('esprima');

var escodegen = require('escodegen');

var $ = require('jquery');

var PIXI = require('pixi.js');

var scriptSource = "src/example.js";

console.log(scriptSource);

/* Begin ReasonML runtime code generation helpers */
var reasonCode = [];
function pushReason(reasonStub) {
  reasonCode.push(reasonStub);
};

var reasonExterns = {};
function addReasonExtern(name, decl) {
  reasonExterns[name] = decl;
};

var reasonml = {
  beforeNew: function() {
    for (var i = 0; i < arguments.length; i++) {
      getType(arguments[i]);
    };
    console.log("before", arguments);
    return arguments;
  },
  afterNew: function() {
    console.log("after", arguments);
    return arguments[0];
  }
};
/* End ReasonML runtime code generation helpers */

function getType(obj) {
  switch (typeof(obj)) {
    case 'number':
      if (obj % 1 == obj) {
        return 'int';
      } else {
        return 'float';
      }
      break;
    case 'boolean':
      return 'bool';
    default:
      return 'unknown';
  };
};

function getExpression(s) {
  var newNode = esprima.parse(s);
  newNode = newNode.body[0].expression;
  return newNode;
};

function processNewExpression(code, node) {
  var r = node.callee.range;
  var a = r[0];
  var b = r[1];
  var createId = 'new' + code.slice(a, b).replace('.', '');
  console.log(createId);
  var newNode = getExpression("reasonml.afterNew(new callee(...reasonml.beforeNew(args)))");
  console.log(newNode);
  var callee = newNode.arguments[0];
  callee.callee = node.callee;
  var beforeNew = callee.arguments[0].argument;
  beforeNew.arguments = node.arguments;
  return newNode;
};

function postProcess(code, node) {
  switch (node.type) {
    case 'NewExpression':
      return processNewExpression(code, node);
      break;
    default:
      return node;
      break;
  };
};

function walk(code, node) {
  if (node.hasOwnProperty('type')) {
    var newNode = {};
    /*
    console.log(node.type);
    */
    for (var prop in node) {
      var value = node[prop];
      var newValue;
      if (Array.isArray(value)) {
        newValue = [];
        for (var i = 0; i < value.length; i++) {
          newValue.push(walk(code, value[i]));
        }
      } else {
        newValue = walk(code, value);
      }
      newNode[prop] = newValue;
    }
    node = postProcess(code, newNode);
    /*
    console.log(node);
    */
  }
  return node;
};

function rewrite(code, ast) {
  return walk(code, ast);
};

$.get(
  scriptSource,
  function(data) {
    var syntax =
      esprima.parse(
        data,
        { raw: true, tokens: true, range: true, comment: true });

    syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

    syntax = rewrite(data, syntax);

    document.body.innerHTML = "<pre>" + JSON.stringify(syntax, null, 2) + "</pre>";

    var indent = '  ';
    var quotes = 'auto';
    var option = {
        comment: true,
        format: {
            indent: {
                style: indent
            },
            quotes: quotes
        }
    };

    var code = escodegen.generate(syntax, option);

    console.log(code);

    eval(code);
  },
  "text");
