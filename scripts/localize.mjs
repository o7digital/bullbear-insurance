import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { scan } from './html-content.mjs';
import { locales, localeNames, readTexts, hash, textKey } from '../cms/lib.mjs';
import sourceContent from '../src/data/original-content.json' with { type: 'json' };

const root = new URL('../dist/', import.meta.url).pathname;
const inventory = new Map();
const local = JSON.parse(await readFile(new URL('../src/data/translations.json', import.meta.url), 'utf8').catch(() => '{}'));
const rows = await readTexts();
// Copy authenticated CMS assets into the static deployment; credentials never reach visitors.
if (process.env.DIRECTUS_URL) {
  const { api } = await import('../cms/lib.mjs');
  const media = await api(process.env.DIRECTUS_URL, process.env.DIRECTUS_READ_TOKEN, '/items/site_media?limit=-1');
  for (const key of ['hero', 'logo']) {
    const item = media.find(row => row.key === key);
    if (!item?.image) throw new Error(`Missing CMS image: ${key}`);
    const format = key === 'hero' ? 'jpg' : 'png';
    const response = await fetch(`${process.env.DIRECTUS_URL}/assets/${item.image}?format=${format}`, { headers: { Authorization: `Bearer ${process.env.DIRECTUS_READ_TOKEN}` }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`CMS image unavailable: ${key} (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid CMS image: ${key}`);
    const target = key === 'hero' ? sourceContent.pages['/'].widgets.find(widget=>widget.id==='96d11b5').images[0].src : '/assets/client-logo-light.png';
    await writeFile(join(root, target), bytes);
  }
}
const cms = new Map(rows.map(row => [`${row.locale}:${row.key}`, row]));
const names = { 'sobre-nosotros': 'about', contacto: 'contact', 'aviso-de-privacidad': 'privacy', reclutamiento: 'careers', blog: 'insights' };
export function localPath(path, locale) {
  if (locale === 'es') return path;
  const parts = path.split('/');
  parts[1] = names[parts[1]] || parts[1];
  return `/${locale}${parts.join('/')}`;
}
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const htmlFiles = (await files(root)).filter(file => file.endsWith('.html') && !file.endsWith('404.html')).sort((a,b) => a === join(root,'index.html') ? -1 : b === join(root,'index.html') ? 1 : a.localeCompare(b));
for (const file of htmlFiles) {
  const original = await readFile(file, 'utf8');
  const path = '/' + file.slice(root.length).replace(/index\.html$/, '');
  const section = path === '/' ? 'Inicio' : path.includes('/service/') ? 'Servicios' : path === '/aviso-de-privacidad/' ? 'Privacidad' : path === '/blog/' || path.length > 70 ? 'Artículos' : 'Páginas';
  const scanned = scan(original);
  for (const text of scanned.texts) if (!inventory.has(text.key)) inventory.set(text.key, { ...text, section, page: path });
  for (const locale of locales) {
    const translate = value => {
      const key = textKey(value);
      const source = cms.get(`es:${key}`);
      const row = cms.get(`${locale}:${key}`);
      if (source) {
        if (!row || row.source_hash !== hash(source.value)) throw new Error(`Missing or stale translation: ${key} (${locale})`);
        return row.value;
      }
      if (locale === 'es') return value;
      const translated = local[locale]?.[key];
      if (!translated && process.env.CONTENT_INVENTORY_ONLY !== 'true') throw new Error(`Missing ${locale} translation: ${value.slice(0, 80)}`);
      return translated || value;
    };
    const { document } = scan(original, translate);
    const localizedPath = localPath(path, locale);
    document.documentElement.lang = locale === 'es' ? 'es-MX' : locale;
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (href.startsWith('/') && !href.startsWith('//') && !/^\/(?:assets|documents|fonts|_cms)\//.test(href)) link.setAttribute('href', localPath(href, locale));
    }
    const canonical = `https://bullandbear-insurancebroker.com${localizedPath}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', {es:'es_MX',en:'en_US',fr:'fr_FR',it:'it_IT',de:'de_DE',ru:'ru_RU'}[locale]);
    for (const other of locales) {
      const link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = other; link.href = `https://bullandbear-insurancebroker.com${localPath(path, other)}`; document.head.append(link);
    }
    const defaultLink = document.createElement('link'); defaultLink.rel = 'alternate'; defaultLink.hreflang = 'x-default'; defaultLink.href = `https://bullandbear-insurancebroker.com${path}`; document.head.append(defaultLink);
    const navigation = document.createElement('nav'); navigation.className = 'language-switch'; navigation.setAttribute('aria-label', {es:'Idiomas',en:'Languages',fr:'Langues',it:'Lingue',de:'Sprachen',ru:'Языки'}[locale]);
    for (const other of locales) {
      const link = document.createElement('a'); link.href = localPath(path, other); link.textContent = other.toUpperCase(); link.hreflang = other; link.lang = other; link.title = localeNames[other];
      if (locale === other) link.setAttribute('aria-current', 'page'); navigation.append(link);
    }
    document.querySelector('.concept-bar .container')?.replaceChildren(navigation);
    const script = document.querySelector('script[type="application/ld+json"]');
    if (script) {
      const schema = JSON.parse(script.textContent);
      for (const item of schema['@graph'] || []) if (item['@type'] === 'WebPage' || item['@type'] === 'Service') {
        item.url = canonical; item['@id'] = canonical; item.inLanguage = locale; item.name = document.title;
        if (item.description) item.description = document.querySelector('meta[name="description"]').content;
      }
      script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
    }
    document.querySelector('#interest-form')?.setAttribute('data-locale', locale);
    const output = locale === 'es' ? file : join(root, localizedPath, 'index.html');
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
  }
}
if (process.env.CONTENT_INVENTORY_ONLY === 'true') {
  await writeFile(new URL('../cms/content-inventory.json', import.meta.url), JSON.stringify([...inventory.values()], null, 2) + '\n');
}
const paths = htmlFiles.map(file => '/' + file.slice(root.length).replace(/index\.html$/, ''));
await writeFile(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${paths.flatMap(path => locales.map(locale => `<url><loc>https://bullandbear-insurancebroker.com${localPath(path,locale)}</loc>${locales.map(other=>`<xhtml:link rel="alternate" hreflang="${other}" href="https://bullandbear-insurancebroker.com${localPath(path,other)}"/>`).join('')}</url>`)).join('')}</urlset>`);
console.log(`Localized ${htmlFiles.length} pages in ${locales.length} languages (${inventory.size} content entries).`);
