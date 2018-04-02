var esprima = require('esprima');

var escodegen = require('escodegen');

var $ = require('jquery');

var PIXI = require('pixi.js');

var scriptSource = "src/example.js";

var modMap = {
  'PIXI': 'pixi.js',
  'THREE': 'three.js'
};

console.log(scriptSource);

/* Begin ReasonML runtime code generation helpers */
var globalId = 0;
var globalIdName = '_ReasonMLId';
var globalTypeName = '_ReasonMLType';

function getType(obj) {
  switch (typeof(obj)) {
    case 'number':
      if (obj % 1 === 0) {
        return 'int';
      } else {
        return 'float';
      }
      break;
    case 'boolean':
      return 'bool';
      break;
    case 'object':
      if (obj === null || obj === undefined) {
        return 'Js.Nullable.t(unknownT);'
        break;
      }
      if (globalTypeName in obj) {
        return obj[globalTypeName];
      };
      if (globalIdName in obj) {
        return 'recursiveT';
      };
      obj[globalIdName] = globalId++;
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          var t = getType(obj[0]);
          for (var i = 0; i < obj.length; i++) {
            if (t != getType(obj[i])) {
              return 'array(unknownT)';
            }
          }
          return 'array(' + t + ')';
        } else {
          return 'array(unknownT)';
        };
      } else {
        var childTypes = [];
        console.log(obj);
        for (var prop in obj) {
          if (prop == globalIdName) {
            continue;
          };
          if ('hasOwnProperty' in obj && obj.hasOwnProperty(prop)) {
            childTypes.push('"' + prop + '": ' + getType(obj[prop]));
          }
        }
        var t = '{. ';
        t += childTypes.join(', ');
        t += '}';
        return t;
      }
      break;
    default:
      return 'unknownT';
  };
};

var reasonCode = [];
var reasonTypes = {};
var reasonModules = {};
var reasonExterns = {};

var reasonml = {
  beforeNew: function() {
    var opts = arguments[0];
    var externName = opts.externName;
    var modName = opts.modName;
    var callName = opts.callName;
    var argTypes = [];
    for (var i = 1; i < arguments.length; i++) {
      argTypes.push(getType(arguments[i]));
    };
    reasonExterns[externName] = {
      attributes: ['[@bs.new]'],
      argTypes: argTypes,
      retType: null,
      callName: callName
    };
    if (modName !== null) {
      reasonExterns[externName].attributes.push('[@bs.module "' + modName + '"]');
    }
    console.log("before", arguments);
    return Array.prototype.slice.call(arguments, 1);
  },
  afterNew: function() {
    var opts = arguments[0];
    var externName = opts.externName;
    externTypeName = externName.replace(/^new/, 'apptype') + 'T';
    reasonTypes[externTypeName] = {};
    arguments[1][globalTypeName] = externTypeName;
    reasonExterns[externName].retType = externTypeName;
    console.log("after", arguments);
    return arguments[1];
  }
};
/* End ReasonML runtime code generation helpers */

function getExpression(s) {
  var newNode = esprima.parse(s);
  newNode = newNode.body[0].expression;
  return newNode;
};

function processNewExpression(code, node) {
  var r = node.callee.range;
  var a = r[0];
  var b = r[1];
  var parts = code.slice(a, b).split('.');
  var createId = 'new' + parts.join('');
  var modName = null;
  if (parts.length > 1) {
    modName = parts[0];
    if (modName in modMap) {
      modName = modMap[modName];
    };
  };
  var callName = parts[parts.length - 1];
  console.log(createId);
  var expr = 
    'reasonml.afterNew(externName, new callee(...reasonml.beforeNew(externName, args)))';
  var opts = {
    externName: createId,
    callName: callName,
    modName: modName
  };
  expr = expr.replace(/externName/g, JSON.stringify(opts));
  var newNode = getExpression(expr);
  console.log(newNode);
  var callee = newNode.arguments[1];
  callee.callee = node.callee;
  var beforeNew = callee.arguments[0].argument;
  beforeNew.arguments.splice(1, 1, ...node.arguments);
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

function declareTypes() {
  var types = [];
  for (var name in reasonTypes) {
    var value = reasonTypes[name];
    s = 'type ' + name + ';';
    types.push(s);
  };
  return types;
};

function declareExterns() {
  var externs = [];
  for (var name in reasonExterns) {
    var value = reasonExterns[name];
    var retType = value.retType;
    var typesig = '(' + value.argTypes.join(', ') + ') => ' + retType;
    var callName = value.callName;
    var s =
      value.attributes.join(' ') +
      ' external ' +
      name +
      ' : ' +
      typesig +
      ' = "' + callName + '";';
    externs.push(s);
  }
  return externs;
}

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

    var types = declareTypes();

    var decl = declareExterns();

    var header = types.join('\n') + '\n' + decl.join('\n');

    console.log(header);
  },
  "text");
