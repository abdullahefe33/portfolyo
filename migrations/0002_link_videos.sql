-- Görseller artık veritabanında (küçültülmüş, base64) saklanır; R2 gerekmez.
ALTER TABLE assets ADD COLUMN data TEXT;

-- Bağlantıyla eklenen videolar (YouTube / Vimeo). Bu projelerde video_key boş metindir.
ALTER TABLE projects ADD COLUMN provider TEXT;
ALTER TABLE projects ADD COLUMN provider_id TEXT;
ALTER TABLE projects ADD COLUMN provider_hash TEXT;
ALTER TABLE projects ADD COLUMN thumb_url TEXT;
