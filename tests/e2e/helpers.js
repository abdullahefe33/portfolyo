import { E2E_PASS, E2E_USER } from '../../playwright.config.js';

export const fixture = (name) => new URL(`../fixtures/${name}`, import.meta.url).pathname;

// Normal bir tarayıcı kimliği: robot sayılıp istatistiğe girmemesi için (HeadlessChrome robot sayılır).
export const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Giriş yapar. Varsayılan olarak Çalışmalar sekmesine geçer; Genel bakış için { tab: 'home' } verin.
export async function login(page, { tab = 'projects' } = {}) {
  await page.goto('/admin/');
  await page.getByLabel('Kullanıcı adı').fill(E2E_USER);
  await page.getByLabel('Parola').fill(E2E_PASS);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.getByRole('tab', { name: 'Çalışmalar' }).waitFor();
  if (tab === 'projects') await page.getByRole('tab', { name: 'Çalışmalar' }).click();
}

// Sunucu tarafında IP'ye göre oran sınırı olduğundan, API testleri sahte ama farklı IP başlığı kullanır.
let n = 10;
export const freshIp = () => `10.99.${++n % 250}.${Math.floor(Math.random() * 250)}`;

export async function apiLogin(request, ip = freshIp()) {
  const res = await request.post('/api/auth/login', {
    headers: { origin: 'http://127.0.0.1:8788', 'cf-connecting-ip': ip },
    data: { username: E2E_USER, password: E2E_PASS },
  });
  const body = await res.json();
  return { res, csrf: body.csrf, ip };
}

// Site içeriği sekmesinde bir açılır grubu bulur ve açar.
export async function openGroup(page, title) {
  const group = page.locator('details.group').filter({ has: page.locator('.group-title', { hasText: new RegExp(`^${title}$`) }) });
  if (!(await group.evaluate((el) => el.open))) await group.locator('summary').click();
  return group;
}

// Çalışmalar sekmesindeki "Daha fazla ayrıntı" kutusunu açar.
export async function openMore(page) {
  const more = page.locator('details.more').first();
  if (!(await more.evaluate((el) => el.open))) await more.locator('summary').click();
  return more;
}
