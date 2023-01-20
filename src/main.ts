import fetch from 'node-fetch';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { getSupabaseClient } from './supabase';
import { logger } from './logger';
import { resizeImage } from './resize-image';
import { QueryParams } from './types';
import { getValidArgs } from './validate';

type RequestArgs = QueryParams & {
  __ow_path: string;
};

type Response = {
  status: number;
  body?: string;
  headers: {
    'Cache-Control': string;
    [x: string]: number | string;
  };
};

const ONE_YEAR = 31536000;
const FIVE_MINUTES = 300000;

const getResponse = (
  status: number,
  body?: string,
  headers?: Record<string, string | number>,
): Response => ({
  status,
  body,
  headers: {
    'Cache-Control': `max-age=${FIVE_MINUTES}`,
    ...headers,
  },
});

/**
 * DigitalOcten lambda handler.
 */
export const main = async (args: RequestArgs): Promise<Response> => {
  const supabase = getSupabaseClient();
  const [bucket, ...pathParts] = args.__ow_path
    .split('/')
    .map((part: string) => part.trim());

  const {
    data: { publicUrl },
  } = supabase.storage
    .from(bucket)
    .getPublicUrl(`/${decodeURI(pathParts.join('/'))}`);

  let supabaseRes;

  try {
    supabaseRes = await fetch(publicUrl);
  } catch (err: any) {
    logger.error(err);

    return getResponse(500, err.message);
  }

  if (supabaseRes.status !== 200) {
    return getResponse(supabaseRes.status, (await supabaseRes.json()).message);
  }

  const downloadBuffer = await supabaseRes.buffer();
  const { ext } = (await fileTypeFromBuffer(downloadBuffer)) ?? {};

  let imageBuffer;
  let info;

  try {
    ({ data: imageBuffer, info } = await resizeImage(
      downloadBuffer,
      getValidArgs(args),
      ext,
    ));
  } catch (err: any) {
    logger.error(err);

    return getResponse(500, err.message);
  }

  return getResponse(200, imageBuffer.toString('base64'), {
    'Content-Type': `image/${info.format}`,
    'Content-Length': info.size,
    'Cache-Control': `max-age=${ONE_YEAR}`,
    'Last-Modified': new Date().toUTCString(),
  });
};
