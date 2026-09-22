import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators} from './domain';
import {DEFAULT_INPUT,tierOf} from './policy';
import {campaignFit} from './campaignFit';
import {campaignInsights} from './campaignInsights';
import type {Brief} from './experience';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const brief:Brief={input:DEFAULT_INPUT,priority:'balanced',campaign:{name:'가을 립틴트 출시',product:'색이 오래가는 립틴트',goal:'awareness',targetCustomer:'출근 준비 시간을 줄이고 싶은 직장인',customerNeed:'routine'}};
const c=(id:string)=>all.find(x=>x.id===id)!;
describe('캠페인 적합 문단의 근거와 유용성',()=>{
 it('실제 후보, 제품, 고객의 필요와 제안을 한 문단으로 연결한다',()=>{
  const {paragraph}=campaignFit(c('C0077'),all,brief);
  for(const text of ['정은매거진77','패션','인스타그램','가을 립틴트 출시','색이 오래가는 립틴트','출근 준비 시간을 줄이고 싶은 직장인','준비 과정','옷차림'])expect(paragraph).toContain(text);
  expect(paragraph).not.toContain('\n');expect(paragraph).toContain('협업을 제안');
 });
 it('제안 타깃과 실제 오디언스의 확인을 구분한다',()=>{
  for(const creator of all){const {paragraph}=campaignFit(creator,all,brief);expect(paragraph).toContain('채널 인사이트');expect(paragraph).not.toMatch(/주 시청자는|여성 비중|직장인 팔로워|구매율|적합도 \d/);}
 });
 it('뷰티와 패션은 제품을 연결하는 장면과 결론이 다르다',()=>{
  const fashion=campaignFit(c('C0077'),all,brief),beauty=campaignFit(c('C0155'),all,brief);
  expect(fashion.headline).not.toBe(beauty.headline);expect(beauty.paragraph).toContain('발색·사용감');expect(fashion.paragraph).toContain('옷차림');
 });
 it('타깃이 없으면 타깃을 만들지 않고, 학생에게 출근을 제안하지 않는다',()=>{
  const b={...brief,campaign:{...brief.campaign!,targetCustomer:''}};
  expect(campaignFit(c('C0077'),all,b).paragraph).toContain('타깃 고객을 추가');
  const student={...brief,campaign:{...brief.campaign!,targetCustomer:'새 학기 첫 메이크업을 고르는 대학생'}};
  expect(campaignInsights(c('C0077'),all,student).creative.title).not.toContain('출근');expect(campaignFit(c('C0077'),all,student).paragraph).not.toContain('직장인');
 });
 it('구매 목표는 추적할 행동으로 연결하고 매출을 예측하지 않는다',()=>{
  const {paragraph}=campaignFit(c('C0077'),all,{...brief,campaign:{...brief.campaign!,goal:'sales',customerNeed:'proof'}});
  expect(paragraph).toContain('선택지의 차이');expect(paragraph).toContain('전용 구매 링크');expect(paragraph).not.toContain('매출이');
 });
 it('관측한 비교 집단이 작거나 지표가 낮으면 상위권으로 포장하지 않는다',()=>{
  const creator=c('C0077');expect(campaignFit(creator,[creator],brief).paragraph).not.toContain('상위 절반');
  const low={...creator,views:0};expect(campaignFit(low,all,brief).paragraph).not.toContain('상위 절반');
  for(const x of all){const a=campaignFit(x,all,brief);if(a.paragraph.includes('상위 절반')){const peers=all.filter(p=>p.platform===x.platform&&tierOf(p.followers)===tierOf(x.followers));expect(peers.filter(p=>p.views>x.views).length).toBeLessThan(peers.length/2);}}
 });
 it('예산 미확인·초과와 무관한 분야는 첫 문단에서도 조건을 명시한다',()=>{
  expect(campaignFit(c('C0036'),all,brief).paragraph).toContain('견적부터');
  expect(campaignFit(c('C0077'),all,{...brief,input:{...brief.input,budgetKRW:500000}}).paragraph).toContain('280,000원');
  const game={...c('C0077'),category:'게임' as const};expect(campaignFit(game,all,{...brief,input:{...brief.input,categories:['게임']}}).paragraph).toContain('구체적인 사용 상황');
 });
});
