import { handler, json } from '../../../lib/http.js';
import { CATEGORIES } from '../../../lib/content.js';
import { CHUNK_BYTES, MAX_IMAGE_BYTES, maxVideoBytes } from '../../../lib/files.js';

export const onRequestGet = handler(async ({ env }) =>
  json({
    uploadEnabled: Boolean(env.MEDIA),
    maxVideoBytes: maxVideoBytes(env),
    maxImageBytes: MAX_IMAGE_BYTES,
    chunkBytes: CHUNK_BYTES,
    categories: CATEGORIES,
  }),
);
