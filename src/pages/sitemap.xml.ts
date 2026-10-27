import { site } from '../lib/site';
import services from '../data/services.json';
import posts from '../data/posts.json';
export function GET() {
  const paths = ['/', '/sobre-nosotros/', '/contacto/', '/aviso-de-privacidad/', '/reclutamiento/', '/blog/', ...services.map(s => `/service/${s.slug}/`), ...posts.map(p => `/${p.slug}/`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${site.url}${path}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
