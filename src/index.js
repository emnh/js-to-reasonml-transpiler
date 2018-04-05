/* PIXI required only for convenience of fast dev iter on example */

import css from '../css/codemirror.css';

import scriptData from './example.txt';

var PIXI = require('pixi.js');

var esprima = require('esprima');

var escodegen = require('escodegen');

var CodeMirror = require('codemirror');

require('codemirror/mode/javascript/javascript');

require('codemirror/mode/mllike/mllike');

var $ = require('jquery');

/*
var scriptSource = "examples/example_012.js";
*/

var libSource = "src/lib.js";

var modMap = {
  'PIXI': 'pixi.js',
  'THREE': 'three.js'
};

var globalsMap = {
  'document': {},
  'window': {},
  'console': {},
  'Math': {}
};

var reserved = 'and,as,assert,asr,begin,class,constraint,do,done,downto,else,end,exception,external,false,for,fun,function,functor,if,in,include,inherit,initializer,land,lazy,let,lor,lsl,lsr,lxor,match,method,mod,module,mutable,new,nonrec,object,of,open,or,private,rec,sig,struct,then,to,true,try,type,val,virtual,when,while,with';
reserved = reserved.split(',');

var state;

var evalTimeout = 2000;
var statementTerminator = ';\n';
var globalIdName = '_ReasonMLId';
var globalIndexName = '_ReasonMLIndex';
var globalTypeName = '_ReasonMLType';
var globalTypeDecl = '_ReasonMLTypeDecl';

function initState(code) {
  return {
    smallObjectCounter: 0,
    anonymousFunctionCounter: 0,
    reasonTypes: {
      'unknownT': {},
      "unknownFunT('a, 'b)": { decl: "'a => 'b" },
      'recursiveT': {},
      'tooBigObjectT': {}
    },
    reasonExterns: {},
    astCode: code,
    astNodes: [],
    astNodeParents: {},
    astNodeObjects: [],
    astMutables: {},
    astNodesDebug: {}
  };
};

var globalId = 0;

function getType(obj, rootNode, marker) {
  if (marker === undefined) {
    marker = globalId++;
  }
  var byUsage = function(prefix, isFun) {
    var externName = getExternName(state.astCode, rootNode);
    if (rootNode.type == 'FunctionExpression') {
      externName = 'Anon' + state.anonymousFunctionCounter.toString();
      state.anonymousFunctionCounter++;
    }
    var usageT = prefix + externName + 'T';
    state.reasonTypes[usageT] = {};
    /*
    if (isFun) {
      var usageArgT = prefix + externName + 'ArgT';
      var usageRetT = prefix + externName + 'RetT';
      state.reasonTypes[usageT] = {
        decl: usageArgT + ' => ' + usageRetT + ' and ' + usageArgT + ' and ' + usageRetT
      };
    }
    */
    obj[globalTypeName] = usageT;
    obj[globalTypeDecl] = state.reasonTypes[obj[globalTypeName]];
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
        return 'Js.Nullable.t(unknownT)'
        break;
      }
      var typeName = undefined;
      try {
        typeName = obj.constructor.name;
      } catch (error) {
      }
      if (typeName != undefined && typeName != "Object" && typeName != "Array") {
        obj[globalTypeName] = 'app' + typeName + 'T';
        obj[globalTypeDecl] = {};
        state.reasonTypes[obj[globalTypeName]] = {};
        /* TODO: give type a body? */
      }
      if (globalTypeName in obj) {
        state.reasonTypes[obj[globalTypeName]] = obj[globalTypeDecl];
        return obj[globalTypeName];
      };
      if (globalIdName in obj && globalIdName == marker) {
        return 'recursiveT';
      };
      obj[globalIdName] = marker;
      if (Array.isArray(obj)) {
        if (obj.length > 0) {
          var t = getType(obj[0], rootNode, marker);
          for (var i = 1; i < obj.length; i++) {
            var t2 = getType(obj[i], rootNode, marker);
            if (t !== t2) {
              /*
              console.log("mixed array", t, t2);
              */
              return 'array(unknownT)';
            }
          }
          return 'array(' + t + ')';
        } else {
          return 'array(unknownT)';
        };
      } else {
        var childTypes = [];
        var propCount = 0;
        var propLimit = 20;
        for (var prop in obj) {
          if (prop == globalIdName) {
            continue;
          };
          if (!prop.match(/^[a-z0-9]+$/i)) {
            continue;
          }
          if ('hasOwnProperty' in obj && obj.hasOwnProperty(prop) && !isFunction(obj[prop])) {
            childTypes.push('"' + prop + '": ' + getType(obj[prop], rootNode, marker));
            propCount++;
            if (propCount > propLimit) {
              break;
            };
          }
        }
        var t = '{. ';
        t += childTypes.join(', ');
        t += '}';
        if (propCount <= propLimit && propCount > 0) {
          var retval = 'smallObject' + state.smallObjectCounter.toString() + 'T';
          state.reasonTypes[retval] = { decl: t };
          state.smallObjectCounter++;
          return retval;
        } else {
          /*
          return 'tooBigObjectT';
          */
          return byUsage('usage', false);
        };
      }
      break;
    default:
      if (obj === undefined) {
        return 'unit';
      };
      if (isFunction(obj)) {
        return byUsage('usageFun', true);
      };
      return 'unknownT';
      break;
  };
};

function getExpression(s) {
  var newNode = esprima.parse(s);
  newNode = newNode.body[0].expression;
  return newNode;
};

function joinParams(node) {
  var reasonmlArgs = [];
  for (var i = 0; i < node.params.length; i++) {
    reasonmlArgs.push(node.params[i].reasonml);
  }
  return reasonmlArgs.join(', ');
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

function getIdParts(code, node) {
  var parts = [];
  var savePart = function(code, parentNode, node) {
    if (node.type == 'Identifier') {
      parts.push(node.name);
    }
  };
  walk(code, null, node, savePart);
  /*if (parts.length > 4) {
    parts = parts.slice(parts.length - 4);
  }*/
  if (parts.length > 1) {
    parts = parts.slice(parts.length - 1);
  }
  return parts;
}

function getExternName(code, node) {
  /*
  var lexpr = getCode(code, node);
  var parts = lexpr.split('.');
  */
  var parts = getIdParts(code, node);
  var cparts = [];
  for (var i = 0; i < parts.length; i++) {
    cparts[i] = capitalizeFirstLetter(parts[i]);
  }
  return cparts.join('');
};

function getExternCallName(code, node) {
  /*
  var lexpr = getCode(code, node);
  var parts = lexpr.split('.');
  */
  var parts = getIdParts(code, node);
  var cparts = [];
  for (var i = 0; i < parts.length; i++) {
    if (i == 0) {
      if (parts[i].charAt(0).toLowerCase() !== parts[i].charAt(0)) {
        /* Lowercase whole word if first letter is not already lowercase */
        cparts[i] = parts[i].toLowerCase();
      } else {
        cparts[i] = parts[i];
      }
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

function getModName(code, node) {
  var modName = null;
  var resolved = null;
  var parts = getCode(code, node).split('.');
  if (parts.length > 1) {
    modName = parts[0];
    if (modName in modMap) {
      resolved = modMap[modName];
    };
  };
  return [parts, modName, resolved];
}

function addExtern(externName, value) {
  var decl = declareExtern(externName, value);
  /*
  console.log("decl", decl);
  */
  if (!value.isNotExtern && externName in state.reasonExterns) {
    var oldDecl = declareExtern(externName, state.reasonExterns[externName]);
    if (decl !== oldDecl) {
      // Disambiguate by argument types
      // console.log("disambiguate", externName);
      externName += value.argTypes.join('').replace(/[.()]/g, '');
    } else {
      /*
      console.log("no disambiguate", externName);
      */
    }
  }
  state.reasonExterns[externName] = value;
  return externName;
}

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
  createId += node.arguments.length.toString();
  if (prefix == '') {
    createId = lowercaseFirstLetter(createId);
  };
  var [parts, modName, modResolved] = getModName(code, node.callee);
  var callName = parts[parts.length - 1];

  var argTypes = [];
  var objArg = '';
  var reargs = joinArgs(node);
  var isNotExtern = false;
  var objArgType = '';
  if (opts.type == 'call') {
    if (node.callee.type == 'MemberExpression') {
      objArgType = node.callee.object[globalTypeName];
      argTypes.push(objArgType);
      objArg = node.callee.object.reasonml;
      /*
      if (reargs != '') {
        objArg = objArg + ', ';
      };
      */
    } else {
      /* Top level call */
      isNotExtern = !(callName in window); 
      createId = callName;
    };
  };
  addArgTypes(node, argTypes);
  var retType = node[globalTypeName];

  var externName = createId;
  var value = {
    isNotExtern: isNotExtern,
    attributes: attributes,
    argTypes: argTypes,
    retType: retType,
    callName: callName
  };
  if (modName !== null && opts.type == 'new') {
    attributes.push('[@bs.module "' + modResolved + '"]');
    if (parts.length > 2) {
      for (var i = 1; i < parts.length - 1; i++) {
        attributes.push('[@bs.scope "' + parts[i] + '"]');
      }
    }
  }
  externName = addExtern(externName, value);
  if (objArg !== '') {
    if (reargs !== '') {
      reargs = '(' + reargs + ')'
    }
    node.reasonml = '(' + objArg + ' |. ' + externName + reargs + ')';
  } else {
    node.reasonml = externName + "(" + objArg + reargs + ")";
  }
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
    /*
    var rmla = [];
    */
    var parentNode = state.astNodeParents[node[globalIndexName]];
    /*
    var mutable = parentNode.type == 'ForStatement' && parentNode.init[globalIndexName] == node[globalIndexName];
    */
    for (var i = 0; i < node.declarations.length; i++) {
      var name = node.declarations[i].id.reasonml;
      var mutable =
        'reasonmlMutable' in node.declarations[i].id &&
        node.declarations[i].id.reasonmlMutable === true;
      var value = null;
      if (node.declarations[i].init != null) {
        value = node.declarations[i].init.reasonml;
      } else {
        value = '/* TODO: Uninitialized var */ 0';
        mutable = true;
      };

      /*
      var s2 = 'let ' + name + ' = ' + name + 'Ref^';
      if (!s2.trim().endsWith(';')) {
        s2 += statementTerminator;
      }
      rmla.push(s2);
      */

      if (mutable) {
        /* name = name + 'Ref'; */
        value = 'ref(' + value + ')';
      }
      var s = 'let ' + name + ' = ' + value;
      if (!s.trim().endsWith(';')) {
        s += statementTerminator;
      }
      rml.push(s);
    }
    node.reasonml = rml.join('\n');
    /*
    node.reasonmlAlias = rmla.join('\n');
    */
    return node;
  },
  Literal: function(code, node) {
    if (node[globalTypeName] == 'string') {
      node.reasonml = '"' + node.value + '"';
    } else if (node.raw === 'null') {
      node.reasonml = 'Js.Nullable.null';
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
    var prefix = '';
    var suffix = '';
    if (node.expression[globalTypeName] !== 'unit' && node.expression[globalTypeName] !== undefined) {
      /*
      console.log(node.expression[globalTypeName]);
      */
      /*
      prefix = 'let _ = ';
      */
      /*
      suffix = '|> ignore';
      */
    };
    /*
    console.log(getCode(code, node), node.expression[globalTypeName]);
    */
    node.reasonml = prefix + node.expression.reasonml + suffix;
    if (!node.reasonml.trim().endsWith(';')) {
      node.reasonml += statementTerminator;
    }
    return node;
  },
  CallExpression: function(code, node) {
    /*
    var funName = 'usageFun' + getExternName(code, node.callee) + 'T';
    var funArg = 'usageFun' + getExternName(code, node.callee) + 'ArgT';
    var funRet = 'usageFun' + getExternName(code, node.callee) + 'RetT';
    // Resolve return type of local functions
    if (funName in state.reasonTypes) {
      var argTypes = []
      addArgTypes(node, argTypes);
      argTypes = '(' + argTypes.join(', ') + ')';
      state.reasonTypes[funName].decl =
        state.reasonTypes[funName]
          .decl
          .replace(funRet, node[globalTypeName])
          .replace(funArg, argTypes);
    }
    */
    if (getCode(code, node).startsWith("console.log")) {
      node.reasonml = 'Js.log(' + joinArgs(node) + ')';
      return node;
    } else {
      return applyExpression({
          type: 'call',
          attributes: ['[@bs.send]']
        },
        code,
        node);
    }
  },
  MemberExpression: function(code, node) {
    var parentNode = state.astNodeParents[node[globalIndexName]];
    var useRight = null;
    var qual = '';
    if (parentNode.type == 'AssignmentExpression' &&
        parentNode.left[globalIndexName] == node[globalIndexName]) {
      qual = 'set';
      var externName = qual + getExternName(code, node);
      var attributes = ['[@bs.set]'];
      var argTypes = [node.object[globalTypeName], parentNode.right[globalTypeName]];
      /*
      var retType = parentNode[globalTypeName];
      */
      var retType = 'unit';
      var callName = node.property.name;
      if (node.computed) {
        attributes = ['[@bs.set_index]'];
        callName = '';
      }
      var value = {
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      externName = addExtern(externName, value);
      node.reasonmlSet = externName;
      node.reasonmlLeft = node.object.reasonml;
      useRight = parentNode.right[globalTypeName];
    }
    var retType = node[globalTypeName];
    if (retType === undefined) {
      if (useRight !== null) {
        retType = useRight;
      } else {
        node.reasonml = '/* Unresolved MemberExpression */';
        return node;
      };
    };
    qual = 'get';
    var [parts, modName, modResolved] = getModName(code, node);
    var externName = qual + getExternName(code, node);
    var attributes = ['[@bs.get]'];
    var callName = node.property.name;
    var argTypes = [node.object[globalTypeName]];
    if (node.computed) {
      attributes = ['[@bs.get_index]'];
      callName = '';
      argTypes.push(node.property[globalTypeName]);
    } else {
      if (modName !== null && modName in modMap) {
        attributes = ['[@bs.val]'];
      } else {
        modName = null;
      }
    }
    var value = {
      attributes: attributes,
      argTypes: argTypes,
      retType: retType,
      callName: callName
    };
    if (modName !== null) {
      value.noargs = true;
      attributes.push('[@bs.module "' + modResolved + '"]');
      if (parts.length > 2) {
        for (var i = 1; i < parts.length - 1; i++) {
          attributes.push('[@bs.scope "' + parts[i] + '"]');
        }
      }
    }
    externName = addExtern(externName, value);
    if (modName !== null) {
      node.reasonml = externName;
    } else {
      /*
      node.reasonml = externName + '(' + node.object.reasonml + ')';
      */
      if (!node.computed) {
        node.reasonml = '(' + node.object.reasonml + ' |. ' + externName + ')';
      } else {
        node.reasonml =
          '(' + node.object.reasonml + ' |. ' + externName + 
          '(' + node.property.reasonml + ')' + ')';
      }
    }
    return node;
  },
  Identifier: function(code, node) {
    if (node.name in globalsMap) {
      var externName = node.name.toLowerCase();
      var attributes = ['[@bs.val]'];
      var argTypes = ['unit'];
      var retType = node[globalTypeName];
      var callName = node.name;
      state.reasonExterns[externName] = {
        noargs: true,
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = externName;
    /*
    } else if (node.name in modMap) {
      var externName = 'mod' + node.name;
      var attributes = ['[@bs.val]', '[@bs.module "' + modMap[node.name] + '"]'];
      var argTypes = ['unit'];
      var retType = node[globalTypeName];
      var callName = node.name;
      state.reasonExterns[externName] = {
        noargs: true,
        attributes: attributes,
        argTypes: argTypes,
        retType: retType,
        callName: callName
      };
      node.reasonml = externName;
    */
    } else {
      var parentNode = state.astNodeParents[node[globalIndexName]];
      var parentNode2 = state.astNodeParents[parentNode[globalIndexName]];
      var mutable =
        parentNode2.type == 'ForStatement' && 
        parentNode2.test[globalIndexName] == parentNode[globalIndexName];
      var name = node.name;
      mutable = mutable || name in state.astMutables;
      node.reasonmlMutable = mutable;
      var deref = '^';
      if ((parentNode.type == 'VariableDeclarator' &&
           parentNode.id[globalIndexName] == node[globalIndexName]) ||
          (parentNode.type == 'AssignmentExpression' && 
           parentNode.left[globalIndexName] == node[globalIndexName]) ||
          parentNode.type == 'UpdateExpression') {
        deref = '';
      }
      /* TODO: optimize with dict */
      if (reserved.includes(name)) {
        name = name + '_';
      }
      if (mutable) {
        node.reasonml = name + 'Ref' + deref;
      } else {
        node.reasonml = name;
      }
    };
    return node;
  },
  AssignmentExpression: function(code, node) {
    var op = node.operator;
    if (node.left.reasonmlSet !== undefined) {
      /* Property */
      if (op == '=') {
        node.reasonml = node.left.reasonmlSet + '(' + node.left.reasonmlLeft + ", " + node.right.reasonml + ')';
      } else {
        /* *= /= += -= */
        var op2 = op[0];
        if (node.right[globalTypeName] == 'float') {
            op2 += '.';
        }
        var paddedOp = ' ' + op2 + ' ';
        node.reasonml =
          node.left.reasonmlSet +
          '(' + node.left.reasonmlLeft + ", " + 
          '(' + node.left.reasonml + paddedOp + node.right.reasonml + '))';
      }
    } else {
      /* Plain assignment */
      if (op == '=') {
        var mutable = 'reasonmlMutable' in node.left && node.left.reasonmlMutable;
        if (mutable) {
          node.reasonml = node.left.reasonml + ' := ' + node.right.reasonml;
        } else {
          node.reasonml = 'let ' + node.left.reasonml + ' = ' + node.right.reasonml;
        }
      } else {
        /* *= /= += -= */
        var op2 = op[0];
        if (node.right[globalTypeName] == 'float') {
            op2 += '.';
        }
        var paddedOp = ' ' + op2 + ' ';
        node.reasonml =
          node.left.reasonml + ' := ' +
          node.left.reasonml + '^' + paddedOp + '(' + node.right.reasonml + ')';
      }
    }
    return node;
  },
  BinaryExpression: function(code, node) {
    var operator = node.operator;
    if (operator == '%') {
      operator = 'mod';
    }
    var left = node.left.reasonml;
    var right = node.right.reasonml;
    if (node[globalTypeName] === 'float' ||
        node.left[globalTypeName] === 'float' ||
        node.right[globalTypeName] === 'float') {
      operator = operator + '.';
      if (node.left[globalTypeName] == 'int') {
        left = 'float_of_int(' + left + ')';
      }
      if (node.right[globalTypeName] == 'int') {
        right = 'float_of_int(' + right + ')';
      }
    } else if (node[globalTypeName] == 'string' && operator == '+') {
      operator = '++';
      if (node.left[globalTypeName] == 'int') {
        left = 'string_of_int(' + left + ')';
      }
      if (node.right[globalTypeName] == 'int') {
        right = 'string_of_int(' + right + ')';
      }
      if (node.left[globalTypeName] == 'float') {
        left = 'string_of_float(' + left + ')';
      }
      if (node.right[globalTypeName] == 'float') {
        right = 'string_of_float(' + right + ')';
      }
    }
    node.reasonml = '(' + left + ' ' + operator + ' ' + right + ')';
    return node;
  },
  FunctionDeclaration: function(code, node) {
    node.reasonml =
      'let ' + node.id.reasonml + 
      ' = (' + joinParams(node) + ') => ' +
      node.body.reasonml + statementTerminator;
    return node;
  },
  FunctionExpression: function(code, node) {
    node.reasonml = '(' + joinParams(node) + ') => ' + node.body.reasonml;
    return node;
  },
  BlockStatement: function(code, node) {
    var rml = [];
    for (var i = 0; i < node.body.length; i++) {
      var child = node.body[i];
      rml.push(child.reasonml);
    }
    node.reasonml = '{\n' + rml.join('\n') + '\n' + '}\n';
    return node;
  },
  ReturnStatement: function(code, node) {
    node.reasonml = node.argument.reasonml;
    return node;
  },
  Property: function(code, node) {
    node.reasonml = "/* Shouldn't show. Processed by ObjectExpression */";
    return node;
  },
  VariableDeclarator: function(code, node) {
    node.reasonml = "/* Shouldn't show. Processed by VariableDeclaration */";
    return node;
  },
  Line: function(code, node) {
    node.reasonml = "/* Shouldn't show. Comments processed elsewhere.*/";
    return node;
  },
  Block: function(code, node) {
    node.reasonml = "/* Shouldn't show. Comments processed elsewhere.*/";
    return node;
  },
  UpdateExpression: function(code, node) {
    if (node.prefix == true) {
      throw(new Error('prefix operator not implemented'));
    }
    if (node.operator == '++') {
      node.reasonml = '' + node.argument.reasonml + ' := ' + node.argument.reasonml + '^ + 1';
    } else if (node.operator == '--') {
      node.reasonml = '' + node.argument.reasonml + ' := ' + node.argument.reasonml + '^ - 1';
    } else {
      throw(new Error('suffix operator not implemented: ' + node.operator));
    }
    return node;
  },
  ForStatement: function(code, node) {
    node.reasonml = 
      node.init.reasonml +
      'while (' + node.test.reasonml + ') {\n' +
        /*
      node.init.reasonmlAlias +
      */
      node.body.reasonml + statementTerminator +
      node.update.reasonml + statementTerminator +
      '}' + statementTerminator;
    return node;
  },
  ArrayExpression: function(code, node) {
    var args = [];
    for (var i = 0; i < node.elements.length; i++) {
      args.push(node.elements[i].reasonml);
    }
    node.reasonml = '[| ' + args.join(', ') + ' |]';
    return node;
  },
  ConditionalExpression: function(code, node) {
    var first = node.test.reasonml;
    var second = node.consequent.reasonml;
    var third = node.alternate.reasonml;
    if (node.consequent[globalTypeName] != node.alternate[globalTypeName]) {
      if (node.consequent[globalTypeName] == 'string' && node.alternate[globalTypeName] == 'int') {
        third = 'string_of_int(' + third + ')';
      }
    }
    node.reasonml = 'if (' + first + ') {' + second + '} else {' + third + '}';
    return node;
  },
  UnaryExpression: function(code, node) {
    if (node.prefix != true) {
      throw(new Error('suffix unary operator not implemented'));
    }
    if (node.operator == '+') {
      node.reasonml = '(+ ' + node.argument.reasonml + ')';
    } else if (node.operator == '-') {
      node.reasonml = '(- ' + node.argument.reasonml + ')';
    } else {
      throw(new Error('prefix unary operator not implemented: ' + node.operator));
    }
    return node;
  },
  BogusTemplate: function(code, node) {
    node.reasonml = '';
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
  var retval = node;
  if (node.type in processNodes) {
    var process = processNodes[node.type];
    retval = process(code, node);
  } else {
    throw(new Error('unimplemented node type: ' + node.type + ', parent: ' + parentNode.type));
  };
  if ('leadingComments' in retval) {
    var comment = []
    for (var i = 0; i < retval.leadingComments.length; i++) {
      comment.push(retval.leadingComments[i].value);
    }
    comment = comment.join('\n');
    retval.reasonml = '/*' + comment + ' */' + '\n' + retval.reasonml;
  }
  return retval;
};

function U(index, arg) {
  var node = state.astNodes[index];
  if (node.type == 'AssignmentExpression' && node.left.type == 'Identifier') {
    state.astMutables[node.left.name] = true;
  }
  if (node.type == 'UpdateExpression' && node.argument.type == 'Identifier') {
    state.astMutables[node.argument.name] = true;
  }
  node[globalTypeName] = getType(arg, node);
  state.astNodeObjects[index] = arg;
  state.astNodesDebug[index] = arg;
  return arg;
};

function F(index, args, f) {
  var retval = f();
  var node = state.astNodes[index];
  var parentNode = state.astNodeParents[node[globalIndexName]];
  var parameters = parentNode.params;
  var argTypes = [];
  for (var i = 0; i < args.length; i++) {
    var param = parameters[i];
    if (param === undefined) {
      continue;
      /*
      param = parentNode;
      */
    }
    argTypes.push(getType(args[i], param));
  }
  var retType = getType(retval, parentNode);
  var argTypesStr = '(' + argTypes.join(', ') + ')';
  if (argTypes.length == 0) {
    argTypesStr = 'unit';
  }
  var funType = argTypesStr + ' => ' + retType;
  if (parentNode.id != null) {
    /* Named function */
    var funTypeName = 'usageFun' + capitalizeFirstLetter(parentNode.id.name) + 'T';
    /*
    console.log(funTypeName, funType);
    */
    if (!(funTypeName in state.reasonTypes)) {
      state.reasonTypes[funTypeName] = {};
    }
    state.reasonTypes[funTypeName].decl = funType;
  } else {
    /* Anonymous function */
    // Update all AST node types which have an object reference to the function
    var parentIndex = parentNode[globalIndexName];
    /* TODO: optimize */
    for (var i = 0; i < state.astNodeObjects.length; i++) {
      if (i != parentIndex && state.astNodeObjects[i] === state.astNodeObjects[parentIndex]) {
        var node = state.astNodes[i];
        if (node.type == 'Identifier') {
          var funTypeName = 'usageFun' + capitalizeFirstLetter(node.name) + 'T';
          if (!(funTypeName in state.reasonTypes)) {
            state.reasonTypes[funTypeName] = {};
          }
          state.reasonTypes[funTypeName].decl = funType;
        }
      }
    }
  }
  parentNode[globalTypeName] = funType;
  /*
  console.log(parentNode[globalTypeName]);
  */
  return retval;
};

function getNodePath(node, f) {
  var path = [];
  while (state.astNodeParents[node[globalIndexName]] != null) {
    path.push(node);
    node = state.astNodeParents[node[globalIndexName]];
  }
  path.push(node);
  return path.reverse();
}

function checkNodePath(node, f) {
  while (state.astNodeParents[node[globalIndexName]] != null) {
    if (f(node)) {
      return true;
    };
    node = state.astNodeParents[node[globalIndexName]];
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
    /* 'AssignmentExpression': {}, */
    'Program': {},
    'Property': {},
    'Line': {},
    'Block': {},
    'BlockStatement': {},
    'ReturnStatement': {},
    'ForStatement': {}
  };
  var checkIt = function(ignores, propName) {
    var f = function(node) {
      return node.type in ignores;
    };
    var g = function(node) {
      var parentNode = state.astNodeParents[node[globalIndexName]];
      if (parentNode != null) {
        if (propName in parentNode && parentNode[propName] !== null) {
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
  var checkNodeParent = function(node, parentType, prop, extraCheck) {
    if (extraCheck === undefined) {
      extraCheck = function() { return true; };
    }
    var parentNode = state.astNodeParents[node[globalIndexName]];
    if (parentNode != null && extraCheck(parentNode)) {
      if (parentNode.type == parentType) {
        if (prop in parentNode) {
          if (parentNode[prop][globalIndexName] === node[globalIndexName]) {
            return true;
          }
          if (Array.isArray(parentNode[prop])) {
            for (var i = 0; i < parentNode[prop].length; i++) {
              var pNode = parentNode[prop][i];
              if (node[globalIndexName] === pNode[globalIndexName]) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };
  var checkNodeParentAssign = function(node) {
    return checkNodeParent(node, 'AssignmentExpression', 'left');
  };
  var checkNodeParentMemberProperty = function(node) {
    return checkNodeParent(node, 'MemberExpression', 'property', function(node) {
      return !node.computed;
    });
  };
  var checkNodeParentCallCallee = function(node) {
    return checkNodeParent(node, 'CallExpression', 'callee');
  };
  var checkNodeParentFunctionId = function(node) {
    return checkNodeParent(node, 'FunctionDeclaration', 'id');
  };
  var checkNodeParentFunctionArguments = function(node) {
    var a = checkNodeParent(node, 'FunctionDeclaration', 'params');
    var b = checkNodeParent(node, 'FunctionExpression', 'params');
    return a || b;
  };
  var checkNodeParentUpdate = function(node) {
    return checkNodeParent(node, 'UpdateExpression', 'argument');
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
    !checkNodeParentFunctionId(node),
    !checkNodeParentFunctionArguments(node),
    !checkNodeParentUpdate(node));
    */
  if (!(node.type in directIgnores) &&
      !isVarDecl &&
      !isObjKey &&
      !isFunDecl &&
      !isNewCallee &&
      !isAssign &&
      !checkNodeParentMemberProperty(node) &&
      !checkNodeParentCallCallee(node) &&
      !checkNodeParentFunctionId(node) &&
      !checkNodeParentFunctionArguments(node) &&
      !checkNodeParentUpdate(node)) {
    var expr = 'U(' + node[globalIndexName] + ', arg)';
    var newNode = getExpression(expr);
    newNode.arguments[1] = node;
    newNode.isU = true;
    return newNode;
  }
  var checkNodeParentFunctionDeclBody = function(node) {
    var a = checkNodeParent(node, 'FunctionDeclaration', 'body');
    return a;
  };
  var checkNodeParentFunctionExprBody = function(node) {
    var b = checkNodeParent(node, 'FunctionExpression', 'body');
    return b;
  };
  var isFunBody = checkNodeParentFunctionDeclBody(node);
  var isFunExprBody = checkNodeParentFunctionExprBody(node);
  if (isFunBody || isFunExprBody) {
    var expr = '() => { return F(' + node[globalIndexName] + ', arguments, function() {}); }';
    console.log(expr);
    var newNode = esprima.parse(expr).body[0].expression.body;
    newNode.isU = true;
    console.log(newNode);
    newNode.body[0].argument.arguments[2].body = node;
    return newNode;
  };
  return node;
};

function postProcessTypesAdd(code, parentNode, node) {
  node[globalIndexName] = state.astNodes.length;
  state.astNodes.push(node);
  state.astNodeParents[node[globalIndexName]] = parentNode;
  return node;
};

function walk(code, parentNode, node, postProcess) {
  if (node !== null && node !== undefined && node.hasOwnProperty('type')) {
    var newNode = {};
    for (var prop in node) {
      var value = node[prop];
      var newValue;
      if (node.type == "Program" && prop == 'tokens') {
        /* Don't process the raw tokens, only AST */
        newValue = value;
      } else if (Array.isArray(value)) {
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
  }
  return node;
};

function rewrite(code, ast, postProcess) {
  return walk(code, null, ast, postProcess);
};

function declareTypes(body, externs, firstGenTypes) {
  var types = [];
  /*
   * Fake topological sort :p
   * Pass 0: types without declaration
   * Pass 1: types with declaration, but no functions
   * Pass 2: types with declaration, only functions
   * TODO: Real topological sort.
   * */
  for (var pass = 0; pass < 3; pass++) {
    for (var name in state.reasonTypes) {
      var value = state.reasonTypes[name];
      if ('decl' in value) {
        var isFunction = value.decl.includes('=>');
        if (!isFunction) {
          if (pass != 1) {
            continue;
          }
        } else {
          if (pass != 2) {
            continue;
          }
        }
        value = value.decl;
      } else {
        if (pass != 0) {
          continue;
        }
        value = '';
      };
      var s;
      if (value != '') {
        s = 'type ' + name + ' = ' + value + ';';
      } else {
        s = 'type ' + name + ';';
      }
      /* Only list types that are used */
      if (body.includes(name) || externs.includes(name) || firstGenTypes.includes(name)) {
        types.push(s);
      } else {
        // types.push('/* /* Unused type: */ ' + s + ' */');
      };
    };
  }
  return types;
};

function declareExtern(name, value) {
  if ('isNotExtern' in value && value.isNotExtern) {
    return null;
  };
  var noargs = 'noargs' in value;
  var retType = value.retType;
  var typesig;
  if (noargs) {
    typesig = retType;
  } else {
    if (value.argTypes.length == 0) {
      typesig = 'unit => ' + retType;
    } else {
      typesig = '(' + value.argTypes.join(', ') + ') => ' + retType;
    }
  };
  var callName = value.callName;
  var s =
    value.attributes.join(' ') +
    ' external ' +
    name +
    ' : ' +
    typesig +
    ' = "' + callName + '";';
  return s;
}

function declareExterns() {
  var externs = [];
  for (var name in state.reasonExterns) {
    var value = state.reasonExterns[name];
    var s = declareExtern(name, value);
    if (s != null) {
      externs.push(s);
    }
  }
  return externs;
}

function compileAST(data) {
  var syntax =
    esprima.parse(
      data,
      { raw: true, tokens: true, range: true, comment: true });

  syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);
  
  state = initState(data);

  var nodePaths = [];

  function postProcessAST(code, path, value, node) {
    nodePaths.push(path.join('/') + ' = ' + value);
  };

  function walk(code, path, name, node, postProcess) {
    path.push(name);
    if (node !== null && node !== undefined && typeof(node) == 'object') {
      var newNode = {};
      for (var prop in node) {
        var value = node[prop];
        var newValue;
        if (Array.isArray(value)) {
          newValue = [];
          for (var i = 0; i < value.length; i++) {
            var name = prop + '[' + i + ']';
            newValue.push(walk(code, path, name, value[i], postProcess));
          }
        } else {
          var name = prop;
          newValue = walk(code, path, name, value, postProcess);
        }
        newNode[prop] = newValue;
      }
    } else {
      var value = JSON.stringify(node);
      postProcess(code, path, value, newNode);
    }
    path.pop();
  };

  syntax.tokens = [];

  walk(data, [], '', syntax, postProcessAST);

  var s = nodePaths.join('\n');
  return s;
}

function compile(data) {
  var syntax =
    esprima.parse(
      data,
      { raw: true, tokens: true, range: true, comment: true });

  syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens);

  console.log(syntax);

  /*
  console.log(JSON.stringify(syntax, null, 2));
   */
  state = initState(data);

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

  eval(code);

  var promise = new Promise((resolve, reject) => {
    var afterEval = function() {
      var syntaxReasonML = rewrite(data, syntax2, postProcess);
      
      var decl = declareExterns().join('\n');

      var types = declareTypes(syntaxReasonML.reasonml, decl, '');
      
      /* TODO: do recursive lookup of types instead of just 2 steps */
      var types2 = declareTypes(syntaxReasonML.reasonml, decl, types.join('\n'));

      var header = types2.join('\n') + '\n' + decl;

      var body = syntaxReasonML.reasonml;

      var program = header + '\n' + body;

      /*
      console.log(program);
      */
      resolve(program);
    };
    setTimeout(afterEval, evalTimeout);
  });

  return promise;
};

$('document').ready(function() {
  /* Load CodeMirror CSS */
  /*
  $('head').append( $('<link rel="stylesheet" type="text/css" />').attr('href',
        'css/codemirror.css'));
        */
  var onLoad = function(data) {
    $('body').append('<h2>Introduction</h2>');
    $('body').append('<p>Welcome to my very hacky JavaScript to ReasonML transpiler ' +
        '(<a href="https://github.com/emnh/js-to-reasonml-transpiler">Project on GitHub</a>)! ' +
        'If you do not see any code below, try reloading the page ' +
        '(bug due to race conditions resolved by cached files I suppose).' +
        'You might also check out the alternative <a href="https://github.com/chenglou/jeason">Jeason</a>. ' +
        'Paste your code in the <a href="#exampleCode">Code to Transpile</a> ' +
        'and the script will try to convert it into ReasonML externs and code. ' +
        'WARNING: Example code will be evaled in a rewritten form to fill in the types. ' +
        'Untriggered event handlers and functions will not be translated. ' +
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
      '<div>' + 
      '<input id="loadlibs" type="button" value="Load Library"></input>' +
      '<input id="transpile" type="button" value="Transpile"></input>' +
      '<input id="getAst" type="button" value="Get AST"></input>' +
      '</div>');
    
    $('body').append('<textarea id="result" cols=80 rows=100></textarea>');
    var resultarea = $("#result");
    var editor3 = CodeMirror.fromTextArea(resultarea[0], {
      lineNumbers: true,
      mode: 'mllike'
    });

    $("#loadlibs").on("click", function() {
      eval(editor2.getDoc().getValue());
    });
    var transpile = async function() {
      var result;
      editor3.getDoc().setValue("Waiting for eval to load resources etc: " + evalTimeout + "ms...");
      try {
        result = await compile(editor.getDoc().getValue());
      } catch(error) {
        result = error.stack.toString();
        editor3.getDoc().setValue(result);
        throw(error);
      }
      editor3.getDoc().setValue(result);
    };
    var getAST = function() {
      var result;
      try {
        result = compileAST(editor.getDoc().getValue());
      } catch(error) {
        result = error.stack.toString();
        editor3.getDoc().setValue(result);
        throw(error);
      }
      editor3.getDoc().setValue(result);
    };
    $("#transpile").on("click", transpile);
    $("#getAst").on("click", getAST);

    $('body').append('<h2>Eval DOM Output</h2>');

    if (/HeadlessChrome/.test(window.navigator.userAgent)) {
      console.log("Chrome headless detected. Expecting transpile to be called manually.");
    } else {
      transpile();
    }
  };
  /*
    $.get(scriptSource, onLoad, "text");
  */
  onLoad(scriptData);
});

window.compile = compile;
window.esprima = esprima;
