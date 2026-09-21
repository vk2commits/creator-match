import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseCreators, parseBudget, validateInput, recommend, scoreCreator, percentile, hasKnownBudget, sortMatches } from './domain';
import type { Creator, MatchInput } from './domain';
import { SOURCE_SHA256, CATEGORIES, TIERS, DEFAULT_INPUT, tierOf } from './policy';

const text = readFileSync(new URL('../public/data/dummy_creators.csv', import.meta.url), 'utf8');
const creators = parseCreators(text);
const fixture = (changes: Partial<Creator> = {}): Creator => ({ id:'F001',name:'테스트',category:'뷰티',platform:'유튜브',followers:10_000,views:1000,engagement:5,campaigns:1,totalBudget:100,averageBudget:100,rating:4,...changes });
const input:MatchInput={budgetKRW:100,categories:['뷰티'],sizeTier:'micro'};

describe('원본과 CSV',()=>{
  it('원본 해시와 200명을 유지한다',()=>{ expect(createHash('sha256').update(text).digest('hex')).toBe(SOURCE_SHA256);expect(creators).toHaveLength(200);expect(new Set(creators.map(c=>c.id)).size).toBe(200); });
  it('27명의 결측과 가격 미확인을 구분한다',()=>{expect(creators.filter(c=>c.rating===null)).toHaveLength(27);expect(creators.filter(c=>!hasKnownBudget(c))).toHaveLength(27);expect(creators.find(c=>c.id==='C0001')!.engagement).toBe(7.7);});
  it('예산 산술 불일치를 원본 그대로 유지한다',()=>{expect(creators.filter(hasKnownBudget).filter(c=>c.averageBudget*c.campaigns!==c.totalBudget)).toHaveLength(173);});
  it('BOM과 CRLF에서도 같은 정보를 읽는다',()=>{expect(parseCreators('\uFEFF'+text.replace(/\r?\n/g,'\r\n'))).toEqual(creators);});
  it('따옴표 안의 쉼표를 이름으로 유지한다',()=>{const modified=text.replace('시우로그1','"시우,로그1"');expect(parseCreators(modified)[0].name).toBe('시우,로그1');});
  it('중복 ID, 필드 누락, 필수 결측, 비정상 숫자를 거절한다',()=>{
    expect(()=>parseCreators(text.replace('C0002','C0001'))).toThrow();
    expect(()=>parseCreators(text.replace('avg_view_count','wrong'))).toThrow();
    expect(()=>parseCreators(text.replace(',47098,',',,'))).toThrow();
    expect(()=>parseCreators(text.replace(',47098,',',-1,'))).toThrow();
    expect(()=>parseCreators('')).toThrow();
  });
});

describe('입력과 경계',()=>{
  it.each(['','0','-1','1.2','1e6','1,000','Infinity','NaN','9007199254740992'])('%s는 유효 예산이 아니다',raw=>{expect(validateInput({...input,budgetKRW:parseBudget(raw)}).budget).toBeTruthy();});
  it('정수 1원·공백 정리를 허용한다',()=>{expect(parseBudget(' 1 ')).toBe(1);expect(validateInput({...input,budgetKRW:1})).toEqual({});});
  it('카테고리 미선택과 잘못된 규모를 거절한다',()=>{expect(validateInput({...input,categories:[]})).toHaveProperty('categories');expect(()=>recommend(creators,{...input,sizeTier:'bad' as never})).toThrow();});
  it.each([[9999,'nano'],[10000,'micro'],[99999,'micro'],[100000,'macro']] as const)('%i명은 %s', (n,tier)=>expect(tierOf(n)).toBe(tier));
  it('예산과 정확히 같으면 포함하고 1원 초과하면 제외한다',()=>{expect(recommend([fixture()],input).matched).toHaveLength(1);expect(recommend([fixture()],{...input,budgetKRW:99}).matched).toHaveLength(0);});
  it('카테고리를 OR로 적용하고 중복 후보를 만들지 않는다',()=>{const all=[fixture(),fixture({id:'F002',category:'패션'}),fixture({id:'F003',category:'게임'})];expect(recommend(all,{...input,categories:['뷰티','패션','뷰티']}).matched.map(c=>c.creator.id)).toEqual(['F001','F002']);});
});

describe('견적과 빈 결과',()=>{
  it('이력0·평균0을 무료로 추천하지 않는다',()=>{const r=recommend([fixture({campaigns:0,averageBudget:0,rating:null})],input);expect(r.matched).toHaveLength(0);expect(r.needsQuote).toHaveLength(1);expect(r.alternatives).toHaveLength(0);});
  it('이력이 있어도 평균0이면 견적 미확인이다',()=>{expect(recommend([fixture({averageBudget:0})],input).needsQuote).toHaveLength(1);});
  it('단일 후보·데이터 없음에서도 안전하게 처리한다',()=>{expect(recommend([],input).matched).toEqual([]);expect(recommend([fixture()],input).matched[0].score).toBeGreaterThanOrEqual(0);});
  it('최소 예산 제안과 적용 후 실제 후보 수가 일치한다',()=>{const r=recommend([fixture({averageBudget:120}),fixture({id:'F002',averageBudget:120})],input);expect(r.alternatives[0].count).toBe(2);expect(r.alternatives[0].input.budgetKRW).toBe(120);expect(recommend([fixture({averageBudget:120}),fixture({id:'F002',averageBudget:120})],r.alternatives[0].input).matched).toHaveLength(2);});
  it('규모 제안은 예산과 카테고리를 유지한다',()=>{const all=[fixture({followers:2000})];const alternative=recommend(all,input).alternatives[0];expect(alternative.input).toEqual({...input,sizeTier:'nano'});expect(recommend(all,alternative.input).matched).toHaveLength(alternative.count);});
});

describe('설명 가능한 점수',()=>{
  it('동점 중간 순위·단일집단을 처리한다',()=>{expect(percentile(1,[1,2,3])).toBe(0);expect(percentile(3,[1,2,3])).toBe(100);expect(percentile(2,[1,2,2,3])).toBe(50);expect(percentile(2,[2])).toBe(50);expect(percentile(2,[2,2])).toBe(50);});
  it('평점 공란은 중립 계산과 미평가 설명을 갖는다',()=>{const r=scoreCreator(fixture({rating:null}),[fixture({rating:null})]);expect(r.components.find(c=>c.key==='rating')!.normalized).toBe(50);expect(r.components.find(c=>c.key==='rating')!.explanation).toContain('미평가');expect(r.creator.rating).toBeNull();});
  it('모든 점수는 유한하고 구성요소 합과 같다',()=>{for(const creator of creators){const r=scoreCreator(creator,creators);expect(r.score).toBeGreaterThanOrEqual(0);expect(r.score).toBeLessThanOrEqual(100);expect(r.components.reduce((s,c)=>s+c.points,0)).toBeCloseTo(r.score,12);expect(r.cohort.size).toBeGreaterThanOrEqual(10);}});
  it('희소 집단은 플랫폼→전체로 명시적으로 대체한다',()=>{
    const all=Array.from({length:10},(_,i)=>fixture({id:String(i),followers:i===0?5000:15000}));
    const r=scoreCreator(all[0],all);expect(r.cohort.label).toBe('유튜브 전체 규모');expect(r.cohort.fallback).toBe(true);expect(scoreCreator(fixture(),[fixture()]).cohort.label).toBe('전체 데이터');
  });
  it('예산이나 카테고리 변경으로 같은 후보의 점수가 바뀌지 않는다',()=>{const a=recommend(creators,{...DEFAULT_INPUT,budgetKRW:10_000_000});const b=recommend(creators,{...DEFAULT_INPUT,budgetKRW:20_000_000,categories:[...CATEGORIES]});for(const c of a.matched){expect(b.matched.find(x=>x.creator.id===c.creator.id)!.score).toBe(c.score);}});
  it('동점은 ID, 평점 null은 마지막이며 원본 배열을 바꾸지 않는다',()=>{const all=[fixture({id:'Z'}),fixture({id:'A'}),fixture({id:'N',rating:null})];const scored=all.map(c=>scoreCreator(c,all));expect(sortMatches(scored,'rating').map(c=>c.creator.id)).toEqual(['A','Z','N']);expect(scored.map(c=>c.creator.id)).toEqual(['Z','A','N']);});
  it.each(['engagement','views','campaigns','rating','recommended'] as const)('%s 정렬은 내림차순이다',sort=>{const rows=sortMatches(recommend(creators,{...DEFAULT_INPUT,categories:[...CATEGORIES],budgetKRW:10_000_000}).matched,sort);const value=(i:number)=>sort==='recommended'?rows[i].score:sort==='engagement'?rows[i].creator.engagement:sort==='views'?rows[i].creator.views:sort==='campaigns'?rows[i].creator.campaigns:rows[i].creator.rating??-1;for(let i=1;i<rows.length;i++)expect(value(i-1)).toBeGreaterThanOrEqual(value(i));});
  it('나쁜 가중치로 결과를 만들지 않는다',()=>{expect(()=>scoreCreator(fixture(),[fixture()],'cohort',{engagement:1,views:1,rating:0,experience:0})).toThrow();});
});

describe('실제 데이터 전체 조건 검증',()=>{
  it('150개 조건에서 적격성·대안·신규 분리가 일관된다',()=>{
    for(const category of CATEGORIES)for(const tier of TIERS)for(const budgetKRW of [1,300_000,1_000_000,2_000_000,10_000_000]){
      const q={budgetKRW,categories:[category],sizeTier:tier.id};const r=recommend(creators,q);
      for(const x of r.matched){expect(x.creator.category).toBe(category);expect(tierOf(x.creator.followers)).toBe(tier.id);expect(x.creator.averageBudget).toBeLessThanOrEqual(budgetKRW);expect(hasKnownBudget(x.creator)).toBe(true);}
      for(const x of r.needsQuote)expect(hasKnownBudget(x)).toBe(false);
      for(const a of r.alternatives)expect(recommend(creators,a.input).matched).toHaveLength(a.count);
    }
  });
  it('같은 입력의 결과가 재현되며 원본 객체를 변경하지 않는다',()=>{const before=JSON.stringify(creators);expect(recommend(creators,DEFAULT_INPUT)).toEqual(recommend(creators,DEFAULT_INPUT));expect(JSON.stringify(creators)).toBe(before);});
});
