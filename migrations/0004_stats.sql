-- Çerezsiz, kişisel veri tutmayan günlük sayaçlar (ziyaret, kaynak, video oynatma, iletişim tıklamaları).
CREATE TABLE stats (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, label)
);
