import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseCreators,recommend} from './domain';
import {CATEGORIES,DEFAULT_INPUT,PRIORITIES,TIERS} from './policy';
import {comparisonMarkdown,formatBudget,readSession} from './experience';
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
  it('현재 조건과 담은 후보를 읽되 중복 및 3명 한도를 정리한다',()=>{
    const s=readSession(JSON.stringify({version:2,brief,selected:['C0001','C0001','C0002','C0003','C0004']}));
    expect(s?.selected).toEqual(['C0001','C0002','C0003']);expect(s?.brief).toEqual(brief);
  });
  it('메모는 원본 지표·미확인 상태·조건 변경과 다음 검토를 보존한다',()=>{
    const candidate=all.find(c=>c.campaigns===0)!;
    const text=comparisonMarkdown([candidate,all[0]],brief,all);
    expect(text).toContain(candidate.id);expect(text).toContain('비용 미확인');expect(text).toContain('누적 집행액');expect(text).toContain('채널 URL');expect(text).not.toContain('무료');
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

