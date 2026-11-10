import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { parseHTML } from 'linkedom';
import { forms } from './forms.mjs';
const data=JSON.parse(await readFile('src/data/original-content.json','utf8'));
const audit=JSON.parse(await readFile('docs/source/content-2026-11-10/migration-audit.json','utf8'));
let snapshot;
try{snapshot=JSON.parse(gunzipSync(await readFile('docs/source/content-2026-11-10/pages.json.gz')));}catch{snapshot=JSON.parse(await readFile('docs/source/content-2026-11-10/pages.json','utf8'));}
const compact=value=>value.normalize('NFC').replace(/\s+/g,'');
const output=async path=>parseHTML(await readFile('dist'+(path==='/'?'/index.html':path+'index.html'),'utf8')).document;

test('every source widget is accounted for and every retained text is present on its page',async()=>{
 let verified=0;
 for(const page of audit.pages){const document=await output(page.path);
  for(const record of page.widgets){assert.ok(['retained','mapped','duplicate','decorative','excluded-theme'].includes(record.status),page.path+' '+record.id);
   if(record.status!=='retained')continue;
   const widget=document.querySelector(`[data-source-page="${page.path}"] [data-source-widget="${record.id}"]`);assert.ok(widget,`${page.path} #${record.id}`);
   for(const text of record.texts||[]){assert.ok(compact(widget.textContent).includes(compact(text)),`${page.path} #${record.id}: ${text}`);verified++;}
  }
 }
 assert.ok(verified>400,`Only ${verified} source blocks were checked.`);
});

test('original articles and privacy paragraphs are complete, without shortening',async()=>{
 for(const page of snapshot.filter(page=>page.path.includes('protege-a-tus-')||page.path.includes('todo-lo-que-')||page.path==='/aviso-de-privacidad/')){
  const source=parseHTML(page.html).document;
  const container=page.path==='/aviso-de-privacidad/'?source.querySelector('[data-id="c942cdb"]'):source.querySelector('.entry-content');assert.ok(container,page.path);
  const target=compact((await output(page.path)).querySelector('main').textContent);
  const paragraphs=[...container.querySelectorAll('p,li')].filter(el=>!el.parentElement.closest('p,li')).map(el=>el.textContent.trim()).filter(Boolean);
  assert.ok(paragraphs.length>10,page.path);
  for(const text of paragraphs)assert.ok(target.includes(compact(text)),`${page.path}: ${text}`);
 }
});

test('downloaded source assets match their recorded bytes and meaningful source images are rendered',async()=>{
 for(const asset of data.assets){const bytes=await readFile('public'+asset.path);assert.equal(bytes.length,asset.bytes,asset.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);}
 for(const [path,page]of Object.entries(data.pages)){
  const document=await output(path),source=parseHTML(snapshot.find(page=>page.path===path)?.html||'').document;
  const emptySlideImages=[...source.querySelectorAll('sr7-slide')].filter(slide=>!slide.querySelector('sr7-txt,a')).flatMap(slide=>[...slide.querySelectorAll('img[src]')].map(img=>new URL(img.getAttribute('src')).pathname));
  for(const widget of page.widgets)for(const image of widget.images){
   const asset=data.assets.find(asset=>asset.path===image.src);
   if(asset&&emptySlideImages.includes(new URL(asset.source).pathname))continue;
   assert.ok([...document.querySelectorAll('img')].some(img=>img.getAttribute('src')===image.src),`${path}: ${image.src}`);
  }
 }
 assert.equal(data.assets.filter(asset=>asset.kind==='document').length,2);
});

test('homepage preserves the approved Atelier hero and adds the source themes without dropping their content',async()=>{
 const source=parseHTML(snapshot.find(page=>page.path==='/').html).document,target=await output('/');
 assert.equal(target.querySelector('h1').innerHTML,'Lo que importa<br>no se deja<br><em>al azar.</em>');
 assert.equal(target.querySelector('#hero-subtitle').textContent,'Asesoría en seguros para proteger lo que has construido y todo lo que viene.');
 assert.equal(target.querySelector('[data-hero-image="0"]').getAttribute('src'),'/assets/architecture-hero.webp');
 assert.ok(!target.querySelector('[data-hero-image="0"]').hasAttribute('hidden'));
 assert.equal(target.querySelectorAll('[data-hero-control]').length,4);
 const meaningfulSlides=[...source.querySelectorAll('sr7-slide')].filter(slide=>slide.querySelector('sr7-txt'));
 for(const [index,slide]of meaningfulSlides.entries()){
  const bank=target.querySelector(`[data-hero-slide="${index+1}"]`),text=slide.querySelectorAll('sr7-txt');
  assert.equal(compact(bank.querySelector('[data-slide-title]').textContent),compact(text[1].textContent));
  assert.equal(compact(bank.querySelector('[data-slide-subtitle]').textContent),compact(text[0].textContent));
 }
 assert.deepEqual([...target.querySelectorAll('[data-home-section]')].map(section=>section.dataset.homeSection),['hero','company','approach','featured','personal','business','contact','articles']);
 const ids=['96d11b5','13bdf0e','74063de','ee60330','386e75f','3dba684','9c88eef','e497bb8','3fd6fb7','2068e2d','7a0d9ad','21e2e7d','999900f','c6a628d','ee9cca3','74977ed','19525c5','9ae026a','ebca75b','8e3c9cf','cb332dc','17c8a4b','ddfd51b','db57cd1','c72a1c4'];
 const positions=document=>[...document.querySelectorAll('[data-source-widget],[data-id]')].map(node=>node.dataset.sourceWidget||node.dataset.id).filter(id=>ids.includes(id));
 assert.deepEqual(positions(target),positions(source));
 for(const id of ['ee9cca3','8e3c9cf','c72a1c4']){
  const titles=[...source.querySelector(`[data-id="${id}"]`).querySelectorAll('h2,h3')].map(el=>compact(el.textContent));
  assert.deepEqual([...target.querySelector(`[data-source-widget="${id}"]`).querySelectorAll('h3')].map(el=>compact(el.textContent)),titles);
 }
});

test('original form choices and required contact fields are restored for every legacy route',async()=>{
 for(const [variant,config]of Object.entries(forms)){
  const page=snapshot.find(page=>page.path===config.path),source=parseHTML(page.html).document,target=await output(config.path);
  const choices=[...source.querySelectorAll('input[type="radio"]')].map(input=>input.getAttribute('value'));
  assert.deepEqual(config.choices.map(choice=>choice.label),choices,variant);
  for(const id of ['name','last-name','email'])assert.ok(target.querySelector('#'+id)?.hasAttribute('required'),variant+' '+id);
  assert.ok(target.querySelector('#phone'),variant+' phone');
  assert.equal(Boolean(target.querySelector('#message')),config.message,variant+' message');
 }
});

test('all six language versions keep their PDF links on the shared static document paths',async()=>{
 for(const locale of ['','en/','fr/','it/','de/','ru/']){
  for(const path of [locale?(locale+'about/'):'sobre-nosotros/',locale?(locale+'service/protector-de-capital-privado/'):'service/protector-de-capital-privado/']){
   const document=await output('/'+path);const links=[...document.querySelectorAll('a[download]')];assert.ok(links.length,path);
   for(const anchor of links){const href=anchor.getAttribute('href');assert.ok(href.startsWith('/documents/'),path+' '+href);assert.ok((await readFile('dist'+href)).subarray(0,5).equals(Buffer.from('%PDF-')));}
  }
 }
});
