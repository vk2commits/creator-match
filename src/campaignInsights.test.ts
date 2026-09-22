import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {DEFAULT_INPUT} from './policy';
import {campaignInsights} from './campaignInsights';
import type {Brief} from './experience';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const brief:Brief={input:DEFAULT_INPUT,priority:'reach',campaign:{name:'가을 립틴트 출시',product:'색이 오래가는 립틴트',goal:'awareness',targetCustomer:'바쁜 직장인',customerNeed:'routine'}};
const c=(id:string)=>all.find(c=>c.id===id)!;
describe('캠페인 분석이 관측값에서 판단과 다음 행동으로 이어진다',()=>{
 it('후보별 실제 지표와 예산 차이를 정확히 연결한다',()=>{
  const a=campaignInsights(c('C0077'),all,brief),b=campaignInsights(c('C0066'),all,brief);
  expect(a.budget.title).toContain('1,220,000원');expect(b.budget.title).toContain('540,000원');
  expect(a.evidence.find(e=>e.key==='views')?.value).toBe('35,172회');expect(a.summary).not.toBe(b.summary);
  expect(a.risks).not.toEqual(b.risks);
 });
 it('원본과 추천 순위를 바꾸지 않으며 같은 입력에는 같은 분석이다',()=>{
  const original=structuredClone(all),rank=recommend(all,brief.input);const a=campaignInsights(c('C0077'),all,brief);
  expect(campaignInsights(c('C0077'),all,brief)).toEqual(a);expect(all).toEqual(original);expect(recommend(all,brief.input)).toEqual(rank);
 });
 it('신규 후보를 무료 또는 평점이 좋은 후보로 설명하지 않는다',()=>{
  const a=campaignInsights(c('C0036'),all,{...brief,customWeights:{rating:1,engagement:0,views:0,experience:0}});
  expect(a.budget.title).toContain('견적');expect(a.budget.body).not.toContain('0원');expect(a.summary).toContain('아직 평가가 없어요');expect(a.risks.some(r=>r.title.includes('평가가 아직'))).toBe(true);
 });
 it('초과 예산과 변경한 탐색 조건은 숨기지 않는다',()=>{
  const a=campaignInsights(c('C0077'),all,{...brief,input:{...DEFAULT_INPUT,budgetKRW:500000}});expect(a.budget.title).toContain('280,000원');expect(a.lead).toContain('예산');
  expect(campaignInsights(c('C0077'),all,{...brief,input:{...DEFAULT_INPUT,categories:['게임']}}).lead).toContain('조건과 다른');
 });
 it('비교 후보는 같은 분야·플랫폼·규모이며 예산 내에서만 선택한다',()=>{
  for(const creator of all){const a=campaignInsights(creator,all,brief);if(a.comparison){const x=a.comparison.creator;expect(x.platform).toBe(creator.platform);expect(x.category).toBe(creator.category);expect(x.averageBudget).toBeLessThanOrEqual(brief.input.budgetKRW);expect(x.id).not.toBe(creator.id);}}
 });
 it('목표·고객 선택 기준이 콘텐츠 제안과 성과 계획에 반영된다',()=>{
  const a=campaignInsights(c('C0077'),all,brief),b=campaignInsights(c('C0077'),all,{...brief,campaign:{...brief.campaign!,goal:'sales',customerNeed:'proof'}});
  expect(a.creative.hook).toContain('바쁜 직장인');expect(a.creative).not.toEqual(b.creative);expect(b.cta).toContain('구매 링크');expect(b.measurement.join(' ')).toContain('집계 기간');expect(b.proposal).toContain('제안드리는 콘텐츠 방향');expect(b.source).toContain('실제 게시물');
 });
 it('같은 립 제품이라도 분야에 따라 다른 제작 장면을 제안한다',()=>{
  const fashion=campaignInsights(c('C0077'),all,brief),beauty=campaignInsights(c('C0155'),all,brief);
  expect(fashion.creative.scene).toContain('셔츠');expect(beauty.creative.scene).toContain('촬영 간격');expect(fashion.creative).not.toEqual(beauty.creative);
 });

});
