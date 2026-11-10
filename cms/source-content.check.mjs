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

test('downloaded source assets match their recorded bytes and every retained image is rendered',async()=>{
 for(const asset of data.assets){const bytes=await readFile('public'+asset.path);assert.equal(bytes.length,asset.bytes,asset.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.path);}
 for(const [path,page]of Object.entries(data.pages)){const document=await output(path);for(const widget of page.widgets)for(const image of widget.images)assert.ok([...document.querySelectorAll('img')].some(img=>img.getAttribute('src')===image.src),`${path}: ${image.src}`);}
 assert.equal(data.assets.filter(asset=>asset.kind==='document').length,2);
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
