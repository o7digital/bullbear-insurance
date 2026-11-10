import { readFile, writeFile } from 'node:fs/promises';
import { translate, targetLocales } from './translations.mjs';
const sources = JSON.parse(await readFile('cms/content-inventory.json', 'utf8'));
const path = 'src/data/translations.json';
const translations = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'));
for (const locale of targetLocales) translations[locale] ||= {};
const pending = sources.filter(row => targetLocales.some(locale => !translations[locale][row.key]));
let batch = [], size = 0;
async function flush() {
  if (!batch.length) return;
  const result = await translate(batch);
  for (const locale of targetLocales) Object.assign(translations[locale], result[locale]);
  await writeFile(path, JSON.stringify(translations, null, 2) + '\n');
  console.log(`Translated ${batch.length} entries in five languages.`); batch = []; size = 0;
}
for (const row of pending) {
  if (batch.length >= 25 || size + row.value.length > 6500) await flush();
  batch.push(row); size += row.value.length;
}
await flush();
console.log(`Translation catalogue complete: ${sources.length} entries.`);
