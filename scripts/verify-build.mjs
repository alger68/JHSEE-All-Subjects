import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourceManifestPath='data/packs/manifest.json';
const deployedManifestPath='dist/data/packs/manifest.json';
const manifest=JSON.parse(readFileSync(sourceManifestPath,'utf8'));
const deployedManifest=JSON.parse(readFileSync(deployedManifestPath,'utf8'));
assert.deepEqual(deployedManifest,manifest,'Deployed question pack manifest differs from source');

let questionCount=0;
for(const pack of manifest.packs??[]){
  if(pack.enabled===false)continue;
  const sourcePath=resolve(dirname(sourceManifestPath),pack.file);
  const deployedPath=resolve(dirname(deployedManifestPath),pack.file);
  const source=JSON.parse(readFileSync(sourcePath,'utf8'));
  const deployed=JSON.parse(readFileSync(deployedPath,'utf8'));
  assert.deepEqual(deployed,source,`Missing or altered deployed question pack: ${pack.id}`);
  questionCount+=source.length;
}
console.log(`Built question packs verified: ${questionCount} original questions available.`);

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
