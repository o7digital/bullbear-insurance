import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import{scan}from'../scripts/html-content.mjs';
import{targetLocales,safeText}from'./translations.mjs';
test('all imported content has five complete translations with matching markup',async()=>{
 const inventory=JSON.parse(await readFile('cms/content-inventory.json','utf8')),translations=JSON.parse(await readFile('src/data/translations.json','utf8'));
 for(const row of inventory)for(const locale of targetLocales){const value=translations[locale][row.key];assert.ok(value,`${locale}: ${row.value}`);assert.doesNotThrow(()=>safeText(value));assert.deepEqual(value.match(/<[^>]*>/g)||[],row.value.match(/<[^>]*>/g)||[]);}
});
test('HTML translation preserves formatting and ignores scripts and URLs',()=>{
 const input='<!doctype html><html><head><script>const x="private"</script></head><body><h1>Hola<br><em>mundo</em></h1><a href="/contacto/" aria-label="Contacto">Hola</a></body></html>';
 const {document,texts}=scan(input,value=>value==='Hola<br><em>mundo</em>'?'Hello<br><em>world</em>':value==='Hola'?'Hello':value);
 assert.equal(document.querySelector('h1').innerHTML,'Hello<br><em>world</em>');assert.equal(document.querySelector('a').getAttribute('href'),'/contacto/');assert.ok(!texts.some(row=>row.value.includes('private')));
});
