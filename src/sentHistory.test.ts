import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {emptyWork,readWork} from './campaign';
import {campaignFit} from './channelAnalysis';
import {simulateSend,recordExternalInquiry} from './collaborationFlow';
import {sentCount,sentHistoryOf} from './sentHistory';
import {DEFAULT_INPUT} from './policy';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const creator=all.find(c=>c.id==='C0077')!;
const campaign={name:'립틴트 출시',product:'한 번에 선명한 발색',goal:'awareness' as const};
describe('캠페인 적합 분석의 근거 구분',()=>{
 it('목표에 따라 협업 설명이 달라지고 구매 성과를 예측하지 않는다',()=>{
  const a=campaignFit(creator,campaign),b=campaignFit(creator,{...campaign,goal:'sales'});
  expect(a.summary).not.toEqual(b.summary);expect(b.tradeoff).toContain('구매 판단');expect(a.customer).toBeNull();
 });
 it('고객의 선택 기준과 콘텐츠가 다르면 구체적인 조율 방향을 제공한다',()=>{
  const a=campaignFit(creator,{...campaign,customerNeed:'discovery'}),b=campaignFit(creator,{...campaign,customerNeed:'routine'});
  expect(a.tradeoff).toBeNull();expect(b.customer?.aligned).toBe(false);expect(b.tradeoff).toBeTruthy();expect(b.request).toContain('생활 장면');
 });
 it('분야 맥락은 반영하되 예시 분석이 실제 점수를 바꾸지 않는다',()=>{
  const before=structuredClone(all),ranking=recommend(all,DEFAULT_INPUT);
  all.forEach(c=>expect(campaignFit(c,campaign).evidence).toContain(c.category));
  expect(all).toEqual(before);expect(recommend(all,DEFAULT_INPUT)).toEqual(ranking);
 });
});
describe('보낸 문의는 변경되지 않는 발송별 기록',()=>{
 it('같은 후보에게 두 번 보내면 이전 문안을 보존하고 두 건으로 센다',()=>{
  const first=simulateSend(emptyWork(),'첫 문의','2026-09-22T01:00:00Z');
  const second=simulateSend({...first,message:'새 초안'},'두 번째 문의','2026-09-22T02:00:00Z');
  expect(second.sentHistory.map(x=>x.message)).toEqual(['첫 문의','두 번째 문의']);expect(first.sentHistory).toHaveLength(1);
  expect(sentCount({C0077:second})).toBe(2);expect(second.contactedAt).toBe('');
 });
 it('처음 외부 문의 날짜를 입력할 때 중복 이력을 만들지 않는다',()=>{
  const original=emptyWork(),sent=recordExternalInquiry({...original,contactedAt:'2026-09-22'},'외부 문의',original);
  expect(sentHistoryOf(sent)).toHaveLength(1);expect(sent.sentHistory[0].kind).toBe('manual');expect(sent.demoSentAt).toBe('');
 });
 it('예전 저장 문안도 표시하며 다음 발송에서 이어 보존한다',()=>{
  const old={...emptyWork(),demoSentAt:'2026-09-21T01:00:00Z',sentMessage:'예전 문안'};delete (old as Partial<typeof old>).sentHistory;const legacy=readWork({C0077:old}).C0077;
  expect(sentHistoryOf(legacy)[0].message).toBe('예전 문안');
  const sent=simulateSend(legacy,'새 문안','2026-09-22T01:00:00Z');expect(sent.sentHistory).toHaveLength(2);
  expect(readWork({C0077:sent}).C0077.sentHistory).toEqual(sent.sentHistory);
 });
 it('날짜만 편집한 새 초안에는 발송 이력이 생기지 않는다',()=>expect(sentHistoryOf({...emptyWork(),contactedAt:'2026-09-22'})).toEqual([]));
 it('추가 문의 발송으로 제작 진행 상태를 되돌리지 않는다',()=>expect(simulateSend({...emptyWork(),stage:'active'},'추가 문의','2026-09-22T01:00:00Z').stage).toBe('active'));
 it('진행 상태 변경은 발송 이력이 아니다',()=>expect(sentHistoryOf({...emptyWork(),stage:'contacted'})).toEqual([]));
 it('잘못된 저장 이력은 복원하지 않는다',()=>{
  const restored=readWork({C0077:{...emptyWork(),sentHistory:[{id:'x',kind:'manual',sentAt:'2026-02-31',message:'문의'},{id:'y',kind:'mail',sentAt:'2026-09-22',message:'문의'}]}}).C0077;
  expect(restored.sentHistory).toEqual([]);
 });
});
