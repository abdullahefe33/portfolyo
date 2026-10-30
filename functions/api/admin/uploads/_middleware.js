// Dosya yükleme uçları yalnızca R2 bağlantısı varsa çalışır.
import { handler } from '../../../../lib/http.js';
import { requireMedia } from '../../../../lib/files.js';

export const onRequest = [
  handler(async (context) => {
    requireMedia(context.env);
    return context.next();
  }),
];
