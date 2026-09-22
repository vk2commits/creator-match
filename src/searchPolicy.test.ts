import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {DEFAULT_INPUT} from './policy';
import {CONTENT_LIBRARY,matchEvidence} from './creatorContent';
import type {CreatorContent} from './creatorContent';
import {assessSearch,partitionSearch} from './searchPolicy';
import {searchDraft} from './discovery';
import type {Campaign} from './campaign';
import {readSession} from './experience';

const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const c=(id:string)=>all.find(x=>x.id===id)!;
const bare=all.find(x=>!CONTENT_LIBRARY.some(d=>d.creatorId===x.id))!;
const campaign:Campaign={name:'출근 준비 캠페인',product:'립틴트',goal:'awareness'};
const inspect=(id:string,include:string[],exclude:string[]=[],extra:Partial<Campaign>={})=>assessSearch(c(id),{...campaign,includeKeywords:include,excludeKeywords:exclude,...extra},CONTENT_LIBRARY);

describe('자료 범위를 보존하는 검색',()=>{
 it('자료 없음은 키워드 부적합과 구분한다',()=>{
  const result=assessSearch(bare,{...campaign,includeKeywords:['미니멀']},CONTENT_LIBRARY);
  expect(result.state).toBe('unverified');expect(result.hits).toEqual([]);
  expect(inspect('C0180',['미니멀']).reason).toBe('missing-keywords');
 });
 it('자료가 없어도 CSV에 있는 분야는 실제 근거로 찾는다',()=>{
  const result=assessSearch(bare,{...campaign,includeKeywords:[bare.category]},[]);
  expect(result.state).toBe('confirmed');expect(result.hits[0]).toMatchObject({source:'채널 정보',excerpt:bare.category});
 });
 it('분야가 맞아도 콘텐츠가 없어 제외 표현을 확인 못하면 미확인이다',()=>{
  expect(assessSearch(bare,{...campaign,includeKeywords:[bare.category],excludeKeywords:['화려한']},[]).state).toBe('unverified');
 });
 it('부분적인 포함 근거가 있어도 모두 포함 조건은 충족하지 않는다',()=>{
  expect(inspect('C0066',['미니멀','출근룩']).state).toBe('confirmed');
  const strict=inspect('C0066',['미니멀','출근룩'],[],{keywordMode:'all'});
  expect(strict.state).toBe('excluded');expect(strict.missing).toEqual(['출근룩']);
  expect(inspect('C0077',['미니멀','출근룩'],[],{keywordMode:'all'}).state).toBe('confirmed');
 });
 it('자료 없는 후보의 일부 필드 일치를 모든 표현의 충족으로 확장하지 않는다',()=>{
  expect(assessSearch(bare,{...campaign,includeKeywords:[bare.category,'미니멀'],keywordMode:'all'},[]).state).toBe('unverified');
 });
 it('포함과 제외에 동시에 있으면 제외 근거가 우선한다',()=>{
  const result=inspect('C0155',['발색'],['화려한']);
  expect(result.state).toBe('excluded');expect(result.reason).toBe('excluded-keyword');expect(result.exclusionHits[0].postId).toBe('155-1');
 });
 it('제외 검색만 있을 때 자료 없는 후보를 안전하다고 통과시키지 않는다',()=>{
  expect(inspect('C0180',[],['화려한']).state).toBe('confirmed');
  expect(assessSearch(bare,{...campaign,excludeKeywords:['화려한']},[]).state).toBe('unverified');
 });
 it('다른 플랫폼은 자료 부족 집합에도 섞이지 않는다',()=>{
  const p=partitionSearch([c('C0180'),bare],{...campaign,searchPlatform:'없는 채널',includeKeywords:['미니멀']});
  expect(p.platformExcluded).toHaveLength(2);expect(p.unverified).toHaveLength(0);expect(p.excluded).toHaveLength(0);
 });
 it('키워드·플랫폼을 해제하면 기존 후보와 정렬이 정확히 복원된다',()=>{
  const before=recommend(all,DEFAULT_INPUT).matched.map(x=>x.creator);
  const p=partitionSearch(before,campaign,CONTENT_LIBRARY);
  expect(p.confirmed).toEqual(before);expect(p.unverified).toEqual([]);expect(p.excluded).toEqual([]);
 });
 it('기본 21명을 확인2·자료부족17·검색제외2로 빠짐없이 나눈다',()=>{
  const before=recommend(all,DEFAULT_INPUT).matched.map(x=>x.creator);
  const p=partitionSearch(before,{...campaign,includeKeywords:['미니멀'],excludeKeywords:['화려한']},CONTENT_LIBRARY);
  expect(p.confirmed.map(x=>x.id).sort()).toEqual(['C0066','C0077']);expect(p.unverified).toHaveLength(17);expect(p.excluded).toHaveLength(2);
  expect(new Set([...p.confirmed,...p.unverified,...p.excluded,...p.platformExcluded].map(x=>x.id)).size).toBe(before.length);
  expect(p.unverified.map(x=>x.id)).toEqual(before.filter(x=>!CONTENT_LIBRARY.some(d=>d.creatorId===x.id)).map(x=>x.id));
 });
 it('검색 결과는 원본과 점수를 변경하지 않는다',()=>{
  const snapshot=JSON.stringify(all),before=recommend(all,DEFAULT_INPUT).matched.map(x=>[x.creator.id,x.score]);
  partitionSearch(all,{...campaign,includeKeywords:['발색'],excludeKeywords:['화려한']});
  expect(JSON.stringify(all)).toBe(snapshot);expect(recommend(all,DEFAULT_INPUT).matched.map(x=>[x.creator.id,x.score])).toEqual(before);
 });
 it('브랜드·정규화한 키워드도 실제 게시물 근거로 연결한다',()=>{
  const hit=matchEvidence(c('C0180'),['#컬러룸'],CONTENT_LIBRARY)[0];expect(hit.source).toBe('콘텐츠');expect(hit.postId).toBe('180-2');
  const material:CreatorContent={...CONTENT_LIBRARY[1],posts:[{...CONTENT_LIBRARY[1].posts[0],caption:'ＳＫＩＮ care'}]};
  expect(assessSearch(c('C0180'),{...campaign,includeKeywords:['skin']},[material]).state).toBe('confirmed');
 });
 it('등록 자료가 생기면 미확인에서 확인 또는 제외로 재분류한다',()=>{
  const profile={...CONTENT_LIBRARY[1],creatorId:bare.id,source:'user' as const};
  const query={...campaign,includeKeywords:['발색']};expect(assessSearch(bare,query,[]).state).toBe('unverified');expect(assessSearch(bare,query,[profile]).state).toBe('confirmed');
 });
 it('제외만 요청한 문장을 포함 키워드로 다시 넣지 않는다',()=>{
  const d=searchDraft('화려한 스타일은 제외',campaign);expect(d.includeKeywords).toEqual([]);expect(d.excludeKeywords).toContain('화려한');
 });
 it('저장 후 모두 포함을 복원하고 이전 저장에는 기본 방식을 적용한다',()=>{
  const saved={version:5,brief:{input:DEFAULT_INPUT,priority:'balanced',campaign:{...campaign,keywordMode:'all'}},selected:[],compared:[],notes:{},decisions:{},work:{}};
  expect(readSession(JSON.stringify(saved))?.brief.campaign?.keywordMode).toBe('all');
  expect(readSession(JSON.stringify({...saved,brief:{...saved.brief,campaign}}))?.brief.campaign?.keywordMode).toBe('any');
 });
});
