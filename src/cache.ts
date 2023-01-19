import { Response } from 'express';
import { ServerResponse } from 'http';
import timestring from 'timestring';

export const noCacheHeaders = [
  'no-cache',
  'no-store',
  'private',
  'must-revalidate',
  'max-age=0',
  'max-stale=0',
  'post-check=0',
  'pre-check=0',
].join(', ');

/**
 * Add headers to disable the cache.
 */
export const disableCache = (res: ServerResponse) => {
  res.setHeader('Cache-Control', noCacheHeaders);
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', 0);
};

/**
 * Get seconds from the given number or string.
 */
const getSeconds = (input: string) => {
  try {
    return timestring(input);
  } catch (err) {
    throw new Error(`Invalid input when setting cache header: ${input}`);
  }
};

/**
 * Add cache headers.
 */
export const setCacheHeaders = (
  res: Response,
  {
    maxAge,
    staleWhileRevalidate,
    staleIfError,
  }: {
    maxAge?: string;
    staleWhileRevalidate?: string;
    staleIfError?: string;
  },
) => {
  const cacheControl = [];

  if (maxAge) {
    res.setHeader('Cache-Control', `max-age=${getSeconds(maxAge)}`);
  }

  if (staleWhileRevalidate) {
    cacheControl.push(
      `stale-while-revalidate=${getSeconds(staleWhileRevalidate)}`,
    );
  }

  if (staleIfError) {
    cacheControl.push(`stale-if-error=${getSeconds(staleIfError)}`);
  }

  if (cacheControl.length) {
    res.setHeader('Cache-Control', cacheControl.join(', '));
  }
};
