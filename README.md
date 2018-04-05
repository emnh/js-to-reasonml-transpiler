# JavaScript to ReasonML Transpiler

Check it out [Live on GitHub
Pages](https://emnh.github.io/js-to-reasonml-transpiler).

Just started on this. Will be a helper script to port small examples from JS to
ReasonML. Don't expect too much. Should be mainly for generating a baseline for
externs, unless it grows to something bigger :p . Requires to actually run the
code because it will inspect the types for declaration at runtime. It only
supports browser so far, not node.

I am using :
 - Esprima (reading js)
 - Escodegen (writing js)

# Manual labour

This section lists workarounds for transpilations not implemented yet.

 - Reorder functions so that they are called after they are declared
 - Call event handlers manually at least once, after they've been passed around
   to event registers. Alternatively, set a high grace period (see below) and
   trigger events manually in browser.
 - There is a 2 second grace period to allow for resource load and timer
   updates etc when evaluating example code. Adjust period in index.js if
   needed. TODO: create option for this on web page.

# Alternatives

 - [Jeason](https://github.com/chenglou/jeason) is another approach using Flow.
   Probably a more complete project, but not as convenient to copy paste and
   run quick examples in browser.
 - [ReasonablyTyped](https://github.com/rrdelaney/ReasonablyTyped) I tried this
   a while ago to convert WebGL2 bindings (and three.js if I remember
   correctly) but I couldn't get it to work. Well, seems like it's a work in
   progress with last commit 4 days ago per 03.04.2018.
