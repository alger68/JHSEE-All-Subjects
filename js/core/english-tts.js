const RATE_KEY='jhsee.englishTtsRate.v1';
const VOICE_KEY='jhsee.englishTtsVoice.v1';
export const ENGLISH_TTS_RATES=[0.75,1,1.25];

const noveltyNames=new Set(['albert','badnews','bahh','bells','boing','bubbles','cellos','deranged','goodnews','hysterical','jester','junior','organ','superstar','trinoids','whisper','wobble','zarvox']);
const clean=(value)=>String(value??'').replace(/\s+/g,' ').trim();
const language=(voice)=>String(voice?.lang||'').replace(/_/g,'-');
const normalizeRate=(value)=>{
  const n=Number(value);
  return ENGLISH_TTS_RATES.includes(n)?n:1;
};

export function voiceKey(voice){
  return JSON.stringify([voice?.voiceURI||'',voice?.name||'',language(voice)]);
}

function novelty(voice){
  const raw=String(voice?.name||'');
  const name=raw.replace(/\([^)]*\)/g,'').toLowerCase().replace(/[^a-z]/g,'');
  const uri=String(voice?.voiceURI||'').split('.').at(-1).toLowerCase().replace(/[^a-z]/g,'');
  return noveltyNames.has(name)||noveltyNames.has(uri)||/^(Fred|Ralph|Kathy|Victoria)(?:\b|$)/i.test(raw);
}

function voiceScore(voice){
  const name=String(voice?.name||'');
  const lang=language(voice);
  return (/^en-US$/i.test(lang)?80:/^en-(?:CA|AU)$/i.test(lang)?45:/^en-GB$/i.test(lang)?35:10)
    + (/natural|neural|premium|enhanced/i.test(name)?120:0)
    + (/Google US English|Microsoft.*(?:Aria|Jenny|Guy|Zira|David)|Samantha|Alex/i.test(name)?55:0)
    + (/Daniel|Karen|Moira|Google UK English/i.test(name)?25:0)
    + (voice?.default?8:0)
    - (/^(Fred|Ralph|Kathy|Victoria)(?:\b|$)/i.test(name)?90:0);
}

export function englishVoices(voices=[]){
  const unique=new Map();
  for(const voice of Array.from(voices??[])){
    if(!/^en(?:-|$)/i.test(language(voice))||novelty(voice))continue;
    unique.set(voiceKey(voice),voice);
  }
  return [...unique.values()].sort((a,b)=>voiceScore(b)-voiceScore(a)||voiceKey(a).localeCompare(voiceKey(b)));
}

export function getEnglishSpeechRate(storage=globalThis.localStorage){
  try{return normalizeRate(storage?.getItem?.(RATE_KEY));}
  catch{return 1;}
}

export function setEnglishSpeechRate(value,storage=globalThis.localStorage){
  const rate=normalizeRate(value);
  try{storage?.setItem?.(RATE_KEY,String(rate));}catch{}
  return rate;
}

export function getEnglishVoicePreference(storage=globalThis.localStorage){
  try{return String(storage?.getItem?.(VOICE_KEY)||'');}
  catch{return '';}
}

export function setEnglishVoicePreference(value,storage=globalThis.localStorage){
  const key=typeof value==='string'&&value.length<=2048?value:'';
  try{storage?.setItem?.(VOICE_KEY,key);}catch{}
  return key;
}

export function tableToSpeech(table){
  if(!table?.headers?.length||!Array.isArray(table.rows))return '';
  const headers=table.headers.map(clean);
  const rows=table.rows.map((row,rowIndex)=>{
    const cells=row.map((cell,index)=>`${headers[index]?`${headers[index]}. `:''}${clean(cell)}`);
    return `Row ${rowIndex+1}. ${cells.join('. ')}`;
  });
  return ['Table.',...rows].join(' ');
}

export function buildEnglishSpeechText(question,mode='full'){
  if(!question||question.subject!=='english')return '';
  const passage=clean(question.passage);
  const table=tableToSpeech(question.table);
  const prompt=clean(question.question);
  const choices=Array.isArray(question.choices)
    ? question.choices.map((choice,index)=>`Option ${String.fromCharCode(65+index)}. ${clean(choice)}`).join(' ')
    : '';

  if(mode==='question')return prompt;
  if(mode==='choices')return choices;
  return [
    passage,
    table,
    prompt?`Question. ${prompt}`:'',
    choices?`Choices. ${choices}`:''
  ].filter(Boolean).join(' ');
}

export function stopEnglishSpeech(synth=globalThis.speechSynthesis){
  try{synth?.cancel?.();}catch{}
}

export function pickEnglishVoice(voices=[],preferred=''){
  const options=englishVoices(voices);
  return options.find(v=>voiceKey(v)===preferred)??options[0]??null;
}

export function speakEnglish(text,{
  rate=getEnglishSpeechRate(),
  preferredVoice=getEnglishVoicePreference(),
  synth=globalThis.speechSynthesis,
  Utterance=globalThis.SpeechSynthesisUtterance
}={}){
  const spoken=clean(text);
  if(!spoken)return {ok:false,reason:'empty'};
  if(!synth||typeof synth.speak!=='function'||typeof Utterance!=='function'){
    return {ok:false,reason:'unsupported'};
  }

  stopEnglishSpeech(synth);
  const utterance=new Utterance(spoken);
  const voice=pickEnglishVoice(synth.getVoices?.()??[],preferredVoice);
  utterance.lang=voice?language(voice):'en-US';
  utterance.rate=normalizeRate(rate);
  utterance.pitch=1;
  utterance.volume=1;
  if(voice)utterance.voice=voice;
  try{
    if(synth.paused)synth.resume?.();
    synth.speak(utterance);
    return {ok:true,utterance,voice};
  }catch{
    return {ok:false,reason:'playback'};
  }
}
