# JavaScript to ReasonML Transpiler

Check it out [Live on GitHub
Pages](https://emnh.github.io/js-to-reasonml-transpiler).

## Table of contents

- [Introduction](#introduction)
- [Example transpilation](#example-transpilation)
- [Manual labour](#manual-labour)
- [Testing examples](#testing-examples)
- [Running tests](#running-tests)
- [Alternatives](#alternatives)

# Introduction

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

# Example transpilation

## Input

```javascript
var app = new PIXI.Application(800, 600, { backgroundColor: 0x1099bb });
/*
console.log(app.constructor.name);
*/
document.body.appendChild(app.view);

// Scale mode for all textures, will retain pixelation
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

var sprite = PIXI.Sprite.fromImage('http://pixijs.io/examples/required/assets/basics/bunny.png');

// Set the initial position
sprite.anchor.set(0.5);
sprite.x = app.screen.width / 2;
sprite.y = app.screen.height / 2;

// Opt-in to interactivity
sprite.interactive = true;

// Shows hand cursor
sprite.buttonMode = true;

/* PS: Functions are not automatically lifted and must be in order for
 * generated script to use them correctly. */
function onClick(evt) {
  /* PS: Make sure your event handlers are called at least once by script */
  console.log(evt);
  sprite.scale.x *= 1.25;
  sprite.scale.y *= 1.25;
  return 0;
}

// Pointers normalize touch and mouse
sprite.on('pointerdown', onClick);

/* PS: Make sure your event handlers are called at least once by script, and
 * done after function passed around, like in the following line: */
onClick(new Event('test'));

// Alternatively, use the mouse & touch events:
// sprite.on('click', onClick); // mouse-only
// sprite.on('tap', onClick); // touch-only

app.stage.addChild(sprite);

if (true) {
  console.log("hello");
} else {
  console.log("blah");
}

var x = 3;

x *= 2;
```

## Output

ReasonML syntax.

```ocaml
type appApplicationT;

type appHTMLDocumentT;

type appHTMLBodyElementT;

type appHTMLCanvasElementT;

type usageFunSpriteT;

type appSpriteT;

type appObservablePointT;

type appRectangleT;

type appEventT;

type appMemoryInfoT;

type appContainerT;

type smallObject0T = {. "backgroundColor": int};

type smallObject21T = {. "RESOLUTION": int};

type smallObject42T = {
  .
  "LINEAR": int,
  "NEAREST": int
};

type smallObject65T = {. "memory": appMemoryInfoT};

type usageFunOnClickT = appEventT => int;

[@bs.new] [@bs.module "pixi.js"]
external newApplication3 : (int, int, smallObject0T) => appApplicationT =
  "Application";

[@bs.val] external document : appHTMLDocumentT = "document";

[@bs.get] external getBody : appHTMLDocumentT => appHTMLBodyElementT = "body";

[@bs.get] external getView : appApplicationT => appHTMLCanvasElementT = "view";

[@bs.send]
external appendChild1 :
  (appHTMLBodyElementT, appHTMLCanvasElementT) => appHTMLCanvasElementT =
  "appendChild";

[@bs.val] [@bs.module "pixi.js"]
external getSettings : smallObject21T = "settings";

[@bs.set]
external setSCALE_MODE : (smallObject21T, int) => unit = "SCALE_MODE";

[@bs.val] [@bs.module "pixi.js"] [@bs.scope "settings"]
external getSCALE_MODE : int = "SCALE_MODE";

[@bs.val] [@bs.module "pixi.js"]
external getSCALE_MODES : smallObject42T = "SCALE_MODES";

[@bs.val] [@bs.module "pixi.js"] [@bs.scope "SCALE_MODES"]
external getNEAREST : int = "NEAREST";

[@bs.val] [@bs.module "pixi.js"]
external getSprite : usageFunSpriteT = "Sprite";

[@bs.val] [@bs.module "pixi.js"] [@bs.scope "Sprite"]
external fromImage1 : string => appSpriteT = "fromImage";

[@bs.get] external getAnchor : appSpriteT => appObservablePointT = "anchor";

[@bs.send] external set1 : (appObservablePointT, float) => unit = "set";

[@bs.set] external setX : (appSpriteT, int) => unit = "x";

[@bs.get] external getX : appSpriteT => int = "x";

[@bs.get] external getScreen : appApplicationT => appRectangleT = "screen";

[@bs.get] external getWidth : appRectangleT => int = "width";

[@bs.set] external setY : (appSpriteT, int) => unit = "y";

[@bs.get] external getY : appSpriteT => int = "y";

[@bs.get] external getHeight : appRectangleT => int = "height";

[@bs.set]
external setInteractive : (appSpriteT, Js.boolean) => unit = "interactive";

[@bs.get] external getInteractive : appSpriteT => Js.boolean = "interactive";

[@bs.set]
external setButtonMode : (appSpriteT, Js.boolean) => unit = "buttonMode";

[@bs.get] external getButtonMode : appSpriteT => Js.boolean = "buttonMode";

[@bs.val] external console : smallObject65T = "console";

[@bs.get] external getScale : appSpriteT => appObservablePointT = "scale";

[@bs.set]
external setXappObservablePointTfloat : (appObservablePointT, float) => unit =
  "x";

[@bs.get]
external getXappObservablePointT : appObservablePointT => float = "x";

[@bs.set]
external setYappObservablePointTfloat : (appObservablePointT, float) => unit =
  "y";

[@bs.get]
external getYappObservablePointT : appObservablePointT => float = "y";

[@bs.send]
external on2 : (appSpriteT, string, usageFunOnClickT) => appSpriteT = "on";

[@bs.new] external newEvent1 : string => appEventT = "Event";

[@bs.get] external getStage : appApplicationT => appContainerT = "stage";

[@bs.send]
external addChild1 : (appContainerT, appSpriteT) => appSpriteT = "addChild";

let app = newApplication3(800, 600, {"backgroundColor": 0x1099bb});

/*
 console.log(app.constructor.name);
  */
document |. getBody |. appendChild1(app |. getView);

/* Scale mode for all textures, will retain pixelation */
setSCALE_MODE(getSettings, getNEAREST);

let sprite =
  fromImage1("http://pixijs.io/examples/required/assets/basics/bunny.png");

/* Set the initial position */
sprite |. getAnchor |. set1(0.5);

setX(sprite, (app |. getScreen |. getWidth) / 2);

setY(sprite, (app |. getScreen |. getHeight) / 2);

/* Opt-in to interactivity */
setInteractive(sprite, Js.true_);

/* Shows hand cursor */
setButtonMode(sprite, Js.true_);

/* PS: Functions are not automatically lifted and must be in order for
 * generated script to use them correctly.  */
let onClick = evt => {
  /* PS: Make sure your event handlers are called at least once by script  */
  Js.log(evt);
  setXappObservablePointTfloat(
    sprite |. getScale,
    (sprite |. getScale |. getXappObservablePointT) *. 1.25
  );
  setYappObservablePointTfloat(
    sprite |. getScale,
    (sprite |. getScale |. getYappObservablePointT) *. 1.25
  );
  0;
};

/* Pointers normalize touch and mouse */
sprite |. on2("pointerdown", onClick);

/* PS: Make sure your event handlers are called at least once by script, and
 * done after function passed around, like in the following line:  */
onClick(newEvent1("test"));

/* Alternatively, use the mouse & touch events:
   sprite.on('click', onClick); // mouse-only
   sprite.on('tap', onClick); // touch-only */
app |. getStage |. addChild1(sprite);

if (Js.to_bool(Js.true_)) {
  Js.log("hello");
} else {
  Js.log("blah");
};

let xRef = ref(3);

xRef := xRef^ * 2;
```

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
