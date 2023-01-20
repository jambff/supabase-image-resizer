import sharp, { OutputInfo } from 'sharp';
import smartcrop = require('smartcrop-sharp');
import imageminPngquant = require('imagemin-pngquant');
import { ResizeOptions } from './types';

const getDimArray = (
  dims: string | string[],
  zoom?: number,
): { width: number; height: number } => {
  const dimArr = typeof dims === 'string' ? dims.split(',') : dims;
  const finalZoom = zoom ?? 1;
  const [width, height] = dimArr.map((v: string) =>
    Math.round(Number(v) * finalZoom),
  );

  return { width, height };
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

export const resizeImage = async (
  buffer: Buffer,
  options: ResizeOptions,
  fileExtension?: string,
): Promise<{ data: Buffer; info: OutputInfo }> => {
  const image = sharp(buffer, { failOnError: false }).withMetadata();
  const metadata = await image.metadata();

  image.rotate();

  if (fileExtension === 'gif') {
    image.png();
  }

  if (options.crop) {
    // convert percentages to px values
    const cropValues = options.crop.map((value: string, index: number) => {
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
  const zoom = options.zoom ? parseFloat(options.zoom) : 1;

  // resize
  if (options.resize) {
    // apply smart crop if available
    if (options.crop_strategy === 'smart' && !options.crop) {
      const { width, height } = getDimArray(options.resize);
      const rotatedImage = await image.toBuffer();
      let result;

      if (width && height) {
        result = await smartcrop.crop(rotatedImage, {
          width,
          height,
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

    image.resize({
      ...getDimArray(options.resize, zoom),
      withoutEnlargement: true,
      position:
        (options.crop_strategy !== 'smart' && options.crop_strategy) ||
        options.gravity ||
        'centre',
    });
  } else if (options.fit) {
    image.resize({
      ...getDimArray(options.fit, zoom),
      fit: 'inside',
      withoutEnlargement: true,
    });
  } else if (options.lb) {
    image.resize({
      ...getDimArray(options.lb, zoom),
      fit: 'contain',
      // default to a black background to replicate Photon API behaviour
      // when no background colour specified
      background: options.background || 'black',
      withoutEnlargement: true,
    });
  } else if (options.w || options.h) {
    image.resize(
      Number(options.w) * zoom || null,
      Number(options.h) * zoom || null,
      {
        fit: options.crop ? 'cover' : 'inside',
        withoutEnlargement: true,
      },
    );
  }

  // set default quality slightly higher than sharp's default
  if (!options.quality) {
    options.quality = applyZoomCompression(82, zoom);
  }

  // allow override of compression quality
  if (options.webp) {
    image.webp({
      quality: Math.round(clamp(options.quality, 0, 100)),
    });
  } else if (metadata.format === 'jpeg') {
    image.jpeg({
      quality: Math.round(clamp(options.quality, 0, 100)),
    });
  }

  // send image
  return new Promise((resolve, reject) => {
    image.toBuffer(async (err, data, info) => {
      if (err) {
        reject(err);

        return;
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
