import { createHash } from 'node:crypto';
export const locales = ['es', 'en', 'fr', 'it', 'de', 'ru'];
export const localeNames = { es: 'Español', en: 'English', fr: 'Français', it: 'Italiano', de: 'Deutsch', ru: 'Русский' };
export const hash = value => createHash('sha256').update(value).digest('hex');
export const textKey = value => hash(value).slice(0, 24);
export const textId = (key, locale) => `${locale}-${key}`;
export async function api(base, token, path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000), redirect: 'error' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Directus ${method} ${path.split('?')[0]} (${response.status}): ${data.errors?.[0]?.message || 'Request failed'}`);
  return data.data;
}
export async function readTexts() {
  if (!process.env.DIRECTUS_URL) return [];
  if (!process.env.DIRECTUS_READ_TOKEN) throw new Error('DIRECTUS_READ_TOKEN is required when DIRECTUS_URL is set.');
  return api(process.env.DIRECTUS_URL, process.env.DIRECTUS_READ_TOKEN, '/items/site_texts?limit=-1&filter[status][_eq]=published&fields=id,key,source,value,locale,source_hash,status');
}
