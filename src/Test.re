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
