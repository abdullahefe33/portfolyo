import { E2E_PASS, E2E_USER } from '../../playwright.config.js';

export const fixture = (name) => new URL(`../fixtures/${name}`, import.meta.url).pathname;

export async function login(page) {
  await page.goto('/admin/');
  await page.getByLabel('Kullanıcı adı').fill(E2E_USER);
  await page.getByLabel('Parola').fill(E2E_PASS);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.getByRole('tab', { name: 'Çalışmalar' }).waitFor();
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
