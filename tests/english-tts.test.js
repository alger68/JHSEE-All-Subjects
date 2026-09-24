import { describe, expect, it } from 'vitest';
import {
  buildEnglishSpeechText,
  getEnglishSpeechRate,
  setEnglishSpeechRate,
  getEnglishVoicePreference,
  setEnglishVoicePreference,
  englishVoices,
  voiceKey,
  pickEnglishVoice,
  speakEnglish
} from '../js/core/english-tts.js';

describe('English browser TTS',()=>{
  it('builds a full reading script from passage, table, question and choices',()=>{
    const q={
      subject:'english',
      passage:'Ben waited at the station.',
      question:'Why did Ben wait?',
      choices:['For a bus','For a train','For lunch','For school'],
      table:{headers:['Day','Time'],rows:[['Mon','9:00']]}
    };
    const text=buildEnglishSpeechText(q,'full');
    expect(text).toContain('Ben waited at the station.');
    expect(text).toContain('Table.');
    expect(text).toContain('Question. Why did Ben wait?');
    expect(text).toContain('Option A. For a bus');
    expect(text).toContain('Option D. For school');
  });

  it('returns question-only and choices-only scripts',()=>{
    const q={subject:'english',question:'Where is Amy?',choices:['Home','School','Park','Store']};
    expect(buildEnglishSpeechText(q,'question')).toBe('Where is Amy?');
    expect(buildEnglishSpeechText(q,'choices')).toBe('Option A. Home Option B. School Option C. Park Option D. Store');
  });

  it('does not build speech for non-English questions',()=>{
    expect(buildEnglishSpeechText({subject:'math',question:'1+1=?'},'full')).toBe('');
  });

  it('stores only supported playback rates',()=>{
    const values=new Map();
    const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    expect(setEnglishSpeechRate(0.75,storage)).toBe(0.75);
    expect(getEnglishSpeechRate(storage)).toBe(0.75);
    expect(setEnglishSpeechRate(9,storage)).toBe(1);
    expect(getEnglishSpeechRate(storage)).toBe(1);
  });

  it('filters novelty voices and prefers higher-quality natural voices',()=>{
    const voices=[
      {lang:'en-US',name:'Fred',voiceURI:'fred'},
      {lang:'en-US',name:'Microsoft Aria Natural',voiceURI:'aria'},
      {lang:'en-GB',name:'Daniel',voiceURI:'daniel'}
    ];
    expect(englishVoices(voices).map(v=>v.name)).toEqual(['Microsoft Aria Natural','Daniel']);
    expect(pickEnglishVoice(voices)?.name).toBe('Microsoft Aria Natural');
  });

  it('persists a preferred English voice key',()=>{
    const values=new Map();
    const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    const voice={lang:'en-US',name:'Samantha',voiceURI:'samantha'};
    const key=voiceKey(voice);
    expect(setEnglishVoicePreference(key,storage)).toBe(key);
    expect(getEnglishVoicePreference(storage)).toBe(key);
  });

  it('prefers en-US and speaks with the requested rate',()=>{
    const voices=[{lang:'en-GB',name:'UK'},{lang:'en-US',name:'US'}];
    expect(pickEnglishVoice(voices)).toEqual(voices[1]);
    const spoken=[];
    const synth={
      cancel(){spoken.push('cancel');},
      getVoices(){return voices;},
      speak(utterance){spoken.push(utterance);}
    };
    class FakeUtterance { constructor(text){this.text=text;} }
    const result=speakEnglish('Hello world',{rate:1.25,synth,Utterance:FakeUtterance});
    expect(result.ok).toBe(true);
    expect(spoken[0]).toBe('cancel');
    expect(spoken[1].text).toBe('Hello world');
    expect(spoken[1].lang).toBe('en-US');
    expect(spoken[1].rate).toBe(1.25);
    expect(spoken[1].voice).toEqual(voices[1]);
  });
});
