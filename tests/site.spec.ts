import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
const services = JSON.parse(readFileSync(new URL('../src/data/services.json', import.meta.url), 'utf8'));
const posts = JSON.parse(readFileSync(new URL('../src/data/posts.json', import.meta.url), 'utf8'));
const forms = ['/formulario-danos/','/formulario-cuidado-de-personas/','/formulario-automoviles/','/contacto-lineas-financieras/'];
const routes = [...forms, '/', '/sobre-nosotros/', '/contacto/', '/aviso-de-privacidad/', '/reclutamiento/', '/blog/', ...services.map(s=>`/service/${s.slug}/`), ...posts.map(p=>`/${p.slug}/`)];
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
      await page.locator('.nav-products summary').click();
      await page.locator('.nav-product-links a').first().click();
      await expect(page).toHaveURL(/\/service\/lineas-financieras\/$/);
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
    await page.locator('#name').fill('Website');
    await page.locator('#last-name').fill('quality check');
    await page.locator('#phone').fill('+52 55 1510 0605');
    await page.locator('#message').fill('Consulta de prueba');
    await page.locator('#email').fill('qa@example.com');
    await page.locator('#service').selectOption('personal');
    await page.locator('.form-submit').click();
    expect(submitted).toBeUndefined();
    await page.locator('[name="consent"]').check();
    await page.locator('.form-submit').click();
    await expect(page.locator('#name')).toHaveValue('');
    expect(submitted).toEqual({name:'Website quality check',first_name:'Website',last_name:'quality check',phone:'+52 55 1510 0605',message:'Consulta de prueba',form:'general',insurance_type:'personal',email:'qa@example.com',service:'personal',consent:true,website:'',locale});
    await expect(page.locator('#form-message')).toHaveText(await page.locator('#interest-form').getAttribute('data-success') || '');
    await page.unroute('**/api/contact');
  }
  await page.route('**/api/contact', route => route.fulfill({status:503,body:'{}'}));
  await page.locator('#name').fill('Retry check');
  await page.locator('#last-name').fill('User');
  await page.locator('#email').fill('qa@example.com');
  await page.locator('#service').selectOption('personal');
  await page.locator('[name="consent"]').check();
  await page.locator('.form-submit').click();
  await expect(page.locator('#form-message')).toHaveText(await page.locator('#interest-form').getAttribute('data-error') || '');
  await expect(page.locator('#name')).toHaveValue('Retry check');
});

test('homepage slider uses the translated source messages and original destinations', async ({page})=>{
  for(const locale of ['', 'en/', 'fr/', 'it/', 'de/', 'ru/']) {
    await page.goto('/'+locale);
    const bank=page.locator('[data-hero-slide]');
    for(const index of [1,2,0]) {
      const slide=bank.nth(index);
      await page.locator(`[data-hero-control="${index}"]`).click();
      await expect(page.locator('#hero-title')).toHaveText(await slide.locator('[data-slide-title]').innerText());
      await expect(page.locator('#hero-subtitle')).toHaveText(await slide.locator('[data-slide-subtitle]').innerText());
      await expect(page.locator('#hero-contact')).toHaveAttribute('href',await slide.locator('a').getAttribute('href')||'');
      await expect(page.locator('[data-hero-image]:visible')).toHaveCount(1);
      await expect(page.locator(`[data-hero-image="${index}"]`)).toBeVisible();
      await expect(page.locator(`[data-hero-control="${index}"]`)).toHaveAttribute('aria-pressed','true');
    }
    await page.locator('.nav-products summary').click();
    await expect(page.locator('.nav-product-links')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.nav-product-links')).toBeHidden();
  }
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

test('specialized original forms retain their fields and submit their selected insurance type', async ({page})=>{
 for(const prefix of ['', '/fr'])for(const path of forms){
  await page.goto(prefix+path);
  let payload:any;
  await page.route('**/api/contact',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'});});
  await page.locator('#name').fill('Cliente');await page.locator('#last-name').fill('Prueba');await page.locator('#email').fill('qa@example.com');await page.locator('#phone').fill('+52 55 1510 0605');
  if(await page.locator('#service').count())await page.locator('#service').selectOption({index:1});
  if(await page.locator('#message').count())await page.locator('#message').fill('Información completa de la solicitud.');
  await page.locator('[name="consent"]').check();await page.locator('.form-submit').click();await expect(page.locator('#name')).toHaveValue('');
  expect(payload.last_name).toBe('Prueba');expect(payload.phone).toBe('+52 55 1510 0605');expect(payload.locale).toBe(prefix?'fr':'es');expect(payload.form).not.toBe('general');expect(payload.insurance_type).toBeTruthy();
  await page.unroute('**/api/contact');
 }
});
