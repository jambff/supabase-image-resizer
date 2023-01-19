import { Request, Response } from 'express';
import { currentUrl } from 'current-url';
import qs from 'qs';
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

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(`/${decodeURI(pathParts.join('/'))}`);

  if (error) {
    logger.error(error);
  }

  if (!data) {
    res.status(404).send();

    return;
  }

  const { data: imageBuffer, info } = await resizeBuffer(
    Buffer.from(await data.arrayBuffer()),
    qs.parse(url.search.replace('?', '')),
  );

  res.writeHead(200, {
    'Content-Type': `image/${info.format}`,
    'Cache-Control': `max-age=${ONE_YEAR}`,
    'Last-Modified': new Date().toUTCString(),
  });

  res.end(imageBuffer);
};
