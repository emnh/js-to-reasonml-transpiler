var esprima = require('esprima');

var escodegen = require('escodegen');

var $ = require('jquery');

var PIXI = require('pixi.js');

var scriptSource = "src/example.js";

var modMap = {
  'PIXI': 'pixi.js',
  'THREE': 'three.js'
};

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
    case 'string':
      return 'string';
      break;
    case 'object':
      if (obj === null || obj === undefined) {
        return 'Js.Nullable.t(unknownT);'
        break;
      }
      var typeName = obj.constructor.name;
      if (typeName != undefined && typeName != "Object") {
        obj[globalTypeName] = 'app' + typeName + 'T';
        reasonTypes[obj[globalTypeName]] = {};
        /* TODO: give type a body? */
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
        /*
        console.log(obj);
        */
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
var reasonTypes = {
  'unknownT': {},
  'recursiveT': {}
};
var reasonModules = {};
var reasonExterns = {};
var ast;

var reasonml = {
  beforeApply: function() {
    var opts = arguments[0];
    var externName = opts.externName;
    var modName = opts.modName;
    var callName = opts.callName;
    var attributes = opts.attributes;
    var argTypes = [];
    for (var i = 1; i < arguments.length; i++) {
      argTypes.push(getType(arguments[i]));
    };
    reasonExterns[externName] = {
      attributes: attributes,
      argTypes: argTypes,
      retType: null,
      callName: callName
    };
    if (modName !== null) {
      reasonExterns[externName].attributes.push('[@bs.module "' + modName + '"]');
    }
    /*
    console.log("before", arguments);
    */
    return Array.prototype.slice.call(arguments, 1);
  },
  afterApply: function() {
    var opts = arguments[0];
    var externName = opts.externName;
    externTypeName = opts.externTypeName;
    var retval = arguments[1];
    /*
    reasonTypes[externTypeName] = {};
    if (typeof(retval) == 'object' && retval !== 'undefined' && retval !== null) {
      arguments[1][globalTypeName] = externTypeName;
      reasonExterns[externName].retType = externTypeName;
    } else {
      reasonExterns[externName].retType = getType(retval);
    };
    */
    reasonExterns[externName].retType = getType(retval);
    /*
    console.log("after", arguments);
    */
    return arguments[1];
  }
};
/* End ReasonML runtime code generation helpers */

function getExpression(s) {
  var newNode = esprima.parse(s);
  newNode = newNode.body[0].expression;
  return newNode;
};

function joinArgs(node) {
  var reasonmlArgs = [];
  for (var i = 0; i < node.arguments.length; i++) {
    reasonmlArgs.push(node.arguments[i].reasonml);
  }
  return reasonmlArgs.join(', ');
};

function getCode(code, node) {
  var r = node.range;
  var a = r[0];
  var b = r[1];
  var part = code.slice(a, b);
  return part;
};

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

function applyExpression(opts, code, node) {
  var attributes = opts.attributes;
  var parts = getCode(code, node.callee).split('.');
  var prefix = '';
  if (opts.type == 'new') {
    prefix = 'new';
  }
  var createId = prefix + parts.join('');
  var modName = null;
  if (parts.length > 1 && opts.type == 'new') {
    modName = parts[0];
    if (modName in modMap) {
      modName = modMap[modName];
    };
  };
  var callName = parts[parts.length - 1];
  /*
  console.log(createId);
  */
  var newCallee = '';
  if (opts.type == 'new') {
    newCallee = 'new';
  }
  var expr =
    'reasonml.afterApply(externOpts, ' + newCallee + ' callee(...reasonml.beforeApply(externOpts, args)))';
  var opts = {
    externName: createId,
    externTypeName: createId.replace(prefix, '') + 'T',
    callName: callName,
    modName: modName,
    attributes: attributes
  };
  expr = expr.replace(/externOpts/g, JSON.stringify(opts));
  var newNode = getExpression(expr);
  /*
  console.log(newNode);
  */
  var callee = newNode.arguments[1];
  callee.callee = node.callee;
  var beforeNew = callee.arguments[0].argument;
  beforeNew.arguments.splice(1, 1, ...node.arguments);
  newNode.reasonml = createId + "(" + joinArgs(node) + ")";
  return newNode;
};

function applyAssignment(opts, code, node) {
  var attributes = opts.attributes;
  var parts = getCode(code, node).split('.');
  var prefix = '';
  if (opts.type == 'new') {
    prefix = 'new';
  }
  var createId = prefix + parts.join('');
  var modName = null;
  if (parts.length > 1 && opts.type == 'new') {
    modName = parts[0];
    if (modName in modMap) {
      modName = modMap[modName];
    };
  };
  var callName = parts[parts.length - 1];
  console.log(createId);
  var newCallee = '';
  if (opts.type == 'new') {
    newCallee = 'new';
  }
  var expr =
    'reasonml.afterApply(externOpts, ' + newCallee + ' callee(...reasonml.beforeApply(externOpts, args)))';
  var opts = {
    externName: createId,
    externTypeName: createId.replace(prefix, '') + 'T',
    callName: callName,
    modName: modName,
    attributes: attributes
  };
  expr = expr.replace(/externOpts/g, JSON.stringify(opts));
  var newNode = getExpression(expr);
  console.log(newNode);
  var callee = newNode.arguments[1];
  callee.callee = node.callee;
  var beforeNew = callee.arguments[0].argument;
  beforeNew.arguments.splice(1, 1, ...node.arguments);
  newNode.reasonml = createId + "(" + joinArgs(node) + ")";
  return newNode;
};
var processNodes = {
  Program: function(code, node) {
    var rml = [];
    for (var i = 0; i < node.body.length; i++) {
      var child = node.body[i];
      rml.push(child.reasonml);
    }
    node.reasonml = rml.join('\n');
    return node;
  },
  VariableDeclaration: function(code, node) {
    var rml = [];
    for (var i = 0; i < node.declarations.length; i++) {
      var name = node.declarations[i].id.name;
      var s = 'let ' + name + ' = ' + node.declarations[i].init.reasonml + ';';
      rml.push(s);
    }
    node.reasonml = rml.join('\n');
    return node;
  },
  Literal: function(code, node) {
    node.reasonml = node.raw;
    return node;
  },
  ObjectExpression: function(code, node) {
    var rml = [];
    for (var i = 0; i < node.properties.length; i++) {
      var prop = node.properties[i];
      var name = prop.key.name;
      var value = prop.value;
      rml.push('"' + name + '": ' + value.reasonml + '\n');
    };
    node.reasonml = '{' + rml.join(',') + '}';
    return node;
  },
  ExpressionStatement: function(code, node) {
    /* TODO: check return type if let _ is necessary */
    node.reasonml = 'let _ = ' + node.expression.reasonml;
    return node;
  },
  CallExpression: function(code, node) {
    return applyExpression({
        type: 'call',
        attributes: ['[@bs.send]']
      },
      code,
      node);
  },
  MemberExpression: function(code, node) {
    node.reasonml = node.object.reasonml + "." + node.property.reasonml;
    return node;
  },
  Identifier: function(code, node) {
    node.reasonml = node.name;
    return node;
  },
  AssignmentExpression: function(code, node) {
    var lexpr = getCode(code, node.left);
    var parts = lexpr.split('.');
    var cparts = [];
    for (var i = 0; i < parts.length; i++) {
      cparts[i] = capitalizeFirstLetter(parts[i]);
    }
    var name = 'set' + cparts.join('');
    node.reasonml = name + '(' + node.left.reasonml + ", " + node.right.reasonml + ')';
    /*
    node.left = applyAssignment({
        type: 'assign',
        attributes: ['[@bs.send]']
      },
      code,
      node.left);*/
    return node;
  },
  BogusTemplate: function(code, node) {
    node.reasonml = "";
    return node;
  },
  NewExpression: function(code, node) {
    return applyExpression({
        type: 'new',
        attributes: ['[@bs.new]']
      },
      code,
      node);
  }
};

function postProcessTypes(code, node) {
  if (node.type in processNodes) {
    var process = processNodes[node.type];
    return process(code, node);
  };
  return node;
};

function walk(code, node, postProcess) {
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
          newValue.push(walk(code, value[i], postProcess));
        }
      } else {
        newValue = walk(code, value, postProcess);
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

function rewrite(code, ast, postProcess) {
  return walk(code, ast, postProcess);
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

    document.body.innerHTML = "<pre>" + JSON.stringify(syntax, null, 2) + "</pre>";

    var syntaxForTypes = rewrite(data, syntax, postProcessTypes);

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

    var code = escodegen.generate(syntaxForTypes, option);

    console.log(code);

    eval(code);

    var types = declareTypes();

    var decl = declareExterns();

    var header = types.join('\n') + '\n' + decl.join('\n');

    var body = syntaxForTypes.reasonml;

    var program = header + '\n' + body;

    console.log(program);
  },
  "text");
