import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {emptyWork,readWork,STAGES,workErrors} from './campaign';
import {analyzeChannelExample} from './channelAnalysis';
import {stageNeeds,simulateSend} from './collaborationFlow';
import {DEFAULT_INPUT} from './policy';
import {readSession} from './experience';
import {briefDemo} from './briefDemo';

const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const c=all.find(c=>c.id==='C0077')!;
const campaign={name:'가을 신제품',product:'출근 전 간단한 메이크업',goal:'awareness' as const,targetCustomer:'바쁜 직장인',customerNeed:'discovery' as const};
describe('타깃 고객과 예시 콘텐츠 분석',()=>{
  it('고객 기준이 없을 때 적합성을 꾸며내지 않는다',()=>expect(analyzeChannelExample(c,{...campaign,customerNeed:undefined})).toBeNull());
  it('같은 채널도 고객의 선택 기준에 따라 적합·조율 이유가 달라진다',()=>{
    const a=analyzeChannelExample(c,campaign)!,b=analyzeChannelExample(c,{...campaign,customerNeed:'proof'})!;
    expect(a.aligned).toBe(true);expect(b.aligned).toBe(false);expect(a.reasoning).not.toBe(b.reasoning);expect(b.request).toContain('사용 과정');expect(a.target).toBe('바쁜 직장인');
  });
  it('채널이 달라지면 검토한 콘텐츠와 이유도 달라진다',()=>{
    const a=analyzeChannelExample(c,campaign)!,b=analyzeChannelExample(all.find(c=>c.id==='C0066')!,campaign)!;
    expect(a.channel.titles).not.toEqual(b.channel.titles);expect(a.aligned).not.toBe(b.aligned);
  });
  it('가상의 분석은 원본 데이터나 추천 결과를 바꾸지 않는다',()=>{
    const before=structuredClone(all),ranking=recommend(all,DEFAULT_INPUT);
    all.forEach(c=>analyzeChannelExample(c,campaign));expect(all).toEqual(before);expect(recommend(all,DEFAULT_INPUT)).toEqual(ranking);
  });
  it('AI 브리프 수정 시 고객 입력을 보존하고 한 명당 예산도 읽는다',()=>{
    const proposal=briefDemo('립틴트 신제품을 알리고 싶어요. 한 명당 150만원.',{input:DEFAULT_INPUT,priority:'reach',campaign});
    expect(proposal.brief.campaign?.targetCustomer).toBe(campaign.targetCustomer);expect(proposal.brief.campaign?.customerNeed).toBe('discovery');expect(proposal.brief.input.budgetKRW).toBe(1500000);
  });
  it('기존 저장을 복원하고 유효하지 않은 고객 분류만 비운다',()=>{
    const input={version:5,brief:{input:DEFAULT_INPUT,priority:'balanced',campaign},selected:[],compared:[]};
    expect(readSession(JSON.stringify(input))?.brief.campaign?.customerNeed).toBe('discovery');
    expect(readSession(JSON.stringify({...input,brief:{...input.brief,campaign:{...campaign,customerNeed:'invented',targetCustomer:42}}}))?.brief.campaign?.customerNeed).toBeUndefined();
  });
});
describe('연락부터 결과 기록까지의 상태',()=>{
  it('모든 상태를 자유롭게 기록하되 누락 항목은 별도로 안내한다',()=>{
    STAGES.forEach(s=>expect(workErrors({...emptyWork(),stage:s.id})).toEqual([]));
    expect(stageNeeds({...emptyWork(),stage:'active'})).toEqual(['문의한 날짜','합의 비용','제작 범위','게시 예정일']);
    expect(stageNeeds({...emptyWork(),stage:'complete'})).toContain('확인한 성과');
  });
  it('시연 발송은 보낸 문안을 고정하고 실제 문의 날짜를 만들지 않는다',()=>{
    const original=emptyWork(),sent=simulateSend(original,'협업을 제안드립니다.','2026-09-21T12:00:00Z');
    expect(sent.stage).toBe('contacted');expect(sent.contactedAt).toBe('');expect(sent.sentMessage).toBe('협업을 제안드립니다.');expect(original.stage).toBe('draft');
    sent.message='나중에 수정';expect(sent.sentMessage).toBe('협업을 제안드립니다.');
  });
  it('외부 문의 이력이 있는 기록의 날짜를 시연이 덮어쓰지 않는다',()=>{
    const sent=simulateSend({...emptyWork(),contactedAt:'2026-09-20'},'다시 문의','2026-09-21T12:00:00Z');expect(sent.contactedAt).toBe('2026-09-20');
  });
  it('비어 있는 문안과 잘못된 견적으로 보내지 않는다',()=>{
    expect(()=>simulateSend(emptyWork(),' ','2026-09-21T12:00:00Z')).toThrow();expect(()=>simulateSend({...emptyWork(),quotedCost:-1},'문의','2026-09-21T12:00:00Z')).toThrow();
  });
  it('한 후보의 발송과 상태 변경은 다른 후보의 기록에 영향이 없다',()=>{
    const a=emptyWork(),b={...emptyWork(),message:'두 번째 후보 문안'};
    const records={C0077:a,C0066:b},next={...records,C0077:simulateSend(a,'첫 번째 후보에게','2026-09-21T12:00:00Z')};
    expect(next.C0066).toEqual(b);expect(records.C0077.stage).toBe('draft');expect(next.C0077.stage).toBe('contacted');
  });
  it('상태를 되돌려도 견적·조건·보낸 문안은 복원된다',()=>{
    const sent=simulateSend({...emptyWork(),quotedCost:1200000,agreedCost:1100000,deliverable:'릴스 1편'},'안녕하세요.','2026-09-21T12:00:00Z');
    const restored=readWork({C0077:{...sent,stage:'declined',closedReason:'일정 불일치'}}).C0077;
    expect(restored.quotedCost).toBe(1200000);expect(restored.agreedCost).toBe(1100000);expect(restored.sentMessage).toBe(sent.sentMessage);
  });
  it('이전 버전 기록에 새 필드를 기본값으로 채운다',()=>{
    const old=emptyWork();delete (old as Partial<typeof old>).quotedCost;delete (old as Partial<typeof old>).sentMessage;delete (old as Partial<typeof old>).demoSentAt;delete (old as Partial<typeof old>).closedReason;
    const restored=readWork({C0066:old}).C0066;expect(restored.quotedCost).toBeNull();expect(restored.sentMessage).toBe('');expect(restored.demoSentAt).toBe('');
  });
});
