const VALID_PACK_KINDS=new Set(['local-pack']);

export function validateSupplementalManifest(input){
  const errors=[];
  if(input?.version!==1)errors.push('manifest version must be 1');
  if(!Array.isArray(input?.packs))errors.push('packs must be an array');
  const seen=new Set();
  for(const pack of input?.packs??[]){
    const id=String(pack?.id??'').trim();
    if(!id)errors.push('pack id is required');
    else if(seen.has(id))errors.push(`duplicate pack id: ${id}`);
    else seen.add(id);
    if(!Number.isInteger(pack?.version)||pack.version<1)errors.push(`invalid version: ${id||'unknown'}`);
    if(!String(pack?.file??'').trim())errors.push(`file is required: ${id||'unknown'}`);
    if(!VALID_PACK_KINDS.has(pack?.kind))errors.push(`invalid kind: ${id||'unknown'}`);
    if(pack?.subject&&!['chinese','english','math','science','social'].includes(pack.subject))errors.push(`invalid subject: ${id}`);
  }
  return {ok:errors.length===0,errors,packs:Array.isArray(input?.packs)?input.packs:[]};
}

export function assembleSupplementalQuestionBundle(manifest,readPack){
  const checked=validateSupplementalManifest(manifest);
  if(!checked.ok)throw new Error(checked.errors.join('; '));
  const packs=checked.packs.filter(pack=>pack.enabled!==false);
  const questions=packs.flatMap(pack=>{
    const payload=readPack(pack);
    if(!Array.isArray(payload))throw new Error(`${pack.id}: pack payload must be an array`);
    if(Number.isInteger(pack.questionCount)&&payload.length!==pack.questionCount){
      throw new Error(`${pack.id}: questionCount expected ${pack.questionCount}, got ${payload.length}`);
    }
    return payload.map(q=>({...q,packId:pack.id,packVersion:pack.version,sourceKind:'local-pack'}));
  });
  return {version:1,packs,questions};
}

export async function loadSupplementalQuestionPacks({
  manifestUrl=new URL('./question-packs/manifest.json',document.baseURI).href,
  bundleUrl=import.meta.env.VITE_SUPPLEMENTAL_BUNDLE_URL,
  fetchImpl=fetch
}={}){
  const warnings=[],questions=[],packs=[];
  if(bundleUrl){
    try{
      const res=await fetchImpl(new URL(bundleUrl,manifestUrl).href);
      if(!res?.ok)throw new Error('request failed');
      const payload=await res.json();
      if(!Array.isArray(payload?.questions))throw new Error('questions must be an array');
      const bundled=assembleSupplementalQuestionBundle(payload,
        pack=>payload.questions.filter(q=>q.packId===pack.id));
      if(bundled.questions.length!==payload.questions.length)throw new Error('unexpected question count');
      return {...bundled,packs:bundled.packs.map(pack=>({...pack,
        loadedCount:bundled.questions.filter(q=>q.packId===pack.id).length,
        url:new URL(pack.file,manifestUrl).href
      })),warnings};
    }catch(error){
      warnings.push(`bundle: ${error instanceof Error?error.message:String(error)}`);
    }
  }
  let response;
  try{response=await fetchImpl(manifestUrl);}catch(error){
    return {questions,packs,warnings:[...warnings,`manifest: ${error instanceof Error?error.message:String(error)}`]};
  }
  if(!response?.ok)return {questions,packs,warnings:[...warnings,'manifest: request failed']};
  let manifest;
  try{manifest=await response.json();}catch{return {questions,packs,warnings:[...warnings,'manifest: invalid json']};}
  const checked=validateSupplementalManifest(manifest);
  if(!checked.ok)return {questions,packs,warnings:[...warnings,...checked.errors]};

  const results=await Promise.all(checked.packs.filter(item=>item.enabled!==false).map(async pack=>{
    const url=new URL(pack.file,manifestUrl).href;
    try{
      const res=await fetchImpl(url);
      if(!res?.ok)throw new Error('request failed');
      const payload=await res.json();
      if(!Array.isArray(payload))throw new Error('pack payload must be an array');
      if(Number.isInteger(pack.questionCount)&&payload.length!==pack.questionCount){
        throw new Error(`questionCount expected ${pack.questionCount}, got ${payload.length}`);
      }
      const enriched=payload.map(q=>({...q,packId:pack.id,packVersion:pack.version,sourceKind:'local-pack'}));
      return {questions:enriched,pack:{...pack,loadedCount:enriched.length,url}};
    }catch(error){
      return {warning:`${pack.id}: ${error instanceof Error?error.message:String(error)}`};
    }
  }));
  for(const result of results){
    if(result.warning)warnings.push(result.warning);
    else{questions.push(...result.questions);packs.push(result.pack);}
  }
  return {questions,packs,warnings};
}
