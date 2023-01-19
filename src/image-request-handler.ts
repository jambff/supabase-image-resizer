import { Request, Response } from 'express';
import { currentUrl } from 'current-url';
import qs from 'qs';
import fetch from 'node-fetch';
import { getSupabaseClient } from './supabase';
import { logger } from './logger';
import { resizeBuffer } from './resize-image';

const ONE_YEAR = 31536000;

export const handleImageRequest = async (req: Request, res: Response) => {
  const url = currentUrl(req);
  const supabase = getSupabaseClient();
  const [bucket, ...pathParts] = url.pathname
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
  } catch (err) {
    logger.error(err);
    res.status(500).end();

    return;
  }

  if (supabaseRes.status !== 200) {
    res.status(supabaseRes.status).end();

    return;
  }

  let imageBuffer;
  let info;

  try {
    ({ data: imageBuffer, info } = await resizeBuffer(
      await supabaseRes.buffer(),
      qs.parse(url.search.replace('?', '')),
    ));
  } catch (err) {
    logger.error(err);
    res.status(500).end();

    return;
  }

  res.writeHead(200, {
    'Content-Type': `image/${info.format}`,
    'Content-Length': info.size,
    'Cache-Control': `max-age=${ONE_YEAR}`,
    'Last-Modified': new Date().toUTCString(),
  });

  res.end(imageBuffer);
};
