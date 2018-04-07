/* PIXI required only for convenience of fast dev iter on example */

import css from '../css/codemirror.css';

/*
import scriptData from './example.txt';
*/

import scriptData from '../examples/pixiBasicsMega.txt';

var evalTimeout = 10000;

var PIXI = require('pixi.js');

var CodeMirror = require('codemirror');

var $ = require('jquery');

require('codemirror/mode/javascript/javascript');

require('codemirror/mode/mllike/mllike');

var Lib = require('./lib.js');

Lib.debug[0] = true;

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
        '<p>Make sure your example code does not clear the DOM, or you will lose the output boxes.</p>' +
        '<p>While you are transpiling there will be a red border around ' +
        ' code with unresolved types in the editor.</p>'
        );

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
        result = await Lib.compile(editor.getDoc().getValue(), evalTimeout);
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
        result = Lib.compileAST(editor.getDoc().getValue());
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

    var storedUnresolvedNodes = {};
    var updateUI = function() {
      var root = editor.getWrapperElement();
      var text = '';
      var charmap = [];
      for (var i = 0; i < scriptData.length; i++) {
        charmap[i] = false;
      }
      for (var index in storedUnresolvedNodes) {
        var astNode = storedUnresolvedNodes[index];
        /*
        console.log(astNode.range[0], astNode.range[1]);
        */
        for (var i = astNode.range[0]; i < astNode.range[1]; i++) {
          charmap[i] = true;
        }
      }
      var unresolvedCode = '';
      for (var i = 0; i < charmap.length; i++) {
        if (charmap[i] == true) {
          unresolvedCode += scriptData[i];
        };
      }
      /*
      console.log(unresolvedCode);
      */
      var markNodes = [];
      var removeZeroWidth = function(s) {
        return s.replace(/[\u200B-\u200D\uFEFF]/g, '');
      };
      var walk = function(index, node, parentUnresolved) {
        var oldLength = text.length;
        var isUnresolved = [true];
        $(node)
          .contents()
          .each(function(i, v) {
            if ($(v).parent().is("span") && v.nodeType === 3) {
              /*
              text += $(v).text();
              */
              /*
              var str = v.nodeValue.trim();
              */
              var str = removeZeroWidth(v.nodeValue);
              /*
              text += str;
              */
              if (str.length > 0) {
                text += str;
                /*
                if (!editor.getDoc().getValue().startsWith(text)) {
                  console.log("text", text, "str", str.length, JSON.stringify(str));
                  throw new Error("length mismatch");
                }
                */
              }
            } else {
              if (!$(v).is(".CodeMirror-linenumber")) {
                walk(i, v, isUnresolved);
              }
            }
            if ($(v).is(".CodeMirror-line")) {
              text += '\n';
            }
          });
        var content = removeZeroWidth($(node).text()).trim() === '';
        if (oldLength === text.length || content === '' || text.length >= charmap.length) {
          isUnresolved[0] = false;
        } else {
        }
        for (var i = oldLength; i < text.length; i++) {
          if (charmap[i] == false) {
            isUnresolved[0] = false;
            break;
          }
        }
        markNodes.push(function() {
          if (!parentUnresolved[0] && isUnresolved[0]) {
            $(node).addClass("marked");
          } else {
            $(node).removeClass("marked");
          }
        });
        /*
        $(node).children().each(walk);
        */
      };
      walk(0, $(root).find(".CodeMirror-code"), [false]);
      for (var f of markNodes) {
        f();
      }
      /*
      console.log(text.length, scriptData.length, text.length - scriptData.length);
      */
    };
    updateUI();
    setInterval(updateUI, 1000);

    /*
    console.log(editor.display.renderedView[0].measure.map);
    */

    Lib.registerShowTypesCallback(function(unresolvedNodes) {
      storedUnresolvedNodes = unresolvedNodes;
      /*
      for (var index in unresolvedNodes) {
        var node = unresolvedNodes[node];
      }
      */
    });

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

window.compile = Lib.compile;
