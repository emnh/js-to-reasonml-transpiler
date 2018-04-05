var app = new PIXI.Application();
document.body.appendChild(app.view);

// Create background image
var background = PIXI.Sprite.fromImage("http://pixijs.io/examples/required/assets/bkg-grass.jpg");
background.width = app.screen.width;
background.height = app.screen.height;
app.stage.addChild(background);

// Stop application wait for load to finish
app.stop();

var filter = new PIXI.Filter(null, null);

// Handle the load completed
function onLoaded (loader,res) {

    // Create the new filter, arguments: (vertexShader, framentSource)
    filter = new PIXI.Filter(null, res.shader.data);

    // Add the filter
    /* Workaround for refmt bug https://github.com/facebook/reason/issues/1895 */
    var filter2 = filter;
    background.filters = [filter2];

    // Resume application update
    app.start();
}

PIXI.loader.add('shader', 'http://pixijs.io/examples/required/assets/basics/shader.frag')
    .load(onLoaded);

// Animate the filter
app.ticker.add(function(delta) {
    filter.uniforms.customUniform += 0.04 * delta;
});

