var ast = esprima.parse("var answer = 42");

var script = document.getElementById("example");

var scriptSource = script.src;

console.log(scriptSource);

$.get(scriptSource, function(data) {
	var syntax = window.esprima.parse(data, { raw: true, tokens: true, range: true, comment: true });
	syntax = window.escodegen.attachComments(syntax, syntax.comments, syntax.tokens);
	var code = window.escodegen.generate(syntax, option);

	console.log(code);
}, "text");

