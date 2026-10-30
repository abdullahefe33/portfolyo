-- Her projede kişinin rolü (ör. "Çekim, kurgu, renk düzenleme").
ALTER TABLE projects ADD COLUMN role TEXT NOT NULL DEFAULT '';
