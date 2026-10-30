// Görsel küçültme/yükleme ve (R2 açıksa) parçalı video yükleme.
import { api, state, fmtBytes } from './core.js';

// Görseli tarayıcıda küçültür; sunucu sınırının altında tutar (görseller veritabanında saklanır).
export async function shrinkImage(file, maxSide = 1280) {
  const limit = state.config.maxImageBytes * 0.9;
  if (file.size <= 150 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Bu görsel okunamadı. JPG, PNG veya WebP seçin.'); }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  for (const type of ['image/webp', 'image/jpeg']) {
    for (const q of [0.88, 0.75, 0.6, 0.45]) {
      const blob = await new Promise((r) => c.toBlob(r, type, q));
      if (blob && blob.type === type && blob.size <= limit) return blob;
    }
  }
  throw new Error('Görsel çok büyük. Daha küçük bir görsel seçin.');
}

export async function uploadImage(file, purpose, maxSide) {
  const blob = await shrinkImage(file, maxSide);
  const r = await api(`/api/admin/images?purpose=${purpose}`, { method: 'POST', body: blob });
  return r.key;
}

// Videonun bir karesinden kapak görseli üretir (tarayıcı kodeği desteklemiyorsa null döner).
export async function frameFromVideo(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; setTimeout(rej, 10000); });
    const seeked = new Promise((res, rej) => { v.onseeked = res; setTimeout(rej, 10000); });
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await seeked;
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d');
    const scale = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
    const w = v.videoWidth * scale; const hh = v.videoHeight * scale;
    ctx.drawImage(v, (c.width - w) / 2, (c.height - hh) / 2, w, hh);
    for (const [type, q] of [['image/webp', 0.85], ['image/jpeg', 0.85]]) {
      const blob = await new Promise((r) => c.toBlob(r, type, q));
      if (blob && blob.type === type) return blob;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function putWithRetry(path, blob, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await api(path, { method: 'PUT', body: blob });
    } catch (err) {
      if (i >= tries || /Oturum|geçersiz|aştı|büyük|değil/i.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}

export async function uploadVideo(file, onProgress) {
  const { id } = await api('/api/admin/uploads', { method: 'POST', json: { name: file.name, size: file.size } });
  const chunk = state.config.chunkBytes;
  const total = Math.ceil(file.size / chunk);
  try {
    for (let n = 1; n <= total; n++) {
      await putWithRetry(`/api/admin/uploads/${id}/parts/${n}`, file.slice((n - 1) * chunk, Math.min(n * chunk, file.size)));
      onProgress(Math.min(n * chunk, file.size) / file.size);
    }
    return await api(`/api/admin/uploads/${id}/complete`, { method: 'POST' });
  } catch (err) {
    api(`/api/admin/uploads/${id}`, { method: 'DELETE' }).catch(() => {});
    throw err;
  }
}

export { fmtBytes };
