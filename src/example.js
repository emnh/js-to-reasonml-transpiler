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
  sprite.scale.x *= 1.25;
  sprite.scale.y *= 1.25;
}

/* PS: Make sure your event handlers are called at least once by script, like
 * in the following line: */
onClick();

// Pointers normalize touch and mouse
sprite.on('pointerdown', onClick);

// Alternatively, use the mouse & touch events:
// sprite.on('click', onClick); // mouse-only
// sprite.on('tap', onClick); // touch-only

app.stage.addChild(sprite);


var x = 2;

x = 3;
