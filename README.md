# JavaScript to ReasonML Transpiler

Check it out [Live on GitHub
Pages](https://emnh.github.io/js-to-reasonml-transpiler).

This is a helper script to port small examples from JS to ReasonML. It should
be mainly for generating a baseline for externals, unless it grows to something
bigger :p . Requires to actually run the code with eval because it will inspect
the types for declaration at runtime.

Why eval and not flow? I tried flow and it wasn't able to infer much, while
evaling the code gets all types without much effort. Conditional code paths may
present complications though, so try to avoid them in example code. See "Manual
labour" for more information.

I am using :
 - Esprima (reading js)
 - Escodegen (writing js)

# Manual labour

This section lists workarounds for transpilations not implemented yet.

 - All branches of if statements are evaluated to get the types. If you have if
   statements in your code, think about the implications of that (infinite
   loops and other problems etc). TODO: Only execute all branches once.
 - Initialize all (non-int) variables. Default value is set to 0 if not
   initialized and a TODO comment is added.
 - Reorder functions so that they are called after they are declared.
 - Tweak integer values that should be floats, e.g. write 0.5 + 0.5 instead of
   1 if you want the value to be considered float.
 - Call event handlers manually at least once, after they've been passed around
   to event registers. Alternatively, set a high grace period (see below) and
   trigger events manually in browser.
 - There is a 2 second grace period to allow for resource load and timer
   updates etc when evaluating example code. Adjust period in index.js if
   needed. TODO: create option for this on web page.

After transpile:
 - Reorder type definitions if necessary. There is a TODO issue on sorting them
   topologically.
 - Add |> ignore or let _ = to avoid warnings. I don't do it automatically
   because it will be hard to detect when it's necessary and too many of them
   clutters the code.

# Testing examples

## Node example

Node support is basic so far, but an example can be found in
src/example-node.txt.

To run the example:

```bash
npm run webpack # to compile dist/node.js
node dist/node.js # will transpile src/example-node.txt to src/TestNode.re
npm start # to compile src/TestNode.re
node src/TestNode.bs.js
```

## Browser examples

```bash
node src/puppet.js examples/pixiBasics/example_001.js >| src/Test.re
npm start
```

### Caveats
 - Example 4. Need to add a |> ignore at end of function.
 - Example 9. Need to add a |> ignore at end of function.

Go to http://localhost:8080/test .

## Running tests


```bash
# First of all, replace the path to the compiler
sed -i s@bs-platform/bin/bsb.exe@bs-platform/lib/bsb.exe@ node_modules/bsb-js/index.js
# compile tests script
npm run webpack
# run tests script
node ./dist/runtests.js
```

# Alternatives

 - [Jeason](https://github.com/chenglou/jeason) is another approach using Flow.
   Differences to my project are that flow cannot really infer many types at
   all without annotations. The code Jeason generates is also full of dynamic
   lookups, not using typed getters and setters as my project does. Also it is
   not as convenient to copy paste and quickly transpile live examples in
   browser.
 - [ReasonablyTyped](https://github.com/rrdelaney/ReasonablyTyped) I tried this
   a while ago to convert WebGL2 bindings (and three.js if I remember
   correctly) but I couldn't get it to work. Well, seems like it's a work in
   progress with last commit 4 days ago per 03.04.2018.
