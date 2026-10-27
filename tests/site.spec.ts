import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const services = JSON.parse(readFileSync(new URL('../src/data/services.json', import.meta.url), 'utf8'));
const posts = JSON.parse(readFileSync(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const routes = ['/', '/sobre-nosotros/', '/contacto/', '/aviso-de-privacidad/', '/reclutamiento/', '/blog/', ...services.map(s=>`/service/${s.slug}/`), ...posts.map(p=>`/${p.slug}/`)];
test('all pages, SEO, structured data and internal links', async ({ page, request }) => {
  const links = new Set<string>();
  for (const path of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://bullandbear-insurancebroker.com${path}`);
    expect((await page.title()).length).toBeGreaterThan(15);
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc?.length).toBeGreaterThan(20);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    expect(schema['@graph'][0]['@type']).toBe('InsuranceAgency');
    for (const href of await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(n=>n.getAttribute('href')!))) links.add(href.split('#')[0]);
  }
  for (const href of links) expect((await request.get(href || '/')).status(), href).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of routes) expect(sitemap).toContain(`<loc>https://bullandbear-insurancebroker.com${path}</loc>`);
});
for (const width of [1440, 390, 320, 768]) {
  test(`layout and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/contacto/', '/service/lineas-financieras/', '/aviso-de-privacidad/']) {
      await page.goto(path);
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    }
    await page.goto('/');
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    if (width <= 900) {
      await page.getByRole('button', {name:'Abrir menú'}).click();
      await expect(page.locator('#primary-navigation')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#primary-navigation')).toBeHidden();
      await page.getByRole('button',{name:'Abrir menú'}).click();
      await page.locator('#primary-navigation a[href="#soluciones"]').click();
      await expect(page.locator('#primary-navigation')).toBeHidden();
    }
  });
}
test('demo form validates consent and never sends data', async ({ page }) => {
  await page.goto('/#contacto');
  const requests: string[] = [];
  page.on('request',r=>{if(r.method()!=='GET')requests.push(r.url());});
  await page.locator('#name').fill('Prueba de demostración');
  await page.locator('#email').fill('demo@example.com');
  await page.locator('#service').selectOption({label:'Asesoría general'});
  await page.getByRole('button',{name:'Probar formulario'}).click();
  await expect(page.locator('#form-message')).toBeEmpty();
  await page.locator('[name="consent"]').check();
  await page.getByRole('button',{name:'Probar formulario'}).click();
  await expect(page.locator('#form-message')).toContainText('No se ha enviado ni guardado');
  await expect(page.locator('#name')).toHaveValue('');
  expect(requests).toEqual([]);
  expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
  await page.locator('.faq-item summary').nth(1).click();
  await expect(page.locator('.faq-item').nth(1)).toHaveAttribute('open', '');
});
