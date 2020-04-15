const fs = require('fs');
const sharp = require('sharp');
const _ = require('lodash');
const path = require('path');
const { removeBlackLines, cropBorders, splitImages, getImageParams } = require('./image-filter');

const trainAll = async (dirPath, dirTrainedPath) => {

  dirPath = `images`;
  dirTrainedPath = `images-trained`;

  fs.readdir(dirPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 

    //listing all files using forEach
    files.forEach(async fileName => {
      const imgPath = path.join(dirPath, fileName);
      const symbol = fileName.match(/(.*)-(.)\./)[1];
      const correctIndex = (fileName.match(/(.*)-(.)\./)[2]) - 1;

      let { width, height } = await sharp(imgPath).metadata();

      const imgData = await sharp(imgPath).raw().toBuffer();

      // 3 channels RGB
      let pixels = _.chunk(imgData, 3);
      
      pixels = removeBlackLines(pixels, width);

      let images = splitImages(pixels, height, width);

      let correctImage = images[correctIndex];

      correctImage = cropBorders(correctImage.pixels, correctImage.height, correctImage.width);

      const params = getImageParams({ width: correctImage.width, height: correctImage.height, pixels: correctImage.pixels });

      const model = {
        [symbol]: [params]
      }

      const data = fs.readFileSync('model.json', 'utf-8');

      if (data) {
        var arrayOfObjects = JSON.parse(data)

        if (arrayOfObjects[symbol]) {
          if (!_.some(arrayOfObjects[symbol], params)) {
            arrayOfObjects[symbol].push(params)
          }
        } else {
          arrayOfObjects[symbol] = [params]
        }
      }

      const writing = fs.writeFileSync('model.json', JSON.stringify(arrayOfObjects || model), 'utf-8');

      fs.renameSync(path.join(__dirname, '../', dirPath, fileName), path.join(__dirname, '../', dirTrainedPath, fileName))

      console.log('Done!')
    });
  });
}

const trainOne = async (symbol, imgPath, correctIndex) => {

  let { width, height } = await sharp(imgPath).metadata();

  const imgData = await sharp(imgPath).raw().toBuffer();

  // 3 channels RGB
  let pixels = _.chunk(imgData, 3);
  
  pixels = removeBlackLines(pixels, width);

  let images = splitImages(pixels, height, width);

  let correctImage = images[correctIndex];

  correctImage = cropBorders(correctImage.pixels, correctImage.height, correctImage.width);

  const params = getImageParams({ width: correctImage.width, height: correctImage.height, pixels: correctImage.pixels });

  const model = {
    [symbol]: [params]
  }

  const data = fs.readFileSync('model.json', 'utf-8');

  if (data) {
    var arrayOfObjects = JSON.parse(data)

    if (arrayOfObjects[symbol]) {
      if (!_.some(arrayOfObjects[symbol], params)) {
        arrayOfObjects[symbol].push(params)
      }
    } else {
      arrayOfObjects[symbol] = [params]
    }
  }

  const writing = fs.writeFileSync('model.json', JSON.stringify(arrayOfObjects || model), 'utf-8');

  console.log(`O simbolo ${symbol} posição ${correctIndex+1} foi adicionado ao modelo`);
}

module.exports = {
  trainAll,
  trainOne
};
