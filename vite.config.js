import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

function questionPackAssets(){
  return {
    name:'question-pack-assets',
    generateBundle(){
      const dataRoot=resolve('data');
      const manifestPath=resolve('data/packs/manifest.json');
      const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
      this.emitFile({
        type:'asset',
        fileName:'data/packs/manifest.json',
        source:JSON.stringify(manifest,null,2)
      });
      for(const pack of manifest.packs??[]){
        if(pack.enabled===false)continue;
        const sourcePath=resolve(dirname(manifestPath),pack.file);
        const rel=relative(dataRoot,sourcePath).replaceAll('\\','/');
        if(rel.startsWith('..'))throw new Error(`Question pack escapes data/: ${pack.id}`);
        this.emitFile({
          type:'asset',
          fileName:`data/${rel}`,
          source:readFileSync(sourcePath)
        });
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins:[questionPackAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
