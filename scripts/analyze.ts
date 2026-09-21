import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseCreators, recommend, hasKnownBudget } from '../src/domain';
import { CATEGORIES, TIERS, WEIGHTS, SOURCE_SHA256, DEFAULT_INPUT, tierOf } from '../src/policy';
import type { Weights } from '../src/policy';

const raw = readFileSync(new URL('../public/data/dummy_creators.csv', import.meta.url));
const hash = createHash('sha256').update(raw).digest('hex');
if (hash !== SOURCE_SHA256) throw new Error('원본 해시가 다릅니다. 분석을 중단합니다.');
const all = parseCreators(raw.toString('utf8'));
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const median = (values: number[]) => { const a = [...values].sort((a,b) => a-b); return a.length % 2 ? a[Math.floor(a.length / 2)] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const corr = (a: number[], b: number[]) => {
  const x = mean(a), y = mean(b);
  return a.reduce((s, v, i) => s + (v-x)*(b[i]-y), 0) / Math.sqrt(a.reduce((s, v) => s + (v-x)**2, 0) * b.reduce((s,v) => s+(v-y)**2, 0));
};
const known = all.filter(hasKnownBudget);
const mismatch = known.filter(c => c.averageBudget * c.campaigns !== c.totalBudget);
const groups = TIERS.flatMap(t => ['유튜브','인스타그램'].map(p => {
  const rows = all.filter(c => tierOf(c.followers) === t.id && c.platform === p);
  return { tier: t.label, platform:p, n:rows.length, engagement:mean(rows.map(c => c.engagement)), views:median(rows.map(c => c.views)) };
}));
const audit = {
  hash, rows: all.length, categories: CATEGORIES.map(category => ({ category, count:all.filter(c => c.category === category).length })),
  needsQuote: all.length - known.length, nullRatings:all.filter(c=>c.rating === null).length, mismatches:mismatch.length,
  followersViewsCorrelation:corr(all.map(c=>c.followers),all.map(c=>c.views)),
  followersEngagementCorrelation:corr(all.map(c=>c.followers),all.map(c=>c.engagement)), groups,
};
mkdirSync('docs', { recursive:true });
writeFileSync('docs/DATA_AUDIT.md', '# 데이터 감사\n\n원본 CSV를 읽어 `npm run analyze`로 재생성한다. 더미 데이터에서의 기술 통계이며 실제 시장을 대표하지 않는다.\n\n'
  + '- 행 수: '+all.length+'명, 카테고리 '+CATEGORIES.length+'개, 플랫폼 2개. 중복 ID·필수 숫자 오류 없음.\n'
  + '- 견적 미확인: '+audit.needsQuote+'명, 평점 공란: '+audit.nullRatings+'명. 원본의 동일한 27명에 해당한다.\n'
  + '- 유이력 평균 예산: '+Math.min(...known.map(c=>c.averageBudget)).toLocaleString('ko-KR')+'~'+Math.max(...known.map(c=>c.averageBudget)).toLocaleString('ko-KR')+'원.\n'
  + '- 누적 예산과 평균 예산×건수의 불일치: '+mismatch.length+'/'+known.length+'명. 원인을 단정하거나 원본을 수정하지 않는다.\n'
  + '- SHA-256: `'+hash+'`\n\n'
  + '## 규모·플랫폼별 분포\n\n| 규모 | 플랫폼 | 표본 | 평균 참여율 | 조회수 중앙값 |\n|---|---|---:|---:|---:|\n'
  + groups.map(g=>'| '+g.tier+' | '+g.platform+' | '+g.n+' | '+g.engagement.toFixed(2)+'% | '+g.views.toLocaleString('ko-KR')+' |').join('\n')
  + '\n\n팔로워-조회수 피어슨 상관: '+audit.followersViewsCorrelation.toFixed(4)+'. 팔로워-참여율: '+audit.followersEngagementCorrelation.toFixed(4)+'. 인과 관계나 실제 시장 특성으로 일반화하지 않는다. 팔로워와 조회수를 모두 가산하면 규모를 중복 반영할 가능성이 있어 팔로워는 필터로만 사용한다.\n\n'
  + '## 필드 해석\n\n| 원본 필드 | 사용 | 해석 한계 |\n|---|---|---|\n'
  + '| creator_id / creator_name | 식별·동점·표시 | 실존 채널로 연결하지 않음 |\n| category / platform | 조건·참조 집단 | 세부 콘텐츠와 오디언스 정보 없음 |\n| followers | 규모 필터·표시 | 참여·구매를 증명하지 않음 |\n| avg_view_count | 상대 점수·표시 | 집계 기간·광고 전용 조회수 아님 |\n| engagement_rate | 상대 점수·표시 | 정의·분모·기간 미제공 |\n| total_campaign_count | 체감 가산·표시 | 성공 건수나 평점 표본 수 아님 |\n| total_campaign_budget_krw | 감사에만 사용 | 평균 필드와 불일치 원인 미상 |\n| avg_campaign_budget_krw | 참고 예산 필터·표시 | 현재 단가·세금·권리 범위 미확인 |\n| advertiser_rating | 1~5 관측 점수·표시 | 공란은 미평가, 표본 수 미상 |\n\n'
  + '## 정규화·오류 처리\n\n원본을 수정하지 않고 메모리에서 숫자·null로 변환한다. 잘못된 CSV·중복 ID·필수 결측·범위 밖 숫자는 명시적 오류로 중단한다. 잘못된 행을 조용히 삭제하지 않는다. 모든 행에 발생하는 예산 산술 불일치는 알려진 한계로 보존한다.\n');

const budgets = [1, 300_000, 1_000_000, 2_000_000, 10_000_000];
const scenarios = CATEGORIES.flatMap(category=>TIERS.flatMap(t=>budgets.map(budgetKRW=>({budgetKRW,categories:[category],sizeTier:t.id}))));
let nonempty=0, changedA=0, changedB=0, violations=0;
const overlap:number[]=[];
const exampleChanges:{category:string;tier:string;budget:number;a:string;b:string;c:string}[]=[];
const variants = (Object.keys(WEIGHTS) as (keyof Weights)[]).flatMap(key=>[0.8,1.2].map(factor=>{
  const w={...WEIGHTS} as Weights; w[key]*=factor;
  const sum=Object.values(w).reduce((a,b)=>a+b,0);
  for(const k of Object.keys(w) as (keyof Weights)[])w[k]/=sum;
  return {key,factor,weights:w};
}));
let sensitivityComparisons=0, sensitivityTop1Changes=0;
const sensitivityOverlaps:number[]=[];
for(const input of scenarios){
  const c=recommend(all,input), b=recommend(all,input,'simple');
  const a=[...c.matched].sort((a,b)=>b.creator.followers-a.creator.followers||a.creator.id.localeCompare(b.creator.id));
  violations+=c.matched.filter(x=>!hasKnownBudget(x.creator)||x.creator.averageBudget>input.budgetKRW||!input.categories.includes(x.creator.category)||tierOf(x.creator.followers)!==input.sizeTier).length;
  if(!c.matched.length)continue;
  nonempty++;
  const cid=c.matched[0].creator.id;
  if(a[0].creator.id!==cid)changedA++;
  if(b.matched[0].creator.id!==cid)changedB++;
  const top3=c.matched.slice(0,3).map(c=>c.creator.id);
  overlap.push(b.matched.slice(0,3).filter(c=>top3.includes(c.creator.id)).length/top3.length);
  if(b.matched[0].creator.id!==cid&&exampleChanges.length<6)exampleChanges.push({category:input.categories[0],tier:input.sizeTier,budget:input.budgetKRW,a:a[0].creator.id,b:b.matched[0].creator.id,c:cid});
  for(const variant of variants){
    const changed=recommend(all,input,'cohort',variant.weights).matched;
    sensitivityComparisons++;
    if(changed[0].creator.id!==cid)sensitivityTop1Changes++;
    sensitivityOverlaps.push(changed.slice(0,3).filter(c=>top3.includes(c.creator.id)).length/top3.length);
  }
}
const demo=recommend(all,DEFAULT_INPUT).matched.slice(0,5);
const evaluation={scenarios:scenarios.length,nonempty,violations,changedA,changedB,meanTop3Overlap:mean(overlap),sensitivityComparisons,sensitivityTop1Changes,sensitivityMeanTop3Overlap:mean(sensitivityOverlaps),exampleChanges,demo};
writeFileSync('docs/evaluation.json',JSON.stringify({audit,evaluation},null,2)+'\n');
writeFileSync('docs/EVALUATION.md','# 추천 방식 비교와 민감도\n\n`npm run analyze`로 원본 전체와 동일한 추천 함수를 사용해 재생성한다. 정답 성과가 없으므로 정확도·매출 개선 실험이 아니다.\n\n'
  +'## 비교 설계\n\nA는 적격 후보의 팔로워순, B는 전체 데이터 상대 위치를 쓰는 가중 점수, C는 플랫폼×규모 집단의 상대 위치를 쓰는 같은 가중 점수다. 세 방식 모두 동일한 예산·카테고리·규모 필터와 견적 미확인 분리 정책을 적용한다. 일부러 결함 있는 기준과 비교하지 않는다.\n\n'
  +'10개 단일 카테고리 × 3개 규모 × 5개 예산(1 / 300,000 / 1,000,000 / 2,000,000 / 10,000,000원) = '+scenarios.length+'개 조건. 다중 카테고리는 별도 단위·브라우저 테스트에서 검증한다.\n\n'
  +'| 측정 | 결과 | 의미 |\n|---|---:|---|\n'
  +'| 적격 후보가 있는 조건 | '+nonempty+'/'+scenarios.length+' | 빈 결과도 정상 경우 |\n'
  +'| C의 필수 조건 위반 | '+violations+' | 현재 데이터·조건에서 확인 |\n'
  +'| A와 C의 1위 차이 | '+changedA+'/'+nonempty+' | 순위가 달라짐, 품질 향상 증거 아님 |\n'
  +'| B와 C의 1위 차이 | '+changedB+'/'+nonempty+' | 집단 보정의 영향 |\n'
  +'| B와 C의 상위 3명 평균 겹침 | '+(mean(overlap)*100).toFixed(1)+'% | 후보가 3명 미만이면 실제 수로 나눔 |\n'
  +'| 가중치 변형 비교 | '+sensitivityComparisons+'회 | 각 가중치 ±20% 상대 변경 후 합 1로 재조정 |\n'
  +'| 가중치 변형의 1위 변경 | '+sensitivityTop1Changes+'/'+sensitivityComparisons+' | 민감한 조건이 존재할 수 있음 |\n'
  +'| 가중치 변형의 상위 3명 평균 겹침 | '+(mean(sensitivityOverlaps)*100).toFixed(1)+'% | 안정성의 관찰, 최적성 아님 |\n\n'
  +'## 집단 보정으로 1위가 달라진 사례\n\n| 카테고리 | 규모 | 예산 | A | B | C |\n|---|---|---:|---|---|---|\n'
  +exampleChanges.map(x=>'| '+x.category+' | '+x.tier+' | '+x.budget+' | '+x.a+' | '+x.b+' | '+x.c+' |').join('\n')
  +'\n\n## 기본 화면 실제 후보\n\n뷰티·패션, 마이크로, 2,000,000원. 점수는 소수점 둘째 자리에서 반올림하며 정렬은 반올림 전 값이다.\n\n| ID | 이름 | 플랫폼 | 점수 | 참여 기여 | 조회 기여 | 평점 기여 | 경험 기여 |\n|---|---|---|---:|---:|---:|---:|---:|\n'
  +demo.map(x=>'| '+[x.creator.id,x.creator.name,x.creator.platform,x.score.toFixed(1),...x.components.map(c=>c.points.toFixed(2))].join(' | ')+' |').join('\n')
  +'\n\n## 선택과 한계\n\nC를 채택한다. 플랫폼별 지표 정의가 같다고 가정하지 않고, 모든 후보에 비교 집단과 표본 수를 설명할 수 있다는 제품상의 이점이 있다. 실험에서 C가 실제 캠페인 성과를 개선한다고 입증한 것은 아니다. 상대 순위가 절대 차이를 줄이고, 카테고리·기간 차이를 해소하지 못하며, 작은 집단의 단일 관측치 변화에 민감할 수 있다. 원지표와 개별 정렬을 유지한다. 더 많은 실제 성과 데이터가 생기기 전에는 수식을 복잡하게 확장하지 않는다.\n');
console.log(JSON.stringify({rows:all.length,hash,scenarios:scenarios.length,nonempty,violations,changedA,changedB,sensitivityTop1Changes,sensitivityComparisons,demo:demo.map(x=>({id:x.creator.id,name:x.creator.name,score:x.score}))},null,2));

