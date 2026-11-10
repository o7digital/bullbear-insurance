import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import deployment from './deployment.json' with { type: 'json' };
import sourceContent from '../src/data/original-content.json' with { type: 'json' };
import { api, hash, locales, textId } from './lib.mjs';
const base = process.env.PUBLIC_URL;
const token = process.env.ADMIN_TOKEN;
if (base !== deployment.url || !token) throw new Error('Run with this project’s Directus Railway environment.');
const request = (path, method, body) => api(base, token, path, method, body);
const field = (name, type = 'string', meta = {}, schema = {}) => ({ field: name, type, meta: { interface: type === 'text' ? 'input-multiline' : 'input', ...meta }, schema: { is_nullable: true, ...(type === 'string' ? { max_length: 2000 } : {}), ...schema } });
const definitions = {
  site_texts: { icon: 'translate', label: 'Contenidos y traducciones', fields: [field('key'),field('source','text'),field('value','text'),field('draft_value','text'),field('locale'),field('section'),field('page'),field('source_hash'),field('draft_source_hash'),field('status','string', { interface:'select-dropdown', options:{choices:[{text:'Publicado',value:'published'},{text:'Archivado',value:'archived'}]} },{default_value:'published'})] },
  inquiries: { icon: 'inbox', label: 'Solicitudes de asesoría', fields: [field('name'),field('first_name'),field('last_name'),field('email'),field('phone'),field('message','text'),field('form_kind'),field('insurance_type'),field('service'),field('locale'),field('consent','boolean'),field('consent_version'),field('received_at','timestamp',{interface:'datetime'}),field('status','string',{interface:'select-dropdown',options:{choices:[{text:'Nueva',value:'new'},{text:'En seguimiento',value:'in_progress'},{text:'Resuelta',value:'resolved'}]}},{default_value:'new'}),field('notes','text')] },
  site_media: { icon: 'photo_library', label:'Identidad e imágenes', fields:[field('title'),field('key'),field('image','uuid',{interface:'file-image',special:['file']})] }
};
const collections = await request('/collections');
for (const [name, definition] of Object.entries(definitions)) {
  if (!collections.some(row => row.collection === name)) {
    await request('/collections', 'POST', { collection:name, schema:{}, meta:{icon:definition.icon,display_template:name==='site_texts'?'{{locale}} · {{section}} · {{value}}':'{{name}}{{title}}',translations:[{language:'es-ES',translation:definition.label}]}, fields:[field('id','string',{hidden:true},{is_primary_key:true,is_nullable:false,max_length:100}),...definition.fields] });
    if(name==='site_media')await request('/relations','POST',{collection:name,field:'image',related_collection:'directus_files',schema:{on_delete:'SET NULL'}});
    console.log('Created',name);
  } else {
    const existing=await request('/fields/'+name);
    for(const definitionField of definition.fields)if(!existing.some(row=>row.field===definitionField.field))await request('/fields/'+name,'POST',definitionField);
  }
}
const inventory = JSON.parse(await readFile('cms/content-inventory.json','utf8'));
const translations = JSON.parse(await readFile('src/data/translations.json','utf8'));
const existingTexts = await request('/items/site_texts?fields=id,section,page&limit=-1');
const current = new Set(existingTexts.map(row=>row.id));
const rows = inventory.flatMap(source => locales.map(locale => ({ id:textId(source.key,locale),key:source.key,source:source.value,value:locale==='es'?source.value:translations[locale]?.[source.key],locale,section:source.section,page:source.page,source_hash:hash(source.value),status:'published' })));
if(rows.some(row=>!row.value))throw new Error('Translation catalogue is incomplete.');
const pending=rows.filter(row=>!current.has(row.id));
for(let i=0;i<pending.length;i+=100)await request('/items/site_texts','POST',pending.slice(i,i+100));
console.log('Content seeded:',pending.length,'new records; existing content preserved.');
const metadata=rows.filter(row=>{const previous=existingTexts.find(item=>item.id===row.id);return previous&&(previous.section!==row.section||previous.page!==row.page);}).map(({id,section,page})=>({id,section,page}));
for(let i=0;i<metadata.length;i+=100)await request('/items/site_texts','PATCH',metadata.slice(i,i+100));
await request('/settings','PATCH',{project_name:'Bull & Bear · Insurance Studio',project_color:'#9d7952',default_language:'es-ES',public_registration:false,custom_css:':root{--theme--primary:#9d7952;--theme--background:#f7f5ee;}'});

const policies=await request('/policies?limit=-1'), roles=await request('/roles?limit=-1'), permissions=await request('/permissions?limit=-1');
async function identity(name, variable, grants, admin=false) {
  let policy=policies.find(row=>row.name===name);
  if(!policy)policy=await request('/policies','POST',{name,icon:name==='Website build'?'public':'inbox',admin_access:false,app_access:admin});
  for(const [collection,actions,fields]of grants)for(const action of actions)if(!permissions.some(row=>row.policy===policy.id&&row.collection===collection&&row.action===action))await request('/permissions','POST',{policy:policy.id,collection,action,permissions:{},fields:['*']});
  let role=roles.find(row=>row.name===name);
  if(!role)role=await request('/roles','POST',{name,policies:[{policy:policy.id}]});
  const user=await request(`/users?filter[first_name][_eq]=${encodeURIComponent(name)}&limit=-1`);
  if(!user.length)await request('/users','POST',{first_name:name,role:role.id,status:'active',token:process.env[variable]});
  return role;
}
await identity('Website build','WEBSITE_READ_TOKEN', [['site_texts',['read'],['id','key','source','value','locale','source_hash','status']],['site_media',['read'],['*']],['directus_files',['read'],['*']]]);
await identity('Website contact','CONTACT_WRITE_TOKEN',[['inquiries',['create'],['id','name','email','service','locale','consent','consent_version','received_at','status']]]);
// No anonymous permissions are granted. All website access goes through server credentials.
console.log('Private build reader and create-only contact identity are ready.');

const media=await request('/items/site_media?limit=-1');
const heroPath='public'+sourceContent.pages['/'].widgets.find(widget=>widget.id==='96d11b5').images[0].src;
for(const [key,title,path,mime]of [['hero','Protección de datos · portada',heroPath,'image/jpeg'],['logo','Logo oficial blanco','public/assets/client-logo-light.png','image/png']]) {
 if(media.some(row=>row.key===key))continue;
 const bytes=await readFile(path),form=new FormData();form.set('title',title);form.set('file',new Blob([bytes],{type:mime}),path.split('/').pop());
 const response=await fetch(base+'/files',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
 if(!response.ok)throw new Error(`Media upload failed (${response.status}). Check Railway volume ownership.`);
 const image=(await response.json()).data.id;
 await request('/items/site_media','POST',{id:key,key,title,image});
}
console.log('Brand assets imported.');
