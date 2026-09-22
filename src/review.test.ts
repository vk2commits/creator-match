import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {DEFAULT_INPUT} from './policy';
import type {Brief} from './experience';
import {CONTENT_LIBRARY,contentFor,contentNarrative,contentStats} from './creatorContent';
import {buildReview,applyModelReview,reportFromReview,inquiryFromReview,cacheReview,cachedReview} from './review';
import {appendInquiryProposal} from './inquiryProposal';
import {parseResearchResult} from './researchAI';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const person=(id:string)=>all.find(c=>c.id===id)!;
const brief:Brief={input:DEFAULT_INPUT,priority:'balanced',campaign:{name:'출근 틴트',product:'색이 오래가는 립틴트',goal:'awareness',targetCustomer:'바쁜 직장인',requiredElements:'자연광 발색'}};
describe('하나의 분석이 근거·문의·리포트로 이어진다',()=>{
 it('같은 브리프에서도 비교 리뷰와 파티 연출은 다른 결론을 준다',()=>{
  const beauty=buildReview(person('C0180'),all,brief),party=buildReview(person('C0155'),all,brief);
  expect(beauty.paragraph).toContain('발색과 사용 후 변화');expect(party.paragraph).toContain('조율이 필요');expect(party.headline).toContain('조율');
  expect(beauty.paragraph).not.toContain('직장인 팔로워');expect(beauty.paragraph.length).toBeLessThan(650);
  expect(party.proposal).toContain('조율');expect(party.proposal).not.toBe(beauty.proposal);
 });
 it('근거 버튼은 존재하는 게시물과 검토된 제품 질문을 가리킨다',()=>{
  const d=contentFor('C0180')!,r=buildReview(person('C0180'),all,brief);
  for(const e of r.evidence){const p=d.posts.find(p=>p.id===e.postId)!;expect(p).toBeDefined();if(e.tab==='ads')expect(p.comments.some(c=>c.text===e.detail&&c.productQuestion&&c.sentiment!=='unreviewed')).toBe(true);}
 });
 it('자료 없는 후보는 원본 지표 근거만 제시한다',()=>{
  const c=all.find(c=>!contentFor(c.id))!,r=buildReview(c,all,brief);
  expect(r.evidence.every(e=>e.tab==='metrics'&&!e.postId)).toBe(true);expect(r.questions.join(' ')).toContain('공유');
 });
 it('분석 호출과 콘텐츠 자료는 기본 추천 순위나 원본을 바꾸지 않는다',()=>{
  const original=structuredClone(all),before=recommend(all,brief.input);all.forEach(c=>buildReview(c,all,brief));
  expect(all).toEqual(original);expect(recommend(all,brief.input)).toEqual(before);
 });
 it('예산·분야를 벗어난 저장 후보는 적합 제목으로 포장하지 않는다',()=>{
  expect(buildReview(person('C0180'),all,{...brief,input:{...brief.input,budgetKRW:1}}).headline).toContain('예산');
  expect(buildReview(person('C0180'),all,{...brief,input:{...brief.input,categories:['게임']}}).headline).toContain('조건과 다른');
  expect(buildReview(person('C0036'),all,brief).insights.budget.title).toContain('견적');
 });
 it('조회수 미입력을 0으로 평균에 포함하지 않고 분모를 맞춘다',()=>{
  const d=structuredClone(contentFor('C0180')!);d.posts[1].views=null;
  const s=contentStats(d.posts);expect(s.adCount).toBe(2);expect(s.adViewCount).toBe(1);expect(s.adViews).toBe(8600);
  const r=buildReview(person('C0180'),all,brief,[d]);expect(reportFromReview(person('C0180'),brief,r,[d])).toContain('광고 1개 평균 조회 8600');
 });
 it('미분류 댓글만 있으면 제품 관심이 없다고 결론내리지 않는다',()=>{
  const d=structuredClone(contentFor('C0180')!);d.posts.forEach(p=>p.comments.forEach(c=>c.sentiment='unreviewed'));
  expect(contentStats(d.posts).sampleCount).toBe(0);expect(contentNarrative(person('C0180'),brief,[d])).not.toContain('질문은 아직 확인되지');
 });
 it('모델이 없는 근거를 인용하거나 근거를 누락하면 노출하지 않는다',()=>{
  const base=buildReview(person('C0180'),all,brief),response={summary:'해석',questions:[],keywords:[],excludeKeywords:[]};
  expect(()=>applyModelReview(base,response)).toThrow('근거');expect(()=>applyModelReview(base,{...response,evidenceIds:['post:fake']})).toThrow('근거');
 });
 it('화면의 최종 모델 문단과 질문을 리포트에서 그대로 내보낸다',()=>{
  const base=buildReview(person('C0180'),all,brief),summary='직접 비교한 발색 콘텐츠를 제품 소개에 연결하는 구성을 검토해 보세요.';
  const review=applyModelReview(base,{summary,questions:['지속력 촬영이 가능한가요?'],keywords:[],excludeKeywords:[],evidenceIds:[base.evidence[0].id]});
  const report=reportFromReview(person('C0180'),brief,review);expect(report).toContain(summary);expect(report.split(summary)).toHaveLength(2);expect(report).toContain('지속력 촬영');expect(report).not.toContain(base.paragraph);
 });
 it('선택한 질문만 문의에 넣고 내부 분석 문단·점수는 넣지 않는다',()=>{
  const r=buildReview(person('C0180'),all,brief),message=inquiryFromReview(r,[r.questions[1]]);
  expect(message).toContain(r.questions[1]);expect(message).not.toContain(r.questions[0]);expect(message).not.toContain(r.paragraph);expect(message).toContain('자연광 발색');
 });
 it('캠페인·비중·자료가 달라지면 캐시를 재사용하지 않는다',()=>{
  const original=buildReview(person('C0180'),all,brief);cacheReview(original);expect(cachedReview(original.key)).toEqual(original);
  const changed=buildReview(person('C0180'),all,{...brief,campaign:{...brief.campaign!,targetCustomer:'새 고객'}});expect(cachedReview(changed.key)).toBeUndefined();
  const d=structuredClone(CONTENT_LIBRARY);d[1].posts[0].caption='새로운 캡션';expect(buildReview(person('C0180'),all,brief,d).key).not.toBe(original.key);
  expect(buildReview(person('C0180'),all,{...brief,priority:'reach'}).key).not.toBe(original.key);
 });
 it('기존 문의는 그대로 두고 추가하며 같은 제안을 중복해서 붙이지 않는다',()=>{
  const original='직접 쓴 문장\n의도한 줄바꿈  ',proposal='추가 제안';
  const result=appendInquiryProposal(original,proposal);expect(result.startsWith(original)).toBe(true);expect(appendInquiryProposal(result,proposal)).toBe(result);expect(appendInquiryProposal(original,' ')).toBe(original);
 });
 it('응답의 근거 형식이 잘못되면 거절한다',()=>{
  expect(()=>parseResearchResult({summary:'내용',keywords:[],excludeKeywords:[],questions:[],evidenceIds:[7]})).toThrow();
 });
});
