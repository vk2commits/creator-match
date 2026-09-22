import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {DEFAULT_INPUT} from './policy';
import {cleanKeywords,contentFor,keywordMatches,contentStats,contentNarrative,creatorReport,CONTENT_LIBRARY} from './creatorContent';
import {searchDraft} from './discovery';
import {readBook,saveCampaign} from './workspaces';
import type {SavedSession} from './experience';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const brief={input:DEFAULT_INPUT,priority:'balanced' as const,campaign:{name:'가을 립틴트',product:'매일 쓰는 립틴트',goal:'awareness' as const,targetCustomer:'바쁜 직장인'}};
const session:SavedSession={version:5,brief,selected:['C0077'],compared:[],notes:{},decisions:{},work:{}};
const c=(id:string)=>all.find(c=>c.id===id)!;
describe('캠페인 격리와 이전',()=>{
 it('기존 단일 캠페인의 후보를 새 저장 구조로 보존한다',()=>{const b=readBook(null,JSON.stringify(session));expect(b.campaigns[0].session?.selected).toEqual(['C0077']);});
 it('두 캠페인에서 같은 크리에이터를 독립적으로 관리한다',()=>{
  const b=readBook(null,JSON.stringify(session));const id=b.activeId;
  b.campaigns.push({id:'second',createdAt:'2026-09-22',session:{...session,selected:[],notes:{C0077:'두 번째 캠페인 메모'}}});
  const updated=saveCampaign(b,id,{...session,notes:{C0077:'첫 캠페인 메모'}});
  expect(updated.campaigns[1].session?.selected).toEqual([]);expect(updated.campaigns[1].session?.notes.C0077).toBe('두 번째 캠페인 메모');expect(updated.campaigns[0].session?.notes.C0077).toBe('첫 캠페인 메모');
 });
 it('손상된 저장을 복구하고 중복 캠페인 ID를 제외한다',()=>{expect(readBook('{bad',JSON.stringify(session)).campaigns[0].session?.selected).toEqual(['C0077']);const b=readBook(null);b.campaigns.push(b.campaigns[0]);expect(readBook(JSON.stringify(b)).campaigns).toHaveLength(1);});
});
describe('검색과 콘텐츠 근거',()=>{
 it('사용자 키워드는 정규화하며 사전에 없는 단어도 받는다',()=>{expect(cleanKeywords([' #민감성피부 ','민감성피부','나만의키워드'])).toEqual(['민감성피부','나만의키워드']);});
 it('포함 OR와 제외 우선순위가 독립적으로 동작한다',()=>{expect(keywordMatches(c('C0077'),['출근룩','없는말'],[])).toBe(true);expect(keywordMatches(c('C0077'),['출근룩'],['가방'])).toBe(false);expect(keywordMatches(c('C0077'),['없는말'],[])).toBe(false);});
 it('콘텐츠가 없는 후보의 카테고리는 찾고 없는 콘텐츠는 만들지 않는다',()=>{const person=all.find(c=>!contentFor(c.id))!;expect(keywordMatches(person,[person.category],[])).toBe(true);expect(contentNarrative(person,brief)).toBeNull();});
 it('자연어의 제외 조건이 포함 조건으로 뒤집히지 않는다',()=>{const draft=searchDraft('인스타그램 미니멀 출근룩, 화려한 스타일은 제외',brief.campaign);expect(draft.includeKeywords).toContain('미니멀');expect(draft.excludeKeywords).toContain('화려한');expect(draft.includeKeywords).not.toContain('화려한');expect(draft.searchPlatform).toBe('인스타그램');});
 it('광고 댓글 표본을 전체 댓글 수로 나누지 않는다',()=>{const d=contentFor('C0180')!,s=contentStats(d.posts);expect(s.adCount).toBe(2);expect(s.sampleCount).toBe(13);expect(s.adViews).toBe(9550);expect(s.purchaseIntent).toBe(3);expect(s.productQuestions).toBe(5);expect(s.positive+s.neutral+s.negative).toBe(s.sampleCount);});
 it('광고 자료가 없으면 0회 광고 성과로 표현하지 않는다',()=>{const s=contentStats(contentFor('C0036')!.posts);expect(s.adViews).toBeNull();expect(s.adCount).toBe(0);});
 it('예시 콘텐츠가 기본 순위에 추가 가산되지 않는다',()=>{const before=recommend(all,DEFAULT_INPUT).matched.map(x=>[x.creator.id,x.score]);contentStats(CONTENT_LIBRARY.flatMap(d=>d.posts));expect(recommend(all,DEFAULT_INPUT).matched.map(x=>[x.creator.id,x.score])).toEqual(before);});
 it('직장인 캠페인에서 파티 콘텐츠의 한계를 설명하고 출처를 내보낸다',()=>{expect(contentNarrative(c('C0155'),brief)).toContain('조율이 필요');const report=creatorReport(c('C0180'),brief);expect(report).toContain('예시');expect(report).toContain('실제 구매가 아닙니다');expect(report).toContain('컬러룸');});
});
