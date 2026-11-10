// Restore the approved architectural hero only when the last migration selected its cyber image.
import { readFile } from 'node:fs/promises';
import { api, hash } from './lib.mjs';
import deployment from './deployment.json' with { type:'json' };
import original from '../src/data/original-content.json' with { type:'json' };
const { PUBLIC_URL:base, ADMIN_TOKEN:token }=process.env;
if(base!==deployment.url||!token)throw Error('Use this project’s Directus Railway environment.');
const row=await api(base,token,'/items/site_media/hero');
const current=await fetch(base+'/assets/'+row.image,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
if(!current.ok)throw Error('Cannot verify the existing homepage image.');
const bytes=Buffer.from(await current.arrayBuffer());
const cyber=original.pages['/'].widgets.find(widget=>widget.id==='96d11b5').images[0];
if(row.title!=='Protección de datos · portada'||hash(bytes)!==hash(await readFile('public'+cyber.src))){
 console.log('Existing homepage image preserved: it is not the last migration’s cyber replacement.');
}else{
 const file=await readFile('public/assets/architecture-hero.webp'),form=new FormData();
 form.set('title','Arquitectura · portada');form.set('file',new Blob([file],{type:'image/webp'}),'architecture-hero.webp');
 const response=await fetch(base+'/files',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form,signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Cannot upload the original homepage image.');
 const uploaded=(await response.json()).data;
 await api(base,token,'/items/site_media/hero','PATCH',{title:'Arquitectura · portada',image:uploaded.id});
 console.log('Approved architectural hero restored; source cyber image remains on its additional slide.');
}
