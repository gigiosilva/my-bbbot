const { links, emparedados, XPathContents } = require('./config');
const { makePrediction } = require('./prediction');
const { trainOne } = require('./training');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const axios = require('axios');
const _ = require('lodash');


const runLogin = async (page, { email, password }) => {
  await page.goto(links.loginUrl);

  const emailField = await page.waitForSelector('#login');
  const passField = await page.waitForSelector('#password');

  await emailField.type(email);
  await passField.type(password);

  const loginBtn = await page.waitForSelector("[type='submit']");
  await loginBtn.click();

  await page.waitForNavigation();

  await page.goto(links.voteUrl);
};

const vote = async (page, victim) => {
  const userCard = await page.waitForXPath(emparedados[victim-1]);

  await page.waitFor(1000);

  await userCard.click();
}

const revote = async (page, victim) => {
  const retryBtn = await page.waitForXPath(XPathContents.revoteBtn);

  await page.waitFor(2000);

  await retryBtn.click();

  await page.waitFor(1000);

  vote(page, victim);
};

const CAPTCHA_SELECTOR = '#roulette-root div > div > div > div > img:nth-child(1)';
const getBoundingClientRect = (page, selector) =>
  page.$eval(selector, el => {
    const position = el.getBoundingClientRect();
    return [position.top, position.left];
  });
const selectCaptcha = async (page, index) => {
  const [top, left] = await getBoundingClientRect(page, CAPTCHA_SELECTOR);
  //clica no captcha
  if(!index) index = 1;
  await page.mouse.click(index * 53 + left + 25, top + 25);
};

const RESET_CAPTCHA = '#roulette-root div > div > div > div button:nth-child(1)';
const resetCaptcha = async page => {
  const [top, left] = await getBoundingClientRect(page, RESET_CAPTCHA);
  await page.mouse.click(left + 50, top + 10);
};

const challengePage = async (page, response, victim) => {
  let { data } = await response.json();
  let { symbol, image } = data;

  fsExtra.emptyDirSync('images/');
  
  const imageName = `images/${symbol}-${Math.floor(
    Math.random() * 8888888
  ) + 99999}.png`;
  fs.writeFileSync(imageName, image, 'base64');

  const prediction = await makePrediction(symbol, imageName);

  if (prediction) {
    await page.waitFor(1000);
  
    selectCaptcha(page, prediction.imageIndex || 0);
  } else {
    await page.evaluate(({symbol, imageName}) => {
      document.querySelectorAll('img')[victim].addEventListener("click", (event) => {
  
        window.captchaClicked({ 
          symbol,
          imageName,
          position: Math.floor((event.offsetX) / (event.target.width/5))
        });
      });
    }, {symbol, imageName});
  }

}

const challengeAcceptedPage = async (page, response, victim) => {
  let status = response.status();

  if (parseInt(status) === 200) {
    revote(page, victim);
  }
}

const listenEvents = async (page, browser, victim) => {

  await timeout(500);

  browser.on('targetcreated', async target => {
    const { type } = target._targetInfo;
    const newPage = await target.page();

    if (type !== 'page') return;
    console.log('Fechando página com propaganda.');
    await newPage.close();
  });

  page.on('response', async response => {
    let hookUrl = response.url();
    let request = response.request();

    if (hookUrl.startsWith(links.voteUrl)) {
      vote(page, victim);
    }
    if (
      hookUrl.startsWith(links.challengeAcceptedUrl) &&
      request.method() === 'POST'
    ) {
      challengeAcceptedPage(page, response, victim);
    }

    if (hookUrl.startsWith(links.challengeUrl)) {
      challengePage(page, response, victim);
    }
  });

  await page.exposeFunction('captchaClicked', e => {
    trainOne(e.symbol, e.imageName, e.position);
  });
};

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  runLogin,
  vote,
  listenEvents
};