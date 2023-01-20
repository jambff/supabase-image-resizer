import { logger } from './logger';
import { QueryParams, ResizeOptions } from './types';

export const getValidArgs = (args: QueryParams) => {
  const validArgs: ResizeOptions = {};

  if (args.w) {
    if (!/^[1-9]\d*$/.test(args.w)) {
      logger.warn('w arg is not valid');
    } else {
      validArgs.w = Number(args.w);
    }
  }

  if (args.h) {
    if (!/^[1-9]\d*$/.test(args.h)) {
      logger.warn('h arg is not valid');
    } else {
      validArgs.h = Number(args.h);
    }
  }

  if (args.quality) {
    const quality = Number(args.quality);

    if (
      !Number.isFinite(quality) ||
      !/^[0-9]{1,3}$/.test(args.quality) ||
      quality < 0 ||
      quality > 100
    ) {
      logger.warn('quality arg is not valid');
    } else {
      validArgs.quality = quality;
    }
  }

  if (args.resize) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.resize)) {
      logger.warn('resize arg is not valid');
    } else {
      validArgs.resize = args.resize;
    }
  }

  if (args.crop_strategy) {
    if (!/^(smart|entropy|attention)$/.test(args.crop_strategy)) {
      logger.warn('crop_strategy arg is not valid');
    } else {
      validArgs.crop_strategy = args.crop_strategy;
    }
  }

  if (args.gravity) {
    if (
      !/^(north|northeast|east|southeast|south|southwest|west|northwest|center)$/.test(
        args.gravity,
      )
    ) {
      logger.warn('gravity arg is not valid');
    } else {
      validArgs.gravity = args.gravity;
    }
  }

  if (args.fit) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.fit)) {
      logger.warn('fit arg is not valid');
    } else {
      validArgs.fit = args.fit;
    }
  }

  if (args.crop) {
    if (!/^\d+(px)?,\d+(px)?,\d+(px)?,\d+(px)?$/.test(args.crop)) {
      logger.warn('crop arg is not valid');
    } else {
      validArgs.crop = args.crop.split(',');
    }
  }

  if (args.zoom) {
    if (!/^\d+(\.\d+)?$/.test(args.zoom)) {
      logger.warn('zoom arg is not valid');
    } else {
      validArgs.zoom = args.zoom;
    }
  }

  if (args.webp) {
    if (!/^0|1|true|false$/.test(args.webp)) {
      logger.warn('webp arg is not valid');
    } else {
      validArgs.webp = ['0', 'true'].includes(args.webp);
    }
  }

  if (args.lb) {
    if (!/^\d+(px)?,\d+(px)?$/.test(args.lb)) {
      logger.warn('lb arg is not valid');
    } else {
      validArgs.lb = args.lb;
    }
  }

  if (args.background) {
    if (!/^#[a-f0-9]{3}[a-f0-9]{3}?$/.test(args.background)) {
      logger.warn('background arg is not valid');
    } else {
      validArgs.background = args.background;
    }
  }

  return validArgs;
};
