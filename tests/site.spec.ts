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
test('contact validates consent, sends the correct locale and reports failures', async ({ page }) => {
  for (const locale of ['es', 'en', 'fr', 'it', 'de', 'ru']) {
    await page.goto(locale === 'es' ? '/contacto/' : `/${locale}/contact/`);
    let submitted: any;
    await page.route('**/api/contact', async route => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.locator('#name').fill('Website quality check');
    await page.locator('#email').fill('qa@example.com');
    await page.locator('#service').selectOption('general');
    await page.locator('.form-submit').click();
    expect(submitted).toBeUndefined();
    await page.locator('[name="consent"]').check();
    await page.locator('.form-submit').click();
    await expect(page.locator('#name')).toHaveValue('');
    expect(submitted).toEqual({name:'Website quality check',email:'qa@example.com',service:'general',consent:true,website:'',locale});
    await expect(page.locator('#form-message')).toHaveText(await page.locator('#interest-form').getAttribute('data-success') || '');
    await page.unroute('**/api/contact');
  }
  await page.route('**/api/contact', route => route.fulfill({status:503,body:'{}'}));
  await page.locator('#name').fill('Retry check');
  await page.locator('#email').fill('qa@example.com');
  await page.locator('#service').selectOption('general');
  await page.locator('[name="consent"]').check();
  await page.locator('.form-submit').click();
  await expect(page.locator('#form-message')).toHaveText(await page.locator('#interest-form').getAttribute('data-error') || '');
  await expect(page.locator('#name')).toHaveValue('Retry check');
});

for (const locale of ['en','fr','it','de','ru']) {
  test(`all ${locale} routes, language switching and mobile layout`, async ({ page, request }) => {
    const localized = (path: string) => `/${locale}${path.replace('/sobre-nosotros/', '/about/').replace('/contacto/', '/contact/').replace('/aviso-de-privacidad/', '/privacy/').replace('/reclutamiento/', '/careers/').replace('/blog/', '/insights/')}`;
    for (const path of routes) {
      const target = localized(path);
      expect((await request.get(target)).status(),target).toBe(200);
    }
    await page.goto(localized('/service/danos/'));
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(7);
    await page.locator('.language-switch a[lang="fr"]').click();
    await expect(page).toHaveURL(/\/fr\/service\/danos\/$/);
    for (const width of [1440,390,320]) {
      await page.setViewportSize({width,height:1000});
      for (const path of ['/','/contacto/','/service/lineas-financieras/','/aviso-de-privacidad/']) {
        await page.goto(localized(path));
        await page.evaluate(()=>document.fonts.ready);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),`${locale} ${path} ${width}`).toBe(true);
      }
      await page.goto(localized('/'));
      const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
      if (width===390) await page.screenshot({path:`test-results/home-${locale}.png`,fullPage:true});
    }
  });
}
