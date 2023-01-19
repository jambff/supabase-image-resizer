import { Request, Response } from 'express';
import { currentUrl } from 'current-url';
import qs from 'qs';
import { getSupabaseClient } from './supabase';
import { logger } from './logger';
import { resizeBuffer } from './resize-image';

const ONE_YEAR = 31536000;

type StorageError = {
  status: number;
};

const isStorageError = (error: unknown): error is StorageError =>
  typeof error === 'object' && error !== null && 'status' in error;

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
    const statusCode = isStorageError(error) ? error.status : 404;

    res.status(statusCode).end();

    return;
  }

  if (!data) {
    res.status(404).end();

    return;
  }

  let imageBuffer;
  let info;

  try {
    ({ data: imageBuffer, info } = await resizeBuffer(
      Buffer.from(await data.arrayBuffer()),
      qs.parse(url.search.replace('?', '')),
    ));
  } catch {
    res.status(500).end();

    return;
  }

  res.writeHead(200, {
    'Content-Type': `image/${info.format}`,
    'Cache-Control': `max-age=${ONE_YEAR}`,
    'Last-Modified': new Date().toUTCString(),
  });

  res.end(imageBuffer);
};
