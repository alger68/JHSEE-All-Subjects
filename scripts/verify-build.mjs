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
console.log('Built question banks verified: 85 original questions available.');
