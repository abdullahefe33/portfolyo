// Yönetici hesabını oluşturur / parolasını sıfırlar.
//   npm run admin:set                      -> yerel veritabanı, rastgele parola üretir
//   npm run admin:set -- --remote          -> Cloudflare'deki canlı veritabanı
//   npm run admin:set -- --password "..."  -> kendi parolanız (en az 12 karakter)
// Parola yalnızca PBKDF2 özeti olarak veritabanına yazılır; düz metin saklanmaz.
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const value = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };

const username = value('username') || 'mehmet';
const generated = !value('password');
const password = value('password') || randomBytes(15).toString('base64url');
if (password.length < 12) { console.error('Parola en az 12 karakter olmalı.'); process.exit(1); }
if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) { console.error('Kullanıcı adı geçersiz.'); process.exit(1); }

const ITER = 100000; // Cloudflare Workers PBKDF2 üst sınırı
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const b64u = (b) => b.toString('base64url');
const stored = `pbkdf2-sha256$${ITER}$${b64u(salt)}$${b64u(hash)}`;

const dir = mkdtempSync(join(tmpdir(), 'admin-'));
const file = join(dir, 'admin.sql');
writeFileSync(file,
  `INSERT INTO admin_users (id, username, pw_hash) VALUES (1, '${username}', '${stored}')
   ON CONFLICT(id) DO UPDATE SET username = excluded.username, pw_hash = excluded.pw_hash, updated_at = datetime('now');
   DELETE FROM sessions;\n`);

const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'DB', flag('remote') ? '--remote' : '--local', '--file', file], { stdio: 'inherit' });
rmSync(dir, { recursive: true, force: true });
if (r.status !== 0) process.exit(r.status || 1);

console.log(`\nYönetici hesabı hazır (${flag('remote') ? 'CANLI' : 'yerel'}).`);
console.log(`  Kullanıcı adı: ${username}`);
if (generated) console.log(`  Parola       : ${password}\n  (Bu parola bir daha gösterilmez. Giriş yaptıktan sonra Hesap sekmesinden değiştirin.)`);
