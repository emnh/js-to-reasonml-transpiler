type appApplicationT;

type appHTMLDocumentT;

type appHTMLBodyElementT;

type appHTMLCanvasElementT;

type usagePIXIT;

type usagePIXISettingsT;

type usageFunPIXISpriteT = usageFunPIXISpriteArgT => usageFunPIXISpriteRetT
and usageFunPIXISpriteArgT
and usageFunPIXISpriteRetT;

type appSpriteT;

type appObservablePointT;

type appRectangleT;

type appEventT;

type appMemoryInfoT;

type usageFunOnClickT = appEventT => int
and usageFunOnClickArgT
and usageFunOnClickRetT;

type appContainerT;

type smallObject16T = {. "backgroundColor": int};

type smallObject17T = {
  .
  "LINEAR": int,
  "NEAREST": int
};

type smallObject18T = {. "memory": appMemoryInfoT};

[@bs.val] [@bs.module "pixi.js"] external modPIXI : usagePIXIT = "PIXI";

[@bs.new] [@bs.module "pixi.js"]
external newPIXIApplication : (int, int, smallObject16T) => appApplicationT =
  "Application";

[@bs.val] external document : appHTMLDocumentT = "document";

[@bs.get]
external getDocumentBody : appHTMLDocumentT => appHTMLBodyElementT = "body";

[@bs.get]
external getAppView : appApplicationT => appHTMLCanvasElementT = "view";

[@bs.send]
external documentBodyAppendChild :
  (appHTMLBodyElementT, appHTMLCanvasElementT) => appHTMLCanvasElementT =
  "appendChild";

[@bs.val] [@bs.module "pixi.js"]
external getPIXISettings : usagePIXISettingsT = "settings";

[@bs.set]
external setPIXISettingsSCALE_MODE : (usagePIXISettingsT, int) => unit =
  "SCALE_MODE";

[@bs.val] [@bs.module "pixi.js"] [@bs.scope "settings"]
external getPIXISettingsSCALE_MODE : int = "SCALE_MODE";

[@bs.val] [@bs.module "pixi.js"]
external getPIXISCALE_MODES : smallObject17T = "SCALE_MODES";

[@bs.val] [@bs.module "pixi.js"] [@bs.scope "SCALE_MODES"]
external getPIXISCALE_MODESNEAREST : int = "NEAREST";

[@bs.val] [@bs.module "pixi.js"]
external getPIXISprite : usageFunPIXISpriteT = "Sprite";

[@bs.send]
external pixiSpriteFromImage : (usageFunPIXISpriteT, string) => appSpriteT =
  "fromImage";

[@bs.get]
external getSpriteAnchor : appSpriteT => appObservablePointT = "anchor";

[@bs.send]
external spriteAnchorSet : (appObservablePointT, float) => unit = "set";

[@bs.set] external setSpriteX : (appSpriteT, int) => unit = "x";

[@bs.get] external getSpriteX : appSpriteT => int = "x";

[@bs.get] external getAppScreen : appApplicationT => appRectangleT = "screen";

[@bs.get] external getAppScreenWidth : appRectangleT => int = "width";

[@bs.set] external setSpriteY : (appSpriteT, int) => unit = "y";

[@bs.get] external getSpriteY : appSpriteT => int = "y";

[@bs.get] external getAppScreenHeight : appRectangleT => int = "height";

[@bs.set]
external setSpriteInteractive : (appSpriteT, bool) => unit = "interactive";

[@bs.get] external getSpriteInteractive : appSpriteT => bool = "interactive";

[@bs.set]
external setSpriteButtonMode : (appSpriteT, bool) => unit = "buttonMode";

[@bs.get] external getSpriteButtonMode : appSpriteT => bool = "buttonMode";

[@bs.val] external console : smallObject18T = "console";

[@bs.get]
external getSpriteScale : appSpriteT => appObservablePointT = "scale";

[@bs.set]
external setSpriteScaleX : (appObservablePointT, float) => unit = "x";

[@bs.get] external getSpriteScaleX : appObservablePointT => float = "x";

[@bs.set]
external setSpriteScaleY : (appObservablePointT, float) => unit = "y";

[@bs.get] external getSpriteScaleY : appObservablePointT => float = "y";

[@bs.new] external newEvent : string => appEventT = "Event";

[@bs.send]
external spriteOn : (appSpriteT, string, usageFunOnClickT) => appSpriteT =
  "on";

[@bs.get] external getAppStage : appApplicationT => appContainerT = "stage";

[@bs.send]
external appStageAddChild : (appContainerT, appSpriteT) => appSpriteT =
  "addChild";

let app = newPIXIApplication(800, 600, {"backgroundColor": 0x1099bb});

/*
 console.log(app.constructor.name);
  */
let _ = documentBodyAppendChild(getDocumentBody(document), getAppView(app));

/* Scale mode for all textures, will retain pixelation */
setPIXISettingsSCALE_MODE(getPIXISettings, getPIXISCALE_MODESNEAREST);

let sprite =
  pixiSpriteFromImage(
    getPIXISprite,
    "http://pixijs.io/examples/required/assets/basics/bunny.png"
  );

/* Set the initial position */
spriteAnchorSet(getSpriteAnchor(sprite), 0.5);

setSpriteX(sprite, getAppScreenWidth(getAppScreen(app)) / 2);

setSpriteY(sprite, getAppScreenHeight(getAppScreen(app)) / 2);

/* Opt-in to interactivity */
setSpriteInteractive(sprite, true);

/* Shows hand cursor */
setSpriteButtonMode(sprite, true);

/* PS: Functions are not automatically lifted and must be in order for
 * generated script to use them correctly.  */
let onClick = evt => {
  /* PS: Make sure your event handlers are called at least once by script  */
  Js.log(evt);
  setSpriteScaleX(
    getSpriteScale(sprite),
    getSpriteScaleX(getSpriteScale(sprite)) *. 1.25
  );
  setSpriteScaleY(
    getSpriteScale(sprite),
    getSpriteScaleY(getSpriteScale(sprite)) *. 1.25
  );
  0;
};

/* PS: Make sure your event handlers are called at least once by script, like
 * in the following line:  */
let _ = onClick(newEvent("test"));

/* Pointers normalize touch and mouse */
let _ = spriteOn(sprite, "pointerdown", onClick);

/* Alternatively, use the mouse & touch events:
   sprite.on('click', onClick); // mouse-only
   sprite.on('tap', onClick); // touch-only */
let _ = appStageAddChild(getAppStage(app), sprite);

let x = 3;

let x = x * 2;
