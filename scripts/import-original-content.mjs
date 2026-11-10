import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';
import { parseHTML } from 'linkedom';
import { gunzipSync } from 'node:zlib';
const snapshotPath='docs/source/content-2026-11-10/pages.json.gz';
const snapshots=JSON.parse(gunzipSync(await readFile(snapshotPath)));
const services=JSON.parse(await readFile('src/data/services.json','utf8'));
const posts=JSON.parse(await readFile('src/data/posts.json','utf8'));
const sourceOrigin='https://bullandbear-insurancebroker.com';
const normalize=value=>value.replace(/\s+/g,' ').trim();
const digest=value=>createHash('sha256').update(value).digest('hex');
const shared=new Set(['3fb9687','f265490','402a48d','032e77b','d2e5690','3fa5aad','65fd842','212e6e1','b8e468e','7ea207b','742aef7','362d5f4','eb6a238','b280d1c','a432441','6342b92','9befb88','a11c6a0']);
const homepageInline=new Set(['74063de','ee60330','386e75f','3dba684']);
const homepageKeep=new Set(['96d11b5','13bdf0e','9c88eef','e497bb8','3fd6fb7','2068e2d','7a0d9ad','21e2e7d','999900f','c6a628d','ee9cca3','74977ed','19525c5','9ae026a','ebca75b','8e3c9cf','cb332dc','17c8a4b','ddfd51b','db57cd1','c72a1c4']);
const homepageDuplicate=new Set(['be077ae','f7c6589']);
const home=snapshots.find(page=>page.path==='/');
const data={pages:{},shared:{},assets:[]};
const audit={source:sourceOrigin,retrieved:'2026-11-10',pages:[],brokenSourceLinks:[],notes:['Reclutamiento returns HTTP 404 on the origin; its full published WordPress content is recovered from the 2026-11-09 API snapshot.','The origin links to cyber product ID 8856 and pet insurance pages that return 404; their visible teasers are retained and their quote buttons point to the relevant working contact form.']};
const assets=new Map();
function sourceText(node){const copy=node.cloneNode(true);for(const br of copy.querySelectorAll('br'))br.replaceWith(' ');return normalize(copy.textContent);}
function formLink(path){if(/automoviles|car-insurance|flotillas/.test(path))return '/formulario-automoviles/';if(/lineas-financieras|capital-privado|responsabilidad-civil/.test(path))return '/contacto-lineas-financieras/';if(/cuidado|vida|hogar|medico/.test(path))return '/formulario-cuidado-de-personas/';return path.startsWith('/service/')?'/formulario-danos/':'/contacto/';}
function canonicalAsset(url){const parsed=new URL(url,sourceOrigin);parsed.protocol='https:';return parsed.href;}
function asset(url,kind='image'){
 const source=canonicalAsset(url);if(!source.startsWith(sourceOrigin+'/wp-content/uploads/'))throw Error('Unexpected source asset '+source);
 if(!assets.has(source)){const name=basename(new URL(source).pathname).normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-');assets.set(source,{source,path:(kind==='document'?'/documents/':'/assets/original/')+digest(source).slice(0,12)+'-'+name,kind});}
 return assets.get(source).path;
}
function link(href,path,widget){if(!href||href==='#'||href.startsWith('#')){
 if(path==='/'&&widget==='e497bb8')return '/contacto-lineas-financieras/';
 if(path==='/'&&['21e2e7d','be077ae'].includes(widget))return '/service/beneficios-para-empleados/';
 return formLink(path);
 }
 const parsed=new URL(href,sourceOrigin);if(parsed.hostname==='bullandbear-insurancebroker.com'){
 if(parsed.pathname.endsWith('.pdf'))return asset(parsed.href,'document');
 if(parsed.searchParams.has('post_type')){audit.brokenSourceLinks.push({source:parsed.href,target:'/contacto-lineas-financieras/'});return '/contacto-lineas-financieras/';}
 if(/mascota/.test(parsed.pathname)){audit.brokenSourceLinks.push({source:parsed.href,target:'/formulario-cuidado-de-personas/'});return '/formulario-cuidado-de-personas/';}
 return parsed.pathname+parsed.hash;
 }
 if(!['https:','http:','mailto:','tel:'].includes(parsed.protocol))return formLink(path);
 if(parsed.protocol==='http:')parsed.protocol='https:';return parsed.href;
}
function altFor(img){const name=img.src.toLowerCase();if(name.includes('axa'))return 'AXA';if(name.includes('atlas'))return 'Seguros Atlas';if(name.includes('qualitas'))return 'Quálitas';if(name.includes('ana-'))return 'ANA Seguros';if(name.includes('sura'))return 'SURA';if(name.includes('zurich'))return 'Zurich';if(name.includes('banorte'))return 'Seguros Banorte';return normalize(img.alt||'');}
function extract(widget,path){
 const {document}=parseHTML('<html><body>'+widget.html+'</body></html>');for(const element of document.querySelectorAll('script,style,noscript,form,image_lists'))element.remove();
 const blocks=[];
 if(widget.type==='shortcode.default'){
  for(const slide of document.querySelectorAll('sr7-slide'))for(const element of slide.querySelectorAll('sr7-txt,a')){const text=sourceText(element);if(text)blocks.push(element.tagName==='A'?{tag:'a',text,href:link(element.getAttribute('href'),path,widget.id)}:{tag:'p',text});}
 }else{
  const nodes=[...document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')].filter(node=>!node.parentElement.closest('h1,h2,h3,h4,h5,h6,p,li'));
  for(const node of nodes){const text=sourceText(node);if(!text)continue;blocks.push({tag:/^H\d$/.test(node.tagName)&&text.length<160?'h2':node.tagName==='LI'?'li':'p',text});}
  if(!nodes.length){const text=sourceText(document.body);if(text)blocks.push({tag:'p',text});}
  const remainder=document.body.cloneNode(true);for(const node of remainder.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,img,svg'))node.remove();const remainderText=sourceText(remainder);if(remainderText)blocks.push({tag:'p',text:remainderText});
  for(const anchor of document.querySelectorAll('a[href]')){const text=sourceText(anchor);if(!text)continue;const href=link(anchor.getAttribute('href'),path,widget.id);if(!blocks.some(block=>block.tag==='a'&&block.text===text&&block.href===href))blocks.push({tag:'a',text,href});}
 }
 const images=[];
 for(const img of widget.images){if(!img.src||!img.src.includes('/wp-content/uploads/')||Number(img.width)===0&&img.width!==null)continue;const src=asset(img.src);if(!images.some(row=>row.src===src))images.push({src,alt:altFor(img)});}
 for(const element of document.querySelectorAll('[style]'))for(const match of element.getAttribute('style').matchAll(/background-image:\s*url\(['\"]?([^)'\"]+)['\"]?\)/g)){if(!match[1].includes('/wp-content/uploads/'))continue;const src=asset(match[1]);if(!images.some(image=>image.src===src))images.push({src,alt:''});}
 return {id:widget.id,type:widget.type,blocks,images};
}
for(const page of snapshots){
 const records=[],widgets=[];
 for(const widget of page.widgets){
  let status='retained',reason='',target=page.path;
  if(shared.has(widget.id)){status='mapped';reason='Shared header, footer, contact details and social link';target='/#footer';}
  else if(widget.type==='spacer.default'||(!widget.text&&!widget.images.length&&!widget.links.length)){status='decorative';reason='Empty layout or spacer';}
  else if(page.path==='/'&&homepageInline.has(widget.id)){status='mapped';reason='Original full text used in the existing philosophy/process sections';target=widget.id==='74063de'?'/#filosofia':'/#enfoque';}
  else if(page.path==='/sobre-nosotros/'&&['8b2b24b','b7fe846','401bf1c'].includes(widget.id)){status='duplicate';reason='Repeated excerpt of this same page; complete presentation is retained above';target='/sobre-nosotros/';}
  else if(page.path==='/'&&homepageDuplicate.has(widget.id)){status='duplicate';reason='Exact repeated employee-benefit module; retained in its first occurrence';target='/#original-content';}
  else if(page.path==='/'&&['ee1de64','789cabc'].includes(widget.id)){status='mapped';reason='Insurer logos restored in the shared partner section';target='/#partners';}
  else if(page.path==='/'&&!homepageKeep.has(widget.id)){status='excluded-theme';reason='WordPress theme demo: fabricated reviews/team, broken demo forms, placeholder number, empty newsletter or Lorem ipsum';}
  else if(/testimonial|team-slider|header-offcanvas|instive-cf-form/.test(widget.type)||/Lorem ipsum|945\+ Reviews|Already member\?|Since 1914|Hello everyone Mett|Not sure what you need\?|^Learn more$/.test(widget.text)){status='excluded-theme';reason='Unmodified WordPress theme placeholder or demonstration content';}
  else if(['5bfa3bf','95291a2','497a07e'].includes(widget.id)){status='mapped';reason='Office address, phone and email retained in contact layouts, with normalized punctuation and a working map link';target='/contacto/#office';}
  else if(widget.type==='google_maps.default'){status='mapped';reason='Office location retained as address and a working map link';target='/contacto/#office';}
  else if(widget.type==='html.default'&&page.forms.length){status='mapped';reason='Original form fields, insurance choices and message restored in the native contact form';target=page.path+'#interest-form';}
  else if(widget.id==='4c035824'){status='mapped';reason='Related-product heading retained by the service layout';target=page.path+'#related-solutions';}
  else if(page.path.startsWith('/aviso-de-privacidad')||page.path.includes('protege-a-tus-')||page.path.includes('todo-lo-que-')){status='mapped';reason='Complete original article/privacy text retained in its dedicated page';}
  else if(widget.id==='62130e91'&&widget.text.includes('Lorem')){status='excluded-theme';reason='Demo assistance widget contains placeholder text';}
  const record={id:widget.id,type:widget.type,status,reason,target,text:widget.text.replace(/window\.SR7[\s\S]*/, '').trim()};
  if(status==='retained'){const extracted=extract(widget,page.path);if(extracted.blocks.length||extracted.images.length){widgets.push(extracted);record.texts=extracted.blocks.map(b=>b.text);}else{record.status='decorative';record.reason='No visible meaningful content';}}
  records.push(record);
 }
 data.pages[page.path]={title:page.title.replace(/ - Bull and Bear Insurance Broker$/,''),widgets};
 audit.pages.push({path:page.path,source:page.url,sha256:digest(page.html),widgets:records});
}
// Shared original content, always visible without duplicating the legacy theme.
data.shared.partnerHeading=home.widgets.find(w=>w.id==='ee1de64').text;
data.shared.partners=extract(home.widgets.find(w=>w.id==='789cabc'),'/').images;
data.shared.philosophy=extract(home.widgets.find(w=>w.id==='74063de'),'/').blocks[0].text;
data.shared.process=['ee60330','3dba684','386e75f'].map(id=>extract(home.widgets.find(w=>w.id===id),'/'));
data.shared.footer={question:home.widgets.find(w=>w.id==='3fa5aad').text,availability:home.widgets.find(w=>w.id==='212e6e1').text,corporate:home.widgets.find(w=>w.id==='b8e468e').text,office:home.widgets.find(w=>w.id==='742aef7').text,copyright:home.widgets.find(w=>w.id==='a432441').text,facebook:'https://www.facebook.com/BullBearInsuranceBroker'};
// Blog featured images are meaningful source media outside Elementor widgets.
for(const post of posts){const snapshot=snapshots.find(page=>page.path==='/'+post.slug+'/');const{document}=parseHTML(snapshot.html);const image=[...document.querySelectorAll('img[src]')].find(img=>img.getAttribute('src').includes('/2023/06/familia'));if(image)post.image=asset(image.getAttribute('src'));}
await mkdir('public/assets/original',{recursive:true});await mkdir('public/documents',{recursive:true});
const downloads=[...assets.values()];let cursor=0;
async function download(){while(cursor<downloads.length){const row=downloads[cursor++];const path='public'+row.path;let bytes;try{bytes=await readFile(path);}catch{let response;for(let attempt=0;attempt<3;attempt++){response=await fetch(row.source,{signal:AbortSignal.timeout(45000)});if(response.ok)break;}if(!response?.ok){if(response?.status===404&&row.kind==='image'){row.unavailable=true;row.status=404;continue;}throw Error('Source media unavailable: '+row.source);}bytes=Buffer.from(await response.arrayBuffer());if(row.kind==='document'&&!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid PDF: '+row.source);await writeFile(path,bytes);}row.bytes=bytes.length;row.sha256=digest(bytes);}}
await Promise.all([download(),download(),download()]);const unavailable=new Set(downloads.filter(row=>row.unavailable).map(row=>row.path));for(const page of Object.values(data.pages))for(const widget of page.widgets)widget.images=widget.images.filter(image=>!unavailable.has(image.src));data.shared.partners=data.shared.partners.filter(image=>!unavailable.has(image.src));data.assets=downloads.filter(row=>!row.unavailable);
await writeFile('src/data/original-content.json',JSON.stringify(data,null,2)+'\n');await writeFile('src/data/posts.json',JSON.stringify(posts,null,2)+'\n');
audit.brokenSourceLinks=[...new Map(audit.brokenSourceLinks.map(row=>[row.source,row])).values()];audit.assets=downloads;await writeFile('docs/source/content-2026-11-10/migration-audit.json',JSON.stringify(audit,null,2)+'\n');
console.log('Imported',Object.keys(data.pages).length,'source pages;',downloads.length,'media/documents;',Object.values(data.pages).reduce((n,p)=>n+p.widgets.reduce((m,w)=>m+w.blocks.length,0),0),'original text blocks.');
