const puppeteer = require('puppeteer');

const fs = require('fs');

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  /*
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });
  */
  await page.goto('http://localhost:8080/index.html', {"waitUntil" : "networkidle0"} );
  const source = fs.readFileSync('src/example.js', 'utf8');
  var result = await page.evaluate((source) => Promise.resolve(compile(source)), source);
  console.log(result);
  /*
  await page.screenshot({path: 'example.png', fullPage: true});
  */

  await browser.close();
})();