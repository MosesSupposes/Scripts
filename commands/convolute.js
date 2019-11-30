'use strict'

/**
 * Dependencies
 */

const fs = require('fs');
const path = require('path');
const meow = require('meow');
const jimp = require('jimp');
const showHelp = require('../helpers/showHelp');
const applyToFileOrDirectory = require('../helpers/applyToFileOrDirectory');

/**
 * Define helpers
 */

async function processImage(image, options={}) {
  const img = await jimp.read(image);
  const out = options.overwrite ? image : createFilename(image);
  return img.greyscale().write(out);
}

function createFilename(image) {
  const ext = path.extname(image);
  const basename = path.basename(image, ext);
  const dirname = path.dirname(image);

  return path.join(dirname, `${basename}-bw${ext}`);
}

/**
 * Parse args
 */

const cli = meow(`
  Usage
    $ cast convolute IMAGE_OR_DIR

  Options
    --kernel MATRIX    Custom matrix filter.
    --edge-enhance     Edge enhance the image.
    --edge-detect      Edge detect the image.
    --sharpen          Sharpen the image.
    --emboss           Emboss the image.
    --blur             Blur the image.
    --overwrite        Overwrite the original file.
`, {
  description: 'Apply an image filter using convolution matrix.',
  flags: {
    overwrite: {
      type: 'boolean'
    }
  }
});

/**
 * Define script
 */

async function convolute(image, options={}) {
  showHelp(cli, [
    (!image && cli.input.length < 2)
  ]);

  image = image || cli.input[1];
  // const overwrite = options.overwrite || cli.flags.overwrite;

  // try {
  //   applyToFileOrDirectory(image, processImage, { overwrite: overwrite });
  // } catch (err) {
  //   console.error(err);
  // }
}

/**
 * Export script
 */

module.exports = convolute;
