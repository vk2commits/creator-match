import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {budgetEvidence,parseCreators,recommend,scoreCreator} from './domain';
import {CATEGORIES,DEFAULT_INPUT,PRIORITIES,TIERS} from './policy';
import {candidateStatus,comparisonMarkdown,comparisonReason,evidence,formatBudget,readSession,toggleCompared} from './experience';
import {loadCreators} from './loadData';
const raw=readFileSync(new URL('../public/data/dummy_creators.csv',import.meta.url),'utf8');
const all=parseCreators(raw);
const brief={input:DEFAULT_INPUT,priority:'response' as const};
describe('사용자 기준과 데이터',()=>{
  it.each(PRIORITIES.map(p=>[p.id,p] as const))('%s에서 자격 조건과 점수 설명이 유지된다',(_id,p)=>{
    expect(Object.values(p.weights).reduce((a,b)=>a+b,0)).toBeCloseTo(1);
    for(const category of CATEGORIES)for(const t of TIERS)for(const budgetKRW of [1,300000,1000000,2000000,10000000]){
      const input={budgetKRW,categories:[category],sizeTier:t.id};
      const baseline=recommend(all,input);const current=recommend(all,input,'cohort',p.weights);
      expect(current.matched.map(x=>x.creator.id).sort()).toEqual(baseline.matched.map(x=>x.creator.id).sort());
      for(const item of current.matched)expect(item.score).toBeCloseTo(item.components.reduce((sum,c)=>sum+c.points,0),10);
    }
  });
  it('기준 변경은 실제로 같은 적격 후보의 우선순위를 바꾼다',()=>{
    const response=recommend(all,DEFAULT_INPUT,'cohort',PRIORITIES[0].weights);
    const reach=recommend(all,DEFAULT_INPUT,'cohort',PRIORITIES[1].weights);
    expect(response.matched[0].creator.id).not.toBe(reach.matched[0].creator.id);
    expect(response.matched).toHaveLength(21);expect(response.needsQuote).toHaveLength(3);
  });
  it('숫자 입력에 천 단위를 표시하고 잘못된 문자 입력을 숨기지 않는다',()=>{
    expect(formatBudget('2000000')).toBe('2,000,000');expect(formatBudget('2,000,000')).toBe('2,000,000');expect(formatBudget('')).toBe('');expect(formatBudget('-1')).toBe('-1');expect(formatBudget('1.5')).toBe('1.5');
  });
});
describe('저장과 비교 메모',()=>{
  it('이전 형식·손상·부정확한 조건을 복구한다',()=>{
    for(const raw of [null,'broken','{}',JSON.stringify({version:2,brief:{input:{...DEFAULT_INPUT,categories:[]},priority:'response'},selected:[]}),JSON.stringify({version:2,brief:{...brief,priority:'unknown'},selected:[]})])expect(readSession(raw)).toBeNull();
  });
  it('이전 저장을 이전하면서 모든 후보를 보관하고 비교만 3명으로 제한한다',()=>{
    const s=readSession(JSON.stringify({version:2,brief,selected:['C0001','C0001','C0002','C0003','C0004']}));
    expect(s?.version).toBe(4);expect(s?.selected).toEqual(['C0001','C0002','C0003','C0004']);expect(s?.compared).toEqual(['C0001','C0002','C0003']);expect(s?.brief).toEqual(brief);
  });
  it('메모는 원본 지표·미확인 상태·조건 변경과 다음 검토를 보존한다',()=>{
    const candidate=all.find(c=>c.campaigns===0)!;
    const text=comparisonMarkdown([candidate,all[0]],brief,all);
    expect(text).toContain(candidate.id);expect(text).toContain('비용 미확인');expect(text).toContain('누적 집행액');expect(text).toContain('채널 URL');expect(text).toContain('0원은 무료를 뜻하지 않습니다.');
  });
});
describe('데이터 불러오기 실패와 재시도',()=>{
  it('HTTP 실패 후 같은 로더의 재시도로 복구한다',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(raw));
    await expect(loadCreators(fetcher)).rejects.toThrow('데이터 요청');await expect(loadCreators(fetcher)).resolves.toHaveLength(200);
  });
  it('HTML 오류 페이지를 CSV인 것처럼 표시하지 않는다',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response('<html>error</html>'));
    await expect(loadCreators(fetcher)).rejects.toThrow();
  });
});


describe('이번 검토의 회귀 방지',()=>{
  it('새 저장에서는 후보 순서·비교·작성한 메모가 함께 복원된다',()=>{
    const selected=['C0077','C0066','C0180','C0167'];
    const restored=readSession(JSON.stringify({version:3,brief,selected,compared:['C0066','C0077','missing','C0066'],notes:{C0066:'콘텐츠 확인',missing:'제외'}}));
    expect(restored?.selected).toEqual(selected);expect(restored?.compared).toEqual(['C0066','C0077']);expect(restored?.notes).toEqual({C0066:'콘텐츠 확인'});
  });
  it('비교 네 번째 선택은 기존 세 명을 보존하며 해제 후 교체할 수 있다',()=>{
    const ids=['a','b','c'];expect(toggleCompared(ids,'d')).toEqual(ids);
    expect(toggleCompared(toggleCompared(ids,'b'),'d')).toEqual(['a','c','d']);expect(ids).toEqual(['a','b','c']);
  });
  it('비교 집단을 넓히면 중간값·설명도 같은 20명을 참조한다',()=>{
    const synthetic=Array.from({length:20},(_,i)=>({...all[0],id:'F'+i,followers:i<2?1000:200000,views:i<2?(i+1)*100:(i-1)*1000,platform:'유튜브' as const}));
    const item=scoreCreator(synthetic[0],synthetic,'cohort',{engagement:0,views:1,rating:0,experience:0});
    expect(item.cohort.fallback).toBe(true);expect(item.cohort.size).toBe(20);expect(item.cohort.medians.views).toBe(8500);
    expect(evidence(item).detail).toContain('8,500회');expect(evidence(item).detail).toContain('20명');expect(evidence(item).detail).not.toContain('150회');
  });
  it('신규 27명에 거짓 불일치 설명이나 종합점수를 노출하지 않는다',()=>{
    for(const c of all.filter(c=>c.campaigns===0)){
      expect(budgetEvidence(c)).not.toContain('일치하지');expect(budgetEvidence(c)).toContain('견적 확인');
      const text=comparisonMarkdown([c],brief,all);expect(text).not.toContain('일치하지');expect(text).not.toContain('점수 기여');
    }
  });
  it('가격이 알려져 있고 산술이 일치하는 합성 후보도 올바르게 설명한다',()=>{
    const c={...all[0],totalBudget:all[0].averageBudget*all[0].campaigns};expect(budgetEvidence(c)).not.toContain('일치하지');expect(budgetEvidence(c)).toContain('현재 견적');
  });
  it('평점 대체값을 중립적 관측 평점으로 표현하지 않는다',()=>{
    const item=scoreCreator({...all[0],rating:null},all);const rating=item.components.find(c=>c.key==='rating')!;
    expect(rating.normalized).toBe(50);expect(rating.explanation).toContain('계산 대체값');expect(rating.explanation).not.toContain('중립');
  });
  it('상대 후보와의 차이를 기여도에서 찾고 단독 후보는 비교를 만들지 않는다',()=>{
    const result=recommend(all,{budgetKRW:1000000,categories:['뷰티'],sizeTier:'micro'});
    const first=result.matched[0];expect(first.creator.id).toBe('C0180');expect(result.matched[1].creator.id).toBe('C0177');
    expect(comparisonReason(first,result.matched.slice(0,2))).toContain('평균 조회수');expect(comparisonReason(first,[first])).toContain('다른 후보가 없습니다');
  });
  it('같은 구성의 후보는 억지 장점 대신 동점을 설명한다',()=>{
    const item=scoreCreator(all[0],all);const other={...item,creator:{...item.creator,id:'other',name:'같은 후보'}};
    expect(comparisonReason(item,[item,other])).toContain('점수 구성이 같습니다');
  });
  it('메모에 사용자의 판단을 포함하고 조건 밖 후보는 순위 비교에서 제외한다',()=>{
    const c=all[0];const changed={...brief,input:{...brief.input,budgetKRW:1}};
    const text=comparisonMarkdown([c],changed,all,{[c.id]:'브랜드 | 콘텐츠\n견적 확인'});
    expect(text).toContain('브랜드 \\| 콘텐츠<br>견적 확인');expect(text).toContain('현재 예산 초과');expect(text).not.toContain('점수 기여');
    expect(candidateStatus(c,changed)).toBe('현재 예산 초과');
  });
});
