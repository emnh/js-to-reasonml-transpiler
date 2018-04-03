var esprima = require('esprima');

var escodegen = require('escodegen');

var CodeMirror = require('codemirror');

require('codemirror/mode/javascript/javascript');

require('codemirror/mode/mllike/mllike');

var $ = require('jquery');

var scriptSource = "src/example.js";

var libSource = "src/lib.js";

var modMap = {
  'PIXI': 'pixi.js',
  'THREE': 'three.js'
};

var globalsMap = {
  'document': {},
  'window': {}
};

/* Begin ReasonML runtime code generation helpers */
var globalId = 0;
var globalIdName = '_ReasonMLId';
var globalIndexName = '_ReasonMLIndex';
var globalTypeName = '_ReasonMLType';
var smallObjectCounter = 0;

function getType(obj, rootNode, marker) {
  if (marker === undefined) {
    marker = globalId++;
  }
  var byUsage = function(prefix) {
    var usageT = 'usage' + getExternName(astCode, rootNode) + 'T';
    obj[globalTypeName] = usageT;
    reasonTypes[obj[globalTypeName]] = {};
    return usageT;
  };
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
      var typeName = undefined;
      try {
        typeName = obj.constructor.name;
      } catch (error) {
      }
      if (typeName != undefined && typeName != "Object" && typeName != "Array") {
        obj[globalTypeName] = 'app' + typeName + 'T';
        reasonTypes[obj[globalTypeName]] = {};
        /* TODO: give type a body? */
      }
      if (globalTypeName in obj) {
        return obj[globalTypeName];
      };
      if (globalIdName in obj && globalIdName == marker) {
        return 'recursiveT';
      };
      obj[globalIdName] = marker;
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          var t = getType(obj[0], rootNode);
          for (var i = 0; i < obj.length; i++) {
            if (t != getType(obj[i]), rootNode) {
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
        var propCount = 0;
        var propLimit = 10;
        for (var prop in obj) {
          if (prop == globalIdName) {
            continue;
          };
          if ('hasOwnProperty' in obj && obj.hasOwnProperty(prop) && !isFunction(obj[prop])) {
            childTypes.push('"' + prop + '": ' + getType(obj[prop], rootNode));
            propCount++;
            if (propCount > propLimit) {
              break;
            };
          }
        }
        var t = '{. ';
        t += childTypes.join(', ');
        t += '}';
        if (propCount <= propLimit) {
          var retval = 'smallObject' + smallObjectCounter.toString() + 'T';
          reasonTypes[retval] = { decl: t };
          smallObjectCounter++;
          return retval;
        } else {
          /*
          return 'tooBigObjectT';
          */
          return byUsage('usage');
        };
      }
      break;
    default:
      /*
      console.log("UNKNOWNT");
      console.log(obj);
      */
      if (obj === undefined) {
        return 'unit';
      };
      if (isFunction(obj)) {
        return byUsage('usageFun');
      };
      return 'unknownT';
      break;
  };
};

var reasonCode = [];
var reasonTypes = {
  'unknownT': {},
  "unknownFunT('a, 'b)": { decl: "'a => 'b" },
  'recursiveT': {},
  'tooBigObjectT': {}
};
var reasonModules = {};
var reasonExterns = {};
var astCode = '';
var astNodes = [];
var astNodeParents = {};
var astNodesDebug = {};
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

function lowercaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
};

function getExternName(code, node) {
  var lexpr = getCode(code, node);
  var parts = lexpr.split('.');
  var cparts = [];
  for (var i = 0; i < parts.length; i++) {
    cparts[i] = capitalizeFirstLetter(parts[i]);
  }
  return cparts.join('');
};

function getExternCallName(code, node) {
  var lexpr = getCode(code, node);
  var parts = lexpr.split('.');
  var cparts = [];
  for (var i = 0; i < parts.length; i++) {
    if (i == 0) {
      cparts[i] = parts[i].toLowerCase();
    } else {
      cparts[i] = capitalizeFirstLetter(parts[i]);
    };
  }
  return cparts.join('');
};

function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}

function addArgTypes(node, argTypes) {
  for (var i = 0; i < node.arguments.length; i++) {
    var arg = node.arguments[i];
    var argType = arg[globalTypeName];
    argTypes.push(argType);
  }
};

function applyExpression(opts, code, node) {
  var attributes = opts.attributes;
  var prefix = '';
  var createId = 'BLAH';
  if (opts.type == 'new') {
    prefix = 'new';
    createId = prefix + getExternName(code, node.callee);
  } else if (opts.type == 'call') {
    prefix = '';
    createId = getExternCallName(code, node.callee);
  }
  if (prefix == '') {
    createId = lowercaseFirstLetter(createId);
  };
  var modName = null;
  var parts = getCode(code, node.callee).split('.');
  if (parts.length > 1 && opts.type == 'new') {
    modName = parts[0];
    if (modName in modMap) {
      modName = modMap[modName];
    };
  };
  var callName = parts[parts.length - 1];

  var argTypes = [];
  var objArg = '';
  var reargs = joinArgs(node);
  var isNotExtern = false;
  if (opts.type == 'call') {
    if (node.callee.type == 'MemberExpression') {
      argTypes.push(node.callee.object[globalTypeName]);
      objArg = node.callee.object.reasonml;
      if (reargs != '') {
        objArg = objArg + ', ';
      };
    } else {
      /* Top level call */
      isNotExtern = !(callName in window); 
      createId = callName;
    };
  };
  addArgTypes(node, argTypes);
  var retType = node[globalTypeName];

  var externName = createId;
  reasonExterns[externName] = {
    isNotExtern: isNotExtern,
    attributes: attributes,
    argTypes: argTypes,
    retType: retType,
    callName: callName
  };
  if (modName !== null) {
    reasonExterns[externName].attributes.push('[@bs.module "' + modName + '"]');
  }
  node.reasonml = createId + "(" + objArg + reargs + ")";
  return node;
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
    if (node[globalTypeName] == 'string') {
      node.reasonml = '"' + node.value + '"';
    } else {
      node.reasonml = node.raw;
    }
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
    var prefix = '';
    if (node.expression[globalTypeName] !== 'unit' && node.expression[globalTypeName] !== undefined) {
      prefix = 'let _ = ';
    };
    /*
    console.log(getCode(code, node), node.expression[globalTypeName]);
    */
    node.reasonml = prefix + node.expression.reasonml + ';';
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
    var parentNode = astNodeParents[node[globalIndexName]];
    if (parentNode.type == 'AssignmentExpression' &&
        parentNode.left[globalIndexName] == node[globalIndexName]) {
      qual = 'set';
      var externName = qual + getExternName(code, node);
      var attributes = ['[@bs.set]'];
      var argTypes = [node.object[globalTypeName], parentNode.right[globalTypeName]];
      var retType = 'unit';
      var callName = node.property.name;
      reasonExterns[externName] = {
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = '/* Not used */';
      node.reasonmlSet = externName;
      node.reasonmlLeft = node.object.reasonml;
    } else {
      if (node[globalTypeName] === undefined) {
        node.reasonml = '/* Unresolved MemberExpression */';
        return node;
      };
      qual = 'get';
      var externName = qual + getExternName(code, node);
      var attributes = ['[@bs.get]'];
      var argTypes = [node.object[globalTypeName]];
      var retType = node[globalTypeName];
      var callName = node.property.name;
      reasonExterns[externName] = {
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = externName + '(' + node.object.reasonml + ')';
    }
    return node;
  },
  Identifier: function(code, node) {
    if (node.name in globalsMap) {
      var externName = node.name;
      var attributes = ['[@bs.val]'];
      var argTypes = ['unit'];
      var retType = node[globalTypeName];
      var callName = node.name;
      reasonExterns[externName] = {
        noargs: true,
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = node.name;
    } else if (node.name in modMap) {
      var externName = 'mod' + node.name;
      var attributes = ['[@bs.val]', '[@bs.module "' + modMap[node.name] + '"]'];
      var argTypes = ['unit'];
      var retType = node[globalTypeName];
      var callName = node.name;
      reasonExterns[externName] = {
        noargs: true,
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = externName;
    } else {
      node.reasonml = node.name;
    };
    return node;
  },
  AssignmentExpression: function(code, node) {
    if (node.left.reasonmlSet !== undefined) {
      /* Property */
      node.reasonml = node.left.reasonmlSet + '(' + node.left.reasonmlLeft + ", " + node.right.reasonml + ')';
    } else {
      /* Plain assignment */
      node.reasonml = 'let ' + node.left.reasonml + ' = ' + node.right.reasonml;
    }
    return node;
  },
  BinaryExpression: function(code, node) {
    node.reasonml = node.left.reasonml + ' ' + node.operator + ' ' + node.right.reasonml;
    return node;
  },
  FunctionDeclaration: function(code, node) {
    node.reasonml = "";
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

function postProcess(code, parentNode, node) {
  if (node.type in processNodes) {
    var process = processNodes[node.type];
    return process(code, node);
  };
  return node;
};

function U(index, arg) {
  astNodes[index][globalTypeName] = getType(arg, astNodes[index]);
  astNodesDebug[index] = arg;
  return arg;
};

function checkNodePath(node, f) {
  while (astNodeParents[node[globalIndexName]] != null) {
    if (f(node)) {
      return true;
    };
    node = astNodeParents[node[globalIndexName]];
  }
  if (f(node)) {
    return true;
  };
  return false;
}

function postProcessTypes(code, parentNode, node) {
  var directIgnores = {
    'VariableDeclaration': {},
    'FunctionDeclaration': {},
    'ExpressionStatement': {},
    'AssignmentExpression': {},
    'Program': {},
    'Property': {},
    'Line': {},
    'Block': {},
    'BlockStatement': {}
  };
  var checkIt = function(ignores, propName) {
    var f = function(node) {
      return node.type in ignores;
    };
    var g = function(node) {
      var parentNode = astNodeParents[node[globalIndexName]];
      if (parentNode != null) {
        if (propName in parentNode) {
          if (node[globalIndexName] === parentNode[propName][globalIndexName]) {
            return true;
          }
          if (Array.isArray(parentNode[propName])) {
            for (var i = 0; i < parentNode[propName].length; i++) {
              var pNode = parentNode[propName][i];
              if (node[globalIndexName] === pNode[globalIndexName]) {
                return true;
              }
            }
          }
        }
      };
      return false;
    };
    var done = false;
    var h = function(node) {
      /*
      if (propName == 'body') {
        console.log("done", done);
      };
      */
      if (done) {
        return false;
      };
      if (g(node)) {
        done = true;
        return false;
      };
      return f(node);
    };
    return checkNodePath(node, h);
  };
  /*
  var checkNodeParentNew = function(node) {
    var parentNode = astNodeParents[node[globalIndexName]];
    if (parentNode != null) {
      if (parentNode.type == 'NewExpression') {
        return true;
      };
    }
    return false;
  };
  */
  var checkNodeParent = function(node, parentType, prop) {
    var parentNode = astNodeParents[node[globalIndexName]];
    if (parentNode != null) {
      if (parentNode.type == parentType) {
        if (prop in parentNode && parentNode[prop][globalIndexName] === node[globalIndexName]) {
          return true;
        }
      }
    }
    return false;
  };
  var checkNodeParentAssign = function(node) {
    return checkNodeParent(node, 'AssignmentExpression', 'left');
  };
  var checkNodeParentMemberProperty = function(node) {
    return checkNodeParent(node, 'MemberExpression', 'property');
  };
  var checkNodeParentCallCallee = function(node) {
    return checkNodeParent(node, 'CallExpression', 'callee');
  };
  var checkNodeParentFunctionId = function(node) {
    return checkNodeParent(node, 'FunctionDeclaration', 'id');
  };
  var isVarDecl = checkIt({ 'VariableDeclarator': {} }, 'init');
  var isObjKey = checkIt({ 'Property': {} }, 'value');
  var isFunDecl = checkIt({ 'FunctionDeclaration': {} }, 'body');
  var isNewCallee = checkIt({ 'NewExpression': {} }, 'arguments') && node.type != 'NewExpression';
  var isAssign = checkNodeParentAssign(node);
  /*
  console.log(
    node.type,
    getCode(code, node),
    !(node.type in directIgnores),
    !isVarDecl,
    !isObjKey,
    !isFunDecl,
    !isNewCallee,
    !isAssign,
    !checkNodeParentMemberProperty(node),
    !checkNodeParentCallCallee(node),
    !checkNodeParentFunctionId(node));
    */
  if (!(node.type in directIgnores) &&
      !isVarDecl &&
      !isObjKey &&
      !isFunDecl &&
      !isNewCallee &&
      !isAssign &&
      !checkNodeParentMemberProperty(node) &&
      !checkNodeParentCallCallee(node) &&
      !checkNodeParentFunctionId(node)) {
    var expr = 'U(' + node[globalIndexName] + ', arg)';
    var newNode = getExpression(expr);
    newNode.arguments[1] = node;
    newNode.isU = true;
    return newNode;
  }
  return node;
};

function postProcessTypesAdd(code, parentNode, node) {
  node[globalIndexName] = astNodes.length;
  astNodes.push(node);
  astNodeParents[node[globalIndexName]] = parentNode;
  return node;
};

function walk(code, parentNode, node, postProcess) {
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
          newValue.push(walk(code, newNode, value[i], postProcess));
        }
      } else {
        newValue = walk(code, newNode, value, postProcess);
      }
      newNode[prop] = newValue;
    }
    node = postProcess(code, parentNode, newNode);
    /*
    console.log(node);
    */
  }
  return node;
};

function rewrite(code, ast, postProcess) {
  return walk(code, null, ast, postProcess);
};

function declareTypes(body, externs) {
  var types = [];
  for (var name in reasonTypes) {
    var value = reasonTypes[name];
    if ('decl' in value) {
      value = value.decl;
    } else {
      value = '';
    };
    /* Only list types that are used */
    if (body.includes(name) || externs.includes(name)) {
      if (value != '') {
        s = 'type ' + name + ' = ' + value + ';';
      } else {
        s = 'type ' + name + ';';
      }
      types.push(s);
    };
  };
  return types;
};

function declareExterns() {
  var externs = [];
  for (var name in reasonExterns) {
    var value = reasonExterns[name];
    if ('isNotExtern' in value && value.isNotExtern) {
      continue;
    };
    var noargs = 'noargs' in value;
    var retType = value.retType;
    var typesig;
    if (noargs) {
      typesig = retType;
    } else {
      typesig = '(' + value.argTypes.join(', ') + ') => ' + retType;
    };
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

function compile(data) {
  var syntax =
    esprima.parse(
      data,
      { raw: true, tokens: true, range: true, comment: true });

  syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

  var syntax2 = rewrite(data, syntax, postProcessTypesAdd);

  var syntaxForTypes = rewrite(data, syntax2, postProcessTypes);
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

  /*
  console.log(esprima.parse('V(0, {a: 2})["a"];'));
  */

  console.log(code);

  astCode = data;

  eval(code);
  
  var syntaxReasonML = rewrite(data, syntax2, postProcess);
  
  var decl = declareExterns().join('\n');

  var types = declareTypes(syntaxReasonML.reasonml, decl);

  var header = types.join('\n') + '\n' + decl;

  var body = syntaxReasonML.reasonml;

  var program = header + '\n' + body;

  /*
  console.log(program);
  */

  return program;
};

/* Load CodeMirror CSS */
$('document').ready(function() {
  $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href',
        'css/codemirror.css'));

  $.get(
    scriptSource,
    function(data) {

      $('body').append('<h2>Introduction</h2>');
      $('body').append('<p>Welcome to my very hacky JavaScript to ReasonML transpiler! ' +
          'Paste your code in the <a href="#exampleCode">Code to Transpile</a> ' +
          'and the script will try to convert it into ReasonML externs and code. ' +
          'WARNING: Example code will be evaled in a rewritten form to fill in the types. ' +
          'Untriggered event handlers and functions will not be translated.' +
          'Just some basics are supported for now, and it is sure to be buggy, ' + 
          'but it might be more helpful than starting from scratch.</p>' + 
          '<p>Make sure your example code does not clear the DOM, or you will lose the output boxes.</p>');

      $('body').append('<div><a name="exampleCode"><h2>Code to Transpile</h2></a>' +
          '<textarea id="example" cols=80 rows=20></textarea></div>');
      var textarea = $('#example');
      textarea.val(data);
      var editor = CodeMirror.fromTextArea(textarea[0], {
        lineNumbers: true,
        mode: 'javascript'
      });
      
      $('body').append('<div><a name="libraryCode"><h2>Library code</h2></a>' +
          '<p>Paste extra library code here. ' +
          'Will be evaluated for example code to use, but not attempted translated. ' +
          '</p><textarea id="libsource" cols=80 rows=10></textarea></div>');
      var libarea = $('#libsource');
      var pixiURL = 'https://cdnjs.cloudflare.com/ajax/libs/pixi.js/4.7.1/pixi.js';
      libarea.val('$.getScript("' + pixiURL + '", function(data) { console.log("Library loaded"); });');
      
      var editor2 = CodeMirror.fromTextArea(libarea[0], {
        lineNumbers: true,
        mode: 'javascript'
      });
      
      $('body').append('<h2>ReasonML Output</h2>');
      
      $('body').append(
        '<div><input id="loadlibs" type="button" value="Load Library"></input>' +
        '<input id="transpile" type="button" value="Transpile"></input></div>');
      
      $('body').append('<textarea id="result" cols=80 rows=100></textarea>');
      var resultarea = $("#result");
      var editor3 = CodeMirror.fromTextArea(resultarea[0], {
        lineNumbers: true,
        mode: 'mllike'
      });

      $("#loadlibs").on("click", function() {
        eval(editor2.getDoc().getValue());
      });
      $("#transpile").on("click", function() {
        $("#result").val('Waiting for document.ready...');
        var result = compile(editor.getDoc().getValue());
        /*
        $("#result").val(result);
        */
        editor3.getDoc().setValue(result);
      });

      $('body').append('<h2>Eval DOM Output</h2>');
    },
    "text");
});
