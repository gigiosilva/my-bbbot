const sharp = require('sharp');
const _ = require('lodash');
const fp = require('lodash/fp');

const removeBlackLines = (pixels, width) => {
  return pixels.map((pixel, i) => {
    if ((pixel[0] == 0 && pixel[1] == 0 && pixel[2] == 0) && i > width) {
      let aboveLine = i-width;
      let belowLine = i+width;

      return [
       (pixels[aboveLine][0] + pixels[belowLine][0]) / 2,
       (pixels[aboveLine][1] + pixels[belowLine][1]) / 2, 
       (pixels[aboveLine][2] + pixels[belowLine][2]) / 2
      ]
    }

    return pixel;
  });
}

const cropBorders = (pixels, height, width) => {
  let top, bottom, left, right;

  // crop top
  for (let index = 0; index <= pixels.length; index++) {
    if (!isWhite(pixels[index])) {
      top = Math.trunc(index/width);
      pixels = pixels.filter((pixel,i) => i >= (top*width));
      height = height - top;
      break;
    }
  }

  // crop bottom
  for (let index = pixels.length - 1; index >= 0; index--) {
    if (!isWhite(pixels[index])) {
      bottom = Math.trunc(index/width);
      pixels = pixels.filter((pixel,i) => i <= (bottom*width));
      height = bottom;
      break;
    }
  }

  // crop left
  let excludedLeft = [];
  for (let indexW = 0; indexW < width; indexW++) {
    for (let indexH = 0; indexH < height; indexH++) {
      if (!isWhite(pixels[indexW+(indexH*width)])) left = indexW;
      excludedLeft.push(indexW+(indexH*width));
    }
    if (left) {
      pixels = pixels.filter((pixel,i) => !excludedLeft.includes(i));
      width = width - left - 1;
      break;
    }
  }

  // crop right
  let excludedRight = [];
  for (let indexW = width - 1; indexW >=0 ; indexW--) {
    for (let indexH = 0; indexH < height; indexH++) {
      if (!isWhite(pixels[indexW+(indexH*width)])) right = indexW;
      excludedRight.push(indexW+(indexH*width));
    }
    if (right) {
      pixels = pixels.filter((pixel,i) => !excludedRight.includes(i));
      width = right;
      break;
    }
  }

  return {
    pixels,
    width,
    height
  }
}

const splitImages = (pixels, height, width) => {

  let lines = _.chunk(pixels, (width));
  let columns = fp.zipAll(lines);

  let split = [];

  columns.forEach((column, i) => {
    let lastColumn = i > 0 ? isWhite(_.concat(...columns[i-1])) : isWhite(_.concat(...column));

    if (lastColumn != isWhite(_.concat(...column))) {
      split.push(i)
    }
  });

  let images = [];

  split.forEach((cut, i) => {
    let imageLine = [];
    lines.forEach(line => {
      imageLine.push(line.slice(split[i], split[i+1]))
    })
    images.push(imageLine);
  })

  images = images.map(image => {

    return {
      pixels: _.concat(...image),
      width: image[0].length,
      height: height
    }
  })

  return images.filter(image => !isWhite(_.concat(...image.pixels)));
}

const isWhite = data => data.every(a => a >= 240);
const isBlack = data => data.every(a => a <= 10);
const isGrey = data => data.every(a => a < 240 && a > 10);

const getImageParams = ({ width, height, pixels }) => {
  let results = {
    white: 0,
    grey: 0,
    black: 0,
    width,
    height
  };
  
  pixels.forEach(pixel => {
    if (isGrey(pixel)) {
      results.grey++;
    } else if (isBlack(pixel)) {
      results.black++;
    } else if (isWhite(pixel)) {
      results.white++;
    }
  });
  
  return results;
};

const getScore = (contest, models) => {

  let score = models.map(model => {
    return {
      grey: Math.abs(model.grey - contest.grey),
      black: Math.abs(model.black - contest.black),
      size: Math.abs(
        model.width + model.height - contest.width - contest.height
      ),
      width: Math.abs(model.width - contest.width),
      height: Math.abs(model.height - contest.height)
    }
  })
  .map(({ grey, black, width, height }) => grey + black + width + height)

  return _.min(score);
}

module.exports = {
  removeBlackLines,
  cropBorders,
  splitImages,
  getImageParams,
  getScore
};