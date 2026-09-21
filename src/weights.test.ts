import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {WEIGHT_FIELDS,redistribute,validWeights} from './weights';
import {PRIORITIES,DEFAULT_INPUT} from './policy';
import {parseCreators,recommend,scoreCreator} from './domain';
import {candidateCautions,criteriaOf,evidence,handoffMarkdown,readSession} from './experience';
const all=parseCreators(readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8'));
const brief={input:DEFAULT_INPUT,priority:'balanced' as const};
describe('직접 비중 조절과 보존',()=>{
  it('모든 프리셋·지표·0~100%에서 합계100과 정수 비중을 유지한다',()=>{
    for(const p of PRIORITIES)for(const {key} of WEIGHT_FIELDS)for(let percent=0;percent<=100;percent++){
      const next=redistribute(p.weights,key,percent);
      expect(validWeights(next)).toBe(true);expect(next[key]).toBe(percent/100);
      expect(Object.values(next).map(x=>Math.round(x*100)).reduce((a,b)=>a+b,0)).toBe(100);
      expect(redistribute(p.weights,key,percent)).toEqual(next);
    }
  });
  it('나머지가0인 상태에서 다시 내리면 세 지표로 나누고 원본은 보존한다',()=>{
    const previous={engagement:1,views:0,rating:0,experience:0};
    expect(redistribute(previous,'engagement',0)).toEqual({engagement:0,views:.34,rating:.33,experience:.33});
    expect(previous.engagement).toBe(1);
    expect(redistribute(PRIORITIES[0].weights,'views',80)).toEqual({engagement:.13,views:.8,rating:.04,experience:.03});
    expect(()=>redistribute(previous,'engagement',-1)).toThrow();expect(()=>redistribute(previous,'engagement',1.5)).toThrow();
  });
  it('잘못된 저장 비중은 거부하고 정상 비중·메모·선정 상태를 복원한다',()=>{
    const customWeights={engagement:0,views:1,rating:0,experience:0};
    const saved={version:4,brief:{...brief,customWeights},selected:['C0077'],compared:[],notes:{C0077:'조회수 비교'},decisions:{C0077:'contact',missing:'hold'}};
    const restored=readSession(JSON.stringify(saved));
    expect(restored?.brief.customWeights).toEqual(customWeights);expect(restored?.decisions).toEqual({C0077:'contact'});
    for(const invalid of [{engagement:1},[1,0,0,0],{...customWeights,views:2},{...customWeights,rating:-1},{...customWeights,extra:0}])expect(readSession(JSON.stringify({...saved,brief:{...brief,customWeights:invalid}}))).toBeNull();
  });
  it('직접 설정은 조건 충족 집합을 바꾸지 않고 필터 변경 뒤에도 같은 비중이다',()=>{
    const customWeights={engagement:0,views:1,rating:0,experience:0};const draft={...brief,customWeights};
    const a=recommend(all,brief.input),b=recommend(all,draft.input,'cohort',criteriaOf(draft).weights);
    expect(b.matched.map(x=>x.creator.id).sort()).toEqual(a.matched.map(x=>x.creator.id).sort());
    expect(criteriaOf({...draft,input:{...draft.input,budgetKRW:1}}).weights).toEqual(customWeights);
    expect(b.needsQuote).toHaveLength(3);
  });
  it('평점 또는 경험만 선택해도0% 지표를 추천 이유로 쓰지 않는다',()=>{
    expect(evidence(scoreCreator(all[0],all,'cohort',{engagement:0,views:0,rating:1,experience:0})).title).toContain('광고주 평점');
    expect(evidence(scoreCreator(all[0],all,'cohort',{engagement:0,views:0,rating:0,experience:1})).title).toContain('광고 집행');
  });
});
describe('문의 후보와 팀 검토안',()=>{
  it('한 명의 문의 후보로 완료할 수 있고 보류는 별도로 남긴다',()=>{
    const a=all.find(c=>c.id==='C0077')!,b=all.find(c=>c.id==='C0066')!;
    const text=handoffMarkdown([a,b],brief,all,{[a.id]:'도달 지표를 우선 검토',[b.id]:'최근 콘텐츠 확인 필요'},{[a.id]:'contact',[b.id]:'hold'});
    expect(text).toContain('1명을 견적 문의 대상으로');expect(text).toContain('도달 지표를 우선 검토');expect(text).toContain('보류한 후보: '+b.name);expect(text).not.toContain('### '+b.name);expect(text).toContain('실제 문의는 발송하지 않았습니다');
  });
  it('비용 미확인 후보는 문의 대상이어도 예산 충족이나 추천 점수를 만들지 않는다',()=>{
    const c=all.find(c=>c.id==='C0036')!;const text=handoffMarkdown([c],brief,all,{[c.id]:'견적 확인 후 검토'},{[c.id]:'contact'});
    expect(text).toContain('비용 미확인');expect(text).toContain('현재 추천의 우선순위 비교에서 제외');expect(text).not.toContain('조건 충족');
    expect(candidateCautions(c,brief)).toHaveLength(3);
  });
  it('정상 후보에게 빈 주의사항을 만들지 않고 예산이 바뀌면 구체적인 차액을 보여준다',()=>{
    const c=all.find(c=>c.id==='C0077')!;
    expect(candidateCautions(c,brief)).toEqual([]);
    expect(candidateCautions(c,{...brief,input:{...brief.input,budgetKRW:1}})[0]).toContain('779,999원');
  });
  it('검토안이 직접 설정한 실제 비중을 사용한다',()=>{
    const c=all.find(c=>c.id==='C0077')!;
    const text=handoffMarkdown([c],{...brief,customWeights:{engagement:0,views:1,rating:0,experience:0}},all,{[c.id]:'조회수 우선'},{[c.id]:'contact'});
    expect(text).toContain('기준: 직접 설정');expect(text).toContain('조회수 100%');
  });
});
