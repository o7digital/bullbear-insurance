import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createStudio, validateContact } from './server.mjs';
import { hash, locales, textId } from '../lib.mjs';
import { forms } from '../forms.mjs';
const source={key:'a'.repeat(24),source:'Hola',value:'Hola',section:'Inicio',page:'/',status:'published'};
const seed=()=>locales.map(locale=>({...source,id:textId(source.key,locale),locale,value:locale==='es'?'Hola':'Hello',source_hash:hash('Hola'),draft_value:null,draft_source_hash:null}));
async function fixture(t,overrides={}) {
  let rows=seed(),writes=0;
  const calls=[],inquiries=[];
  const hook=createServer((req,res)=>{calls.push('hook');res.writeHead(200,{'Content-Type':'application/json'});res.end('{"job":{"id":"job"}}');});await new Promise(resolve=>hook.listen(0,'127.0.0.1',resolve));t.after(()=>hook.close());
  const api=async(path,token,method='GET',body)=>{
    calls.push([path,method]);
    if(path==='/auth/login')return {access_token:'access',refresh_token:'refresh',expires:900000};
    if(path.startsWith('/users/me'))return overrides.user || {id:'owner',email:'owner@example.com',role:{policies:[{policy:{admin_access:true}}]}};
    if(path==='/items/site_texts'&&method==='PATCH'){writes++;for(const change of body){Object.assign(rows.find(row=>row.id===change.id),change);}return structuredClone(body);}
    if(path.startsWith('/items/site_texts/'))return structuredClone(rows.find(row=>row.id===path.split('/').pop()));
    if(path.startsWith('/items/site_texts?'))return structuredClone(rows);
    if(path==='/items/inquiries'&&method==='POST'){writes++;inquiries.push(structuredClone(body));return body;}
    throw Error('Unexpected API call '+path+' '+method);
  };
  const server=createStudio({secret:'test-secret',origin:'https://studio.test',api,secure:false,contactSecret:'contact-secret',contactToken:'write-only',hook:`http://127.0.0.1:${hook.address().port}`,translate:async()=>Object.fromEntries(locales.filter(l=>l!=='es').map(locale=>[locale,{[source.key]:'New translation'}])),...overrides});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>server.close());
  const base=`http://127.0.0.1:${server.address().port}`;
  const login=await fetch(base+'/api/login',{method:'POST',headers:{Origin:'https://studio.test','Content-Type':'application/json'},body:'{"email":"owner@example.com","password":"secret"}'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const request=(path,method='GET',body,headers={})=>fetch(base+path,{method,headers:{cookie,Origin:'https://studio.test',...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
  return {base,request,rows:()=>rows,writes:()=>writes,calls,inquiries};
}
test('contact validates consent and rejects unsupported fields',()=>{
  const contact={name:'QA User',email:'qa@example.com',service:'general',locale:'fr',consent:true};
  assert.equal(validateContact(contact).locale,'fr');
  for(const patch of [{consent:false},{locale:'xx'},{service:'injected'},{email:'invalid'},{name:'<script>'}])assert.throws(()=>validateContact({...contact,...patch}));
  assert.equal(validateContact({...contact,website:'bot'}),null);
  assert.equal(validateContact({...contact,status:'resolved'}).status,'new');
  for(const form of ['__proto__','constructor',{},'missing'])assert.throws(()=>validateContact({...contact,form}),error=>error.status===400);
});
test('private content, CSRF and forged cookies are denied',async t=>{
  const f=await fixture(t);
  assert.equal((await fetch(f.base+'/api/content')).status,401);
  assert.equal((await f.request('/api/content','PATCH',{key:source.key,value:'New',version:hash('Hola')},{Origin:'https://evil.test'})).status,403);
  assert.equal((await f.request('/api/content','GET',undefined,{cookie:'bb_studio=forged'})).status,401);
  assert.equal((await fetch(f.base+'/api/contact',{method:'POST',body:'{}'})).status,403);
});
test('configured editors access content without reading administrator policies',async t=>{
  const f=await fixture(t,{editorRole:'editor-role',user:{id:'editor',email:'editor@example.com',role:'editor-role'}});
  assert.equal((await f.request('/api/session')).status,200);
  assert.equal((await f.request('/api/content')).status,200);
  assert.ok(!f.calls.some(call=>Array.isArray(call)&&call[0].includes('policies.policy.admin_access')));
});
test('unconfigured roles and revoked editor access are denied',async t=>{
  const user={id:'editor',email:'editor@example.com',role:'editor-role'};
  const f=await fixture(t,{editorRole:'editor-role',user});
  assert.equal((await f.request('/api/session')).status,200);
  user.role='another-role';
  assert.equal((await f.request('/api/content')).status,403);
  assert.equal((await f.request('/api/publish','POST',{})).status,403);
  const unconfigured=await fixture(t,{user:{id:'editor',email:'editor@example.com',role:'editor-role'},editorRole:undefined});
  assert.equal((await unconfigured.request('/api/session')).status,403);
});
test('drafts translate together, stay unpublished and publish only complete bundles',async t=>{
  const f=await fixture(t);
  const response=await f.request('/api/content','PATCH',{key:source.key,value:'Nuevo',version:hash('Hola')});
  assert.equal(response.status,200,await response.text());
  assert.equal(f.rows().find(row=>row.locale==='es').value,'Hola');
  assert.ok(f.rows().every(row=>row.draft_source_hash===hash('Nuevo')));
  assert.equal((await f.request('/api/content','PATCH',{key:source.key,value:'Stale',version:hash('Hola')})).status,409);
  assert.equal((await f.request('/api/publish','POST',{})).status,202);
  assert.equal(f.rows().find(row=>row.locale==='es').value,'Nuevo');
  assert.ok(f.rows().every(row=>row.draft_value===null));assert.ok(f.calls.includes('hook'));
});
test('provider failure and unsafe content never write partial translations',async t=>{
  const f=await fixture(t,{translate:async()=>{throw Error('provider unavailable');}});
  assert.equal((await f.request('/api/content','PATCH',{key:source.key,value:'Nuevo',version:hash('Hola')})).status,502);
  assert.equal(f.writes(),0);
  assert.equal((await f.request('/api/content','PATCH',{key:source.key,value:'<img src=x onerror=alert(1)>',version:hash('Hola')})).status,400);
  assert.equal(f.writes(),0);
});
test('incomplete translation bundles cannot trigger deployment',async t=>{
  const f=await fixture(t);f.rows()[1].source_hash='stale';
  assert.equal((await f.request('/api/publish','POST',{})).status,409);assert.ok(!f.calls.includes('hook'));assert.equal(f.writes(),0);
});
test('contact proxy stores a validated private inquiry and rate limits abuse',async t=>{
  const f=await fixture(t),body={name:'QA Test',email:'qa@example.com',service:'general',consent:true,locale:'de'};
  const submit=()=>fetch(f.base+'/api/contact',{method:'POST',headers:{Authorization:'Bearer contact-secret','Content-Type':'application/json','X-Contact-Client':'test-client'},body:JSON.stringify(body)});
  assert.equal((await submit()).status,201);assert.equal(f.writes(),1);
  for(let i=0;i<4;i++)await submit();assert.equal((await submit()).status,429);
});

test('restored forms validate their own insurance choices and preserve complete contact details',async t=>{
 const f=await fixture(t);
 for(const [variant,form]of Object.entries(forms)){
  const choice=form.choices[0];
  const input={name:'María García',first_name:'María',last_name:'García',email:'qa@example.com',phone:'+52 55 1510 0605',form:variant,insurance_type:choice?.value||'auto',service:choice?.service||form.service,message:form.message?'Solicitud '+ 'é'.repeat(3500):'',locale:'fr',consent:true,website:''};
  const response=await fetch(f.base+'/api/contact',{method:'POST',headers:{Authorization:'Bearer contact-secret','Content-Type':'application/json','X-Contact-Client':variant},body:JSON.stringify(input)});
  assert.equal(response.status,201,variant+' '+await response.text());
  const saved=f.inquiries.at(-1);assert.equal(saved.phone,input.phone);assert.equal(saved.message,input.message);assert.equal(saved.first_name,'María');assert.equal(saved.last_name,'García');assert.equal(saved.form_kind,variant);assert.equal(saved.insurance_type,choice?.label||form.title);
  for(const patch of [{last_name:''},{phone:'<script>'},{insurance_type:'unknown',service:'business'},{message:'a'.repeat(4001)}])assert.throws(()=>validateContact({...input,...patch}));
 }
});
