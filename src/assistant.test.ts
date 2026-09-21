import {describe,it,expect} from 'vitest';
import {parseAssistantResult,assistantPrompt} from './assistant';
import {responseText,validAssistantInput} from '../server/assistant';
describe('AI 응답과 데이터 경계',()=>{
  it('완성된 텍스트만 받아 실제 JSON 스키마를 검사한다',()=>{const text=responseText({status:'completed',output:[{content:[{type:'output_text',text:'{"text":"초안","questions":["기간은?"]}'}]}]});expect(parseAssistantResult(JSON.parse(text))).toEqual({text:'초안',questions:['기간은?']});});
  it('거절·미완료·빈 응답을 생성 성공처럼 표시하지 않는다',()=>{for(const raw of [{status:'incomplete'},{status:'completed',output:[]},{status:'completed',output:[{content:[{type:'refusal'}]}]}])expect(()=>responseText(raw)).toThrow();for(const raw of [{text:'',questions:[]},{text:'a',questions:[1]},{text:'a',questions:Array(6).fill('x')}])expect(()=>parseAssistantResult(raw)).toThrow();});
  it('지원하지 않는 목적·너무 큰 입력·빈 요청을 차단한다',()=>{expect(validAssistantInput({mode:'brief',context:'제품',request:'정리'})).toBe(true);for(const raw of [{mode:'send',context:'',request:'보내'},{mode:'brief',context:'x'.repeat(16001),request:'정리'},{mode:'analysis',context:'a',request:' '}])expect(validAssistantInput(raw)).toBe(false);});
  it('사용자가 확인한 자료와 요청을 구분한다',()=>{const text=assistantPrompt('outreach','견적 미확인','간결하게');expect(text).toContain('문의 문안 다듬기');expect(text).toContain('견적 미확인');expect(text).toContain('사용자 요청');});
});
