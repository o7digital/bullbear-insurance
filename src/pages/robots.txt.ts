import { site, indexable } from '../lib/site';
export function GET() {
  return new Response(indexable ? `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
