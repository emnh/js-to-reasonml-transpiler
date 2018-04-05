/* PIXI required only for convenience of fast dev iter on example */

import css from '../css/codemirror.css';

import scriptData from './example.txt';

var evalTimeout = 2000;

var PIXI = require('pixi.js');

var CodeMirror = require('codemirror');

var $ = require('jquery');

require('codemirror/mode/javascript/javascript');

require('codemirror/mode/mllike/mllike');

var Lib = require('./lib.js');

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
