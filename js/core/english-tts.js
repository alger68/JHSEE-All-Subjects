const RATE_KEY='jhsee.englishTtsRate.v1';
export const ENGLISH_TTS_RATES=[0.75,1,1.25];

const clean=(value)=>String(value??'').replace(/\s+/g,' ').trim();
const normalizeRate=(value)=>{
  const n=Number(value);
  return ENGLISH_TTS_RATES.includes(n)?n:1;
};

export function getEnglishSpeechRate(storage=globalThis.localStorage){
  try{return normalizeRate(storage?.getItem?.(RATE_KEY));}
  catch{return 1;}
}

export function setEnglishSpeechRate(value,storage=globalThis.localStorage){
  const rate=normalizeRate(value);
  try{storage?.setItem?.(RATE_KEY,String(rate));}catch{}
  return rate;
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
    ? question.choices.map((choice,index)=>`${String.fromCharCode(65+index)}. ${clean(choice)}`).join(' ')
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

export function pickEnglishVoice(voices=[]){
  const list=Array.from(voices??[]);
  return list.find(v=>String(v.lang).toLowerCase()==='en-us')
    ??list.find(v=>String(v.lang).toLowerCase().startsWith('en-'))
    ??list.find(v=>String(v.lang).toLowerCase()==='en')
    ??null;
}

export function speakEnglish(text,{
  rate=getEnglishSpeechRate(),
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
  utterance.lang='en-US';
  utterance.rate=normalizeRate(rate);
  utterance.pitch=1;
  utterance.volume=1;
  const voice=pickEnglishVoice(synth.getVoices?.()??[]);
  if(voice)utterance.voice=voice;
  synth.speak(utterance);
  return {ok:true,utterance};
}
