import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
const base=process.env.STUDIO_TEST_URL||'https://studio-production-2fc1.up.railway.app';
if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)throw Error('Use the Directus Railway environment.');
await mkdir('test-results',{recursive:true});const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base);await page.locator('#email').fill(process.env.ADMIN_EMAIL);await page.locator('#password').fill(process.env.ADMIN_PASSWORD);await page.locator('#login-form button').click();await expect(page.locator('#app')).toBeVisible({timeout:30000});
 for(const view of ['dashboard','pages','services','articles','translations','inquiries','media','publish']){
  await page.locator(`#navigation a[data-view="${view}"]`).click();await page.waitForTimeout(500);
  await expect(page.locator('#title')).not.toBeEmpty();
  if(view==='media')await expect(page.locator('.media-image')).toHaveCount(2,{timeout:20000});
  if(view==='services')await expect(page.locator('.page-card')).toHaveCount(17);
  if(view==='articles')await expect(page.locator('.page-card')).toHaveCount(3);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
  expect(violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),view).toEqual([]);
  if(view==='dashboard')await page.screenshot({path:'test-results/studio-desktop.png',fullPage:true});
 }
 await page.locator('#navigation a[data-view="pages"]').click();await page.getByRole('button',{name:/Inicio y elementos compartidos/}).click();await expect(page.locator('.editor-item')).not.toHaveCount(0);
 const all=await (await page.request.get(base+'/api/content')).json();const source=all.data.find(row=>row.locale==='es'&&row.value==='Misión');
 const version=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source.draft_value??source.value)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const saved=await page.request.patch(base+'/api/content',{headers:{Origin:base},data:{key:source.key,value:source.value,version},timeout:180000});expect(saved.status(),await saved.text()).toBe(200);
 const changed=await (await page.request.get(base+'/api/content')).json();expect(changed.data.filter(row=>row.key===source.key&&row.draft_value!==null)).toHaveLength(6);expect(changed.data.find(row=>row.id===source.id).value).toBe(source.value);
 const discarded=await page.request.post(base+'/api/discard',{headers:{Origin:base},data:{key:source.key}});expect(discarded.status()).toBe(200);
 console.log('Live draft, automatic translation and discard verified.');
 await page.setViewportSize({width:390,height:900});await page.goto(base+'/#dashboard');await expect(page.locator('#app')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/studio-mobile.png',fullPage:true});
 await page.locator('.sidebar-toggle').click();await expect(page.locator('#app')).toHaveClass(/nav-open/);await page.keyboard.press('Escape');await expect(page.locator('#app')).not.toHaveClass(/nav-open/);
 expect(errors).toEqual([]);console.log('Studio login, eight screens, 17 services, three article pages, media, mobile navigation and private session verified.');
}finally{await browser.close();}
