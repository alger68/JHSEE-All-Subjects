import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { assembleSupplementalQuestionBundle } from './js/core/question-pack-loader.js';

export default defineConfig(({command})=>{
  const config={base:'./',build:{outDir:'dist',emptyOutDir:true}};
  if(command!=='build')return config;
  const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
  const bundled=assembleSupplementalQuestionBundle(read('./public/question-packs/manifest.json'),
    pack=>read(`./public/question-packs/${pack.file}`));
  const source=JSON.stringify(bundled);
  const hash=createHash('sha256').update(source).digest('hex').slice(0,12);
  const bundleName=`bundle-${hash}.json`;
  const fileName=`question-packs/${bundleName}`;
  return {...config,
    define:{'import.meta.env.VITE_SUPPLEMENTAL_BUNDLE_URL':JSON.stringify(bundleName)},
    plugins:[{
      name:'supplemental-question-bundle',
      generateBundle(){this.emitFile({type:'asset',fileName,source});}
    }]
  };
});
