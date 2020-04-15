const sharp = require('sharp');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const { removeBlackLines, cropBorders, splitImages, getImageParams, getScore } = require('./image-filter');

const makePrediction = async (symbol, imgPath, output) => {

  const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../model.json')))[symbol];

  if (!model) {
    console.log(`O simbolo ${symbol} não foi encontrado`);
    return;
  }

  let { width, height, format } = await sharp(imgPath).metadata();

  const imgData = await sharp(imgPath).raw().toBuffer();

  // 3 channels RGB
  let pixels = _.chunk(imgData, 3);
  
  pixels = removeBlackLines(pixels, width);

  let images = splitImages(pixels, height, width);

  let scores = images.map((image, i) => {

    image = cropBorders(image.pixels, image.height, image.width);

    let params = getImageParams(image);

    let score = getScore(params, model);

    if (output) {
      sharp(Buffer.from(_.concat(...image.pixels)), {
        raw: {
          width: image.width,
          height: image.height,
          channels: 3
        }
      }).toFile(`output/test${i}.${format}`);
    }

    return score;
  })

  const indexMatch = _.indexOf(scores, _.min(scores));

  const bestScore = scores[indexMatch];

  let type;

  if (bestScore < 120) {
    type = 'Certeiro';
    console.log(`O simbolo ${symbol} esta na posição ${indexMatch+1} - score ${bestScore}`);
  }

  return {
    type,
    imageIndex: indexMatch
  };

}

module.exports = {
  makePrediction
};