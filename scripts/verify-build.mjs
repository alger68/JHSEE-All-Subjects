import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// A successful bundle alone does not prove its asynchronously fetched banks exist.
const files = readdirSync('dist/assets');
const bundle = files.filter(name => name.endsWith('.js')).map(name => readFileSync(`dist/assets/${name}`, 'utf8')).join('\n');
for (const bank of ['questions', 'cap-practice']) {
  const asset = files.find(name => name.startsWith(`${bank}-`) && name.endsWith('.json'));
  assert.ok(asset, `Missing deployed question bank: ${bank}`);
  assert.ok(bundle.includes(asset), `Bundle does not reference ${asset}`);
  assert.deepEqual(JSON.parse(readFileSync(`dist/assets/${asset}`, 'utf8')), JSON.parse(readFileSync(`data/${bank}.json`, 'utf8')));
}
console.log('Built question banks verified: 205 original questions available.');
const official=JSON.parse(readFileSync('data/official-115-layout.json','utf8'));
let pageCount=0;
for(const layout of Object.values(official))for(const page of layout.pages) {
  const source=readFileSync(`public/${page.src}`),deployed=readFileSync(`dist/${page.src}`);
  assert.ok(source.length>1000,`Empty official page ${page.src}`);
  assert.ok(deployed.equals(source),`Missing or altered deployed official page ${page.src}`);
  pageCount++;
}
const audio='official/115/listening/full-exam.mp3';
assert.ok(readFileSync(`dist/${audio}`).equals(readFileSync(`public/${audio}`)),'Official listening audio missing or altered');
console.log(`Built official reader verified: ${pageCount} original pages, 235 question regions and listening audio.`);
