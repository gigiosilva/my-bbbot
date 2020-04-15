const puppeteer = require('puppeteer');

const util = require('./util');
const params = require('./cli')();
if (!params) return;

(async () => {

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    devtools: false,
    args: [
      '--window-size=200,1000',
      '--disable-features=site-per-process'
    ]
  });

  const [ page ] = await browser.pages();

  util.listenEvents(page, browser, params.victim);

  util.runLogin(page, params.credentials);

})();