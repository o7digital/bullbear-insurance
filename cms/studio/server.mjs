import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { api, hash, textId, locales } from '../lib.mjs';
import { translate, safeText } from '../translations.mjs';

export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function validateContact(input) {
  if(!input || typeof input!=='object')throw new HttpError(400,'Invalid request');
  if(input.website)return null;
  const name=typeof input.name==='string'?input.name.trim():'';
  const email=typeof input.email==='string'?input.email.trim():'';
  if(name.length<2||name.length>100||/[<>\r\n]/.test(name)||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||input.consent!==true||!['personal','business','financial','general'].includes(input.service)||!locales.includes(input.locale))throw new HttpError(400,'Invalid contact details');
  return {id:randomBytes(16).toString('hex'),name,email,service:input.service,locale:input.locale,consent:true,consent_version:'2026-11-09',received_at:new Date().toISOString(),status:'new'};
}
export function createStudio(config={}) {
  const options={cms:process.env.DIRECTUS_URL,secret:process.env.STUDIO_SECRET,origin:process.env.STUDIO_ORIGIN,contactSecret:process.env.CONTACT_PROXY_SECRET,contactToken:process.env.CONTACT_WRITE_TOKEN,hook:process.env.VERCEL_PREVIEW_DEPLOY_HOOK,preview:'https://bullbear-insurance-preview.vercel.app',secure:process.env.NODE_ENV==='production',...config};
  if(!options.secret)throw new Error('STUDIO_SECRET is required.');
  const encryptionKey=createHash('sha256').update(options.secret).digest();
  const request=options.api || ((path,token,method,body)=>api(options.cms,token,path,method,body));
  const attempts=new Map(); let writing=false;
  function limited(key,max=10) {
    const now=Date.now();
    for(const [k,v]of attempts)if(v.until<now)attempts.delete(k);
    const row=attempts.get(key)||{count:0,until:now+600000};row.count++;attempts.set(key,row);
    if(row.count>max)throw new HttpError(429,'Demasiados intentos. Inténtalo más tarde.');
  }
  function seal(value) {
    const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey,iv);
    const bytes=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);
    return Buffer.concat([iv,cipher.getAuthTag(),bytes]).toString('base64url');
  }
  function session(req) {
    const value=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('bb_studio='))?.slice(10);
    if(!value||value.length>6000)return null;
    try {const bytes=Buffer.from(value,'base64url'),cipher=createDecipheriv('aes-256-gcm',encryptionKey,bytes.subarray(0,12));cipher.setAuthTag(bytes.subarray(12,28));const data=JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]));return data.until>Date.now()?data:null;}catch{return null;}
  }
  function cookie(res,value) {res.setHeader('Set-Cookie',`bb_studio=${value?seal(value):''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value?604800:0}${options.secure?'; Secure':''}`);}
  function send(res,status,data) {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
  async function body(req,max=100000) {
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>max)throw new HttpError(413,'El archivo o la solicitud es demasiado grande.');chunks.push(chunk);}
    try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw new HttpError(400,'Invalid JSON');}
  }
  async function authorize(req,res) {
    let current=session(req);
    if(!current)throw new HttpError(401,'Inicia sesión para continuar.');
    if(current.expires<Date.now()+30000) {
      try { const refreshed=await request('/auth/refresh',null,'POST',{refresh_token:current.refresh,mode:'json'});current={...current,access:refreshed.access_token,refresh:refreshed.refresh_token,expires:Date.now()+refreshed.expires};cookie(res,current); }
      catch {cookie(res,null);throw new HttpError(401,'La sesión ha caducado. Vuelve a iniciar sesión.');}
    }
    // Recheck access on every request, so revocations apply to existing sessions.
    const user=await request('/users/me?fields=id,email,first_name,role.id,role.policies.policy.admin_access,policies.policy.admin_access',current.access);
    const admin=[...(user.role?.policies||[]),...(user.policies||[])].some(row=>row.policy?.admin_access);
    if(!admin && (!options.editorRole || user.role?.id!==options.editorRole))throw new HttpError(403,'Esta cuenta no tiene acceso al Studio.');
    return {...current,user};
  }
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/health')return send(res,200,{ok:true});
      if(path==='/api/contact'&&req.method==='POST') {
        const expected=Buffer.from(`Bearer ${options.contactSecret||''}`),actual=Buffer.from(req.headers.authorization||'');
        if(!options.contactSecret||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new HttpError(403,'Forbidden');
        limited('contact:'+hash(req.headers['x-contact-client']||req.socket.remoteAddress||''),5);
        const inquiry=validateContact(await body(req,4096));
        if(inquiry)await request('/items/inquiries',options.contactToken,'POST',inquiry);
        return send(res,201,{ok:true});
      }
      if(path.startsWith('/api/')) {
        if(!['GET','POST','PATCH','DELETE'].includes(req.method))throw new HttpError(405,'Method not allowed');
        if(req.method!=='GET' && (req.headers.origin!==options.origin || !req.headers['content-type']?.startsWith('application/json')))throw new HttpError(403,'Invalid origin');
        if(path==='/api/login'&&req.method==='POST') {
          limited('login:'+req.socket.remoteAddress,15);
          const input=await body(req,2000);
          let login;
          try{login=await request('/auth/login',null,'POST',{email:input.email,password:input.password,mode:'json'});}catch{throw new HttpError(401,'Correo o contraseña incorrectos.');}
          const value={access:login.access_token,refresh:login.refresh_token,expires:Date.now()+login.expires,until:Date.now()+604800000};
          cookie(res,value);return send(res,200,{ok:true});
        }
        if(path==='/api/logout'&&req.method==='POST') {const current=session(req);if(current?.refresh)await request('/auth/logout',null,'POST',{refresh_token:current.refresh}).catch(()=>{});cookie(res,null);return send(res,200,{ok:true});}
        const current=await authorize(req,res), token=current.access;
        if(path==='/api/session'&&req.method==='GET')return send(res,200,{email:current.user.email,preview:options.preview,cms:options.cms,translationReady:Boolean(process.env.OPENAI_API_KEY||options.translate),publishReady:Boolean(options.hook)});
        if(path==='/api/content'&&req.method==='GET')return send(res,200,{data:await request('/items/site_texts?limit=-1&sort=page,key,locale',token)});
        if(path==='/api/content'&&req.method==='PATCH') {
          if(writing)throw new HttpError(409,'Ya se está guardando otro cambio. Espera un momento.');
          writing=true;
          try {
            const input=await body(req,30000);
            if(!/^[a-f0-9]{24}$/.test(input.key))throw new HttpError(400,'Invalid content key');
            try { safeText(input.value); } catch { throw new HttpError(400,'El texto contiene un formato no permitido.'); }
            const rows=await request(`/items/site_texts?limit=-1&filter[key][_eq]=${input.key}`,token);
            const source=rows.find(row=>row.locale==='es');
            if(!source)throw new HttpError(404,'Texto no encontrado.');
            if(hash(source.draft_value??source.value)!==input.version)throw new HttpError(409,'Este texto cambió. Recarga antes de guardar.');
            const translated=await (options.translate||translate)([{...source,value:input.value}]);
            const latest=await request(`/items/site_texts/${source.id}`,token);
            if(hash(latest.draft_value??latest.value)!==input.version)throw new HttpError(409,'Este texto cambió durante la traducción. Recarga antes de guardar.');
            const writes=locales.map(locale=>({id:textId(source.key,locale),draft_value:locale==='es'?input.value:translated[locale][source.key],draft_source_hash:hash(input.value)}));
            await request('/items/site_texts',token,'PATCH',writes);
            return send(res,200,{ok:true,translatedLanguages:5});
          }finally{writing=false;}
        }
        if(path==='/api/discard'&&req.method==='POST') {
          if(writing)throw new HttpError(409,'Hay cambios en curso.');
          writing=true;
          try {
            const input=await body(req,1000);if(!/^[a-f0-9]{24}$/.test(input.key))throw new HttpError(400,'Invalid content key');
            const rows=await request(`/items/site_texts?limit=-1&filter[key][_eq]=${input.key}`,token);
            await request('/items/site_texts',token,'PATCH',rows.map(row=>({id:row.id,draft_value:null,draft_source_hash:null})));
            return send(res,200,{ok:true});
          }finally{writing=false;}
        }
        if(path==='/api/inquiries'&&req.method==='GET')return send(res,200,{data:await request('/items/inquiries?limit=500&sort=-received_at',token)});
        if(path.startsWith('/api/inquiries/')&&['PATCH','DELETE'].includes(req.method)) {
          const id=path.split('/').pop();if(!/^[a-f0-9]{32}$/.test(id))throw new HttpError(400,'Invalid inquiry');
          if(req.method==='DELETE')await request('/items/inquiries/'+id,token,'DELETE');
          else {const input=await body(req,10000);if(!['new','in_progress','resolved'].includes(input.status)||typeof input.notes!=='string'||input.notes.length>5000)throw new HttpError(400,'Invalid status or notes');await request('/items/inquiries/'+id,token,'PATCH',{status:input.status,notes:input.notes});}
          return send(res,200,{ok:true});
        }
        if(path==='/api/media'&&req.method==='GET')return send(res,200,{data:await request('/items/site_media?limit=-1',token)});
        if(path==='/api/media'&&req.method==='POST') {
          const input=await body(req,8000000);
          if(!['hero','logo'].includes(input.key)||!['image/webp','image/png','image/jpeg'].includes(input.type)||typeof input.data!=='string'||!/^[A-Za-z0-9+/]+=*$/.test(input.data))throw new HttpError(400,'Selecciona una imagen PNG, JPEG o WebP.');
          const bytes=Buffer.from(input.data,'base64');if(bytes.length>5000000)throw new HttpError(413,'La imagen no puede superar 5 MB.');
          const form=new FormData();form.set('title',`Bull & Bear · ${input.key}`);form.set('file',new Blob([bytes],{type:input.type}),input.key+'.'+input.type.split('/')[1]);
          const response=await fetch(options.cms+'/files',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form,signal:AbortSignal.timeout(60000)});
          if(!response.ok)throw new HttpError(502,'No se pudo subir la imagen.');
          const image=(await response.json()).data.id;
          await request('/items/site_media/'+input.key,token,'PATCH',{image});return send(res,200,{ok:true});
        }
        const asset=path.match(/^\/api\/assets\/([a-f0-9-]{36})$/);
        if(asset&&req.method==='GET') {
          const response=await fetch(options.cms+'/assets/'+asset[1]+'?width=800&withoutEnlargement=true&format=webp',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
          if(!response.ok)throw new HttpError(404,'Imagen no disponible.');res.writeHead(200,{'Content-Type':response.headers.get('content-type')||'image/webp'});return res.end(Buffer.from(await response.arrayBuffer()));
        }
        if(path==='/api/publish'&&req.method==='POST') {
          if(writing)throw new HttpError(409,'Hay cambios en curso.');
          if(!options.hook)throw new HttpError(503,'La publicación no está configurada.');
          writing=true;
          try {
            const rows=await request('/items/site_texts?limit=-1',token),writes=[];
            for(const source of rows.filter(row=>row.locale==='es')) {
              const group=rows.filter(row=>row.key===source.key),draft=source.draft_value??source.value;
              for(const locale of locales) {
                const row=group.find(row=>row.locale===locale);
                if(!row || (row.draft_source_hash??row.source_hash)!==hash(draft))throw new HttpError(409,'Falta una traducción actualizada. Revisa los borradores.');
                if(row.draft_value!==null&&row.draft_value!==undefined)writes.push({id:row.id,value:row.draft_value,source_hash:row.draft_source_hash,draft_value:null,draft_source_hash:null});
              }
            }
            if(writes.length)await request('/items/site_texts',token,'PATCH',writes);
            const response=await fetch(options.hook,{method:'POST',signal:AbortSignal.timeout(20000)});
            if(!response.ok)throw new HttpError(502,'Los cambios están preparados, pero Vercel no respondió. Vuelve a publicar.');
            const job=await response.json();return send(res,202,{ok:true,job:job.job?.id||job.id||null,message:'Vercel está generando la nueva versión. La vista previa cambiará cuando termine correctamente.'});
          }finally{writing=false;}
        }
        throw new HttpError(404,'Not found');
      }
      if(req.method!=='GET'&&req.method!=='HEAD')throw new HttpError(405,'Method not allowed');
      const assets={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/logo.png':'logo.png','/hero.webp':'hero.webp','/fonts.css':'fonts.css','/dm-sans.woff2':'dm-sans.woff2','/garamond.woff2':'garamond.woff2'};
      if(!assets[path])throw new HttpError(404,'Not found');
      const bytes=await readFile(new URL('./public/'+assets[path],import.meta.url));
      res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'}[extname(assets[path])]});res.end(req.method==='HEAD'?undefined:bytes);
    }catch(error){if(!res.headersSent)send(res,error.status||502,{error:error.status?error.message:'El servicio no está disponible. Vuelve a intentar.'});else res.end();}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)createStudio().listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Bull & Bear Studio is listening.'));
