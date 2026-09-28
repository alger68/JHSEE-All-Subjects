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

export async function loadSupplementalQuestionPacks({
  manifestUrl=new URL('./question-packs/manifest.json',document.baseURI).href,
  fetchImpl=fetch
}={}){
  const warnings=[],questions=[],packs=[];
  let response;
  try{response=await fetchImpl(manifestUrl);}catch(error){
    return {questions,packs,warnings:[`manifest: ${error instanceof Error?error.message:String(error)}`]};
  }
  if(!response?.ok)return {questions,packs,warnings:['manifest: request failed']};
  let manifest;
  try{manifest=await response.json();}catch{return {questions,packs,warnings:['manifest: invalid json']};}
  const checked=validateSupplementalManifest(manifest);
  if(!checked.ok)return {questions,packs,warnings:checked.errors};

  for(const pack of checked.packs.filter(item=>item.enabled!==false)){
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
      questions.push(...enriched);
      packs.push({...pack,loadedCount:enriched.length,url});
    }catch(error){
      warnings.push(`${pack.id}: ${error instanceof Error?error.message:String(error)}`);
    }
  }
  return {questions,packs,warnings};
}
