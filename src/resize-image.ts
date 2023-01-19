import sharp, { OutputInfo } from 'sharp';
import path = require('path');
import smartcrop = require('smartcrop-sharp');
import imageminPngquant = require('imagemin-pngquant');

const getDimArray = (dims: string | string[], zoom?: number) => {
  const dimArr = typeof dims === 'string' ? dims.split(',') : dims;
  const finalZoom = zoom ?? 1;

  return dimArr.map((v: string) => Math.round(Number(v) * finalZoom) || null);
};

const clamp = (val: string | number, min: number, max: number) =>
  Math.min(Math.max(Number(val), min), max);

// return a default compression value based on a logarithmic scale
// defaultValue = 100, zoom = 2; = 65
// defaultValue = 80, zoom = 2; = 50
// defaultValue = 100, zoom = 1.5; = 86
// defaultValue = 80, zoom = 1.5; = 68
const applyZoomCompression = (defaultValue: number, zoom: number) => {
  const value = Math.round(
    defaultValue -
      (Math.log(zoom) / Math.log(defaultValue / zoom)) * (defaultValue * zoom),
  );

  const min = Math.round(defaultValue / zoom);

  return clamp(value, min, defaultValue);
};

export const resizeBuffer = async (
  buffer: Buffer,
  args: any,
): Promise<{ data: Buffer; info: OutputInfo }> => {
  const image = sharp(buffer, { failOnError: false }).withMetadata();

  // check we can get valid metadata
  const metadata = await image.metadata();

  // auto rotate based on orientation exif data
  image.rotate();

  // convert gifs to pngs
  if (args.key && path.extname(args.key).toLowerCase() === '.gif') {
    image.png();
  }

  // validate args, remove from the object if not valid
  const errors: string[] = [];

  if (args.w) {
    if (!/^[1-9]\d*$/.test(args.w)) {
      delete args.w;
      errors.push('w arg is not valid');
    }
  }

  if (args.h) {
    if (!/^[1-9]\d*$/.test(args.h)) {
      delete args.h;
      errors.push('h arg is not valid');
    }
  }

  if (args.quality) {
    if (
      !/^[0-9]{1,3}$/.test(args.quality) ||
      args.quality < 0 ||
      args.quality > 100
    ) {
      delete args.quality;
      errors.push('quality arg is not valid');
    }
  }

  if (args.resize) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.resize)) {
      delete args.resize;
      errors.push('resize arg is not valid');
    }
  }

  if (args.crop_strategy) {
    if (!/^(smart|entropy|attention)$/.test(args.crop_strategy)) {
      delete args.crop_strategy;
      errors.push('crop_strategy arg is not valid');
    }
  }

  if (args.gravity) {
    if (
      !/^(north|northeast|east|southeast|south|southwest|west|northwest|center)$/.test(
        args.gravity,
      )
    ) {
      delete args.gravity;
      errors.push('gravity arg is not valid');
    }
  }

  if (args.fit) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.fit)) {
      delete args.fit;
      errors.push('fit arg is not valid');
    }
  }

  if (args.crop) {
    if (!/^\d+(px)?,\d+(px)?,\d+(px)?,\d+(px)?$/.test(args.crop)) {
      delete args.crop;
      errors.push('crop arg is not valid');
    }
  }

  if (args.zoom) {
    if (!/^\d+(\.\d+)?$/.test(args.zoom)) {
      delete args.zoom;
      errors.push('zoom arg is not valid');
    }
  }

  if (args.webp) {
    if (!/^0|1|true|false$/.test(args.webp)) {
      delete args.webp;
      errors.push('webp arg is not valid');
    }
  }

  if (args.lb) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.lb)) {
      delete args.lb;
      errors.push('lb arg is not valid');
    }
  }

  if (args.background) {
    if (!/^#[a-f0-9]{3}[a-f0-9]{3}?$/.test(args.background)) {
      delete args.background;
      errors.push('background arg is not valid');
    }
  }

  // crop (assumes crop data from original)
  if (args.crop) {
    let cropValues =
      typeof args.crop === 'string' ? args.crop.split(',') : args.crop;

    // convert percentages to px values
    cropValues = cropValues.map((value: string, index: number) => {
      if (value.indexOf('px') > -1) {
        return Number(value.substring(0, value.length - 2));
      }

      return Number(
        Number(
          metadata[index % 2 ? 'height' : 'width'] ?? 0 * (Number(value) / 100),
        ).toFixed(0),
      );
    });

    image.extract({
      left: cropValues[0],
      top: cropValues[1],
      width: cropValues[2],
      height: cropValues[3],
    });
  }

  // get zoom value
  const zoom = parseFloat(args.zoom) || 1;

  // resize
  if (args.resize) {
    // apply smart crop if available
    if (args.crop_strategy === 'smart' && !args.crop) {
      const cropResize = getDimArray(args.resize);
      const rotatedImage = await image.toBuffer();
      let result;

      if (cropResize[0] && cropResize[1]) {
        result = await smartcrop.crop(rotatedImage, {
          width: cropResize[0],
          height: cropResize[1],
        });
      }

      if (result && result.topCrop) {
        image.extract({
          left: result.topCrop.x,
          top: result.topCrop.y,
          width: result.topCrop.width,
          height: result.topCrop.height,
        });
      }
    }

    // apply the resize
    args.resize = getDimArray(args.resize, zoom);
    image.resize({
      width: args.resize[0],
      height: args.resize[1],
      withoutEnlargement: true,
      position:
        (args.crop_strategy !== 'smart' && args.crop_strategy) ||
        args.gravity ||
        'centre',
    });
  } else if (args.fit) {
    args.fit = getDimArray(args.fit, zoom);
    image.resize({
      width: args.fit[0],
      height: args.fit[1],
      fit: 'inside',
      withoutEnlargement: true,
    });
  } else if (args.lb) {
    args.lb = getDimArray(args.lb, zoom);
    image.resize({
      width: args.lb[0],
      height: args.lb[1],
      fit: 'contain',
      // default to a black background to replicate Photon API behaviour
      // when no background colour specified
      background: args.background || 'black',
      withoutEnlargement: true,
    });
  } else if (args.w || args.h) {
    image.resize(Number(args.w) * zoom || null, Number(args.h) * zoom || null, {
      fit: args.crop ? 'cover' : 'inside',
      withoutEnlargement: true,
    });
  }

  // set default quality slightly higher than sharp's default
  if (!args.quality) {
    args.quality = applyZoomCompression(82, zoom);
  }

  // allow override of compression quality
  if (args.webp) {
    image.webp({
      quality: Math.round(clamp(args.quality, 0, 100)),
    });
  } else if (metadata.format === 'jpeg') {
    image.jpeg({
      quality: Math.round(clamp(args.quality, 0, 100)),
    });
  }

  // send image
  return new Promise((resolve, reject) => {
    image.toBuffer(async (err, data, info) => {
      if (err) {
        reject(err);
      }

      // Pass PNG images through PNGQuant as Sharp is not good at compressing them.
      // See https://github.com/lovell/sharp/issues/478
      if (info.format === 'png') {
        data = await imageminPngquant.default()(data);

        // Make sure we update the size in the info, to reflect the new
        // size after lossless-compression.
        info.size = data.length;
      }

      resolve({ data, info });
    });
  });
};
