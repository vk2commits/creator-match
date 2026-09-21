import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseCreators, recommend, scoreCreator, hasKnownBudget, sortMatches } from '../src/domain';
import { CATEGORIES, TIERS, PRIORITIES, SOURCE_SHA256 } from '../src/policy';
import type { Weights } from '../src/policy';
const raw=readFileSync(new URL('../public/data/dummy_creators.csv', import.meta.url));
if(createHash('sha256').update(raw).digest('hex')!==SOURCE_SHA256)throw new Error('원본 해시가 다릅니다. 추가 진단을 중단합니다.');
const all = parseCreators(raw.toString('utf8'));
const keys = ['engagement','views','rating','experience'] as const;
const variants=(weights:Weights)=>keys.flatMap(key=>[.8,1.2].map(factor=>{
  const w={...weights};w[key]*=factor;const sum=Object.values(w).reduce((a,b)=>a+b,0);
  keys.forEach(k=>w[k]/=sum);return w;
}));
const scenarios=CATEGORIES.flatMap(category=>TIERS.flatMap(t=>[1,300000,1000000,2000000,10000000].map(budgetKRW=>({budgetKRW,categories:[category],sizeTier:t.id}))));
const meaningful=scenarios.filter(input=>recommend(all,input).matched.length>=3);
const unique=new Set(meaningful.map(input=>recommend(all,input).matched.map(x=>x.creator.id).sort().join(','))).size;
const metricSorts={response:'engagement',reach:'views',history:'campaigns',balanced:'recommended'} as const;
const evidence=PRIORITIES.map(p=>{
 let changes=0,overlap=0,total=0,singleMetricChanges=0;
 const removals=Object.fromEntries(keys.map(k=>[k,0]));
 for(const input of meaningful){
  const base=recommend(all,input,'cohort',p.weights).matched;const ids=base.slice(0,3).map(x=>x.creator.id);
  if(sortMatches(base,metricSorts[p.id])[0].creator.id!==base[0].creator.id)singleMetricChanges++;
  for(const w of variants(p.weights)){
   const changed=recommend(all,input,'cohort',w).matched;total++;
   if(changed[0].creator.id!==base[0].creator.id)changes++;
   overlap+=changed.slice(0,3).filter(x=>ids.includes(x.creator.id)).length/3;
  }
  for(const key of keys){
   const w:Weights={...p.weights};w[key]=0;const sum=Object.values(w).reduce((a,b)=>a+b,0);
   keys.forEach(k=>w[k]/=sum);
   if(recommend(all,input,'cohort',w).matched[0].creator.id!==base[0].creator.id)removals[key]++;
  }
 }
 return {id:p.id,label:p.label,conditions:meaningful.length,comparisons:total,top1Changed:changes,meanTop3Overlap:overlap/total,singleMetricTop1Changed:singleMetricChanges,removeMetricTop1Changed:removals};
});
const explanations=[];
for(const input of meaningful){
 const rows=recommend(all,input).matched;
 const first=rows[0],second=rows[1];
 const largest=[...first.components].sort((a,b)=>b.points-a.points)[0];
 const differences=first.components.map(a=>({key:a.key,label:a.label,delta:a.points-second.components.find(b=>b.key===a.key)!.points})).sort((a,b)=>b.delta-a.delta);
 if(largest.key!==differences[0].key)explanations.push({input,first:first.creator,second:second.creator,largestContribution:largest,largestRelativeAdvantage:differences[0],deltas:differences});
}
const reachCases=[];
for(const input of meaningful){
 const p=PRIORITIES.find(x=>x.id==='reach')!;
 const rows=recommend(all,input,'cohort',p.weights).matched;
 const high=sortMatches(rows,'views')[0];
 if(rows[0].creator.id!==high.creator.id)reachCases.push({input,recommended:rows[0].creator,maxViews:high.creator,recommendedScore:rows[0].score,maxViewsScore:high.score});
}
const known=all.filter(hasKnownBudget);
const sd=(a:number[])=>{const mean=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-mean)**2,0)/a.length);};
const componentSpread=keys.map(key=>{
 const a=known.map(c=>scoreCreator(c,all).components.find(x=>x.key===key)!.normalized);
 return {key,min:Math.min(...a),max:Math.max(...a),sd:sd(a)};
});
const synthetic=all.slice(0,20).map((c,i)=>({...c,platform:'유튜브' as const,followers:i<2?1000:200000,views:i<2?(i+1)*100:(i-1)*1000}));
const median=(values:number[])=>{const a=[...values].sort((a,b)=>a-b);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const fallback=scoreCreator(synthetic[0],synthetic,'cohort',{engagement:0,views:1,rating:0,experience:0});
const edgeCases={syntheticOnly:true,scoreCohort:fallback.cohort,currentUiExactPeerMedian:median(synthetic.filter(c=>c.followers<10000).map(c=>c.views)),actualScoreCohortMedian:median(synthetic.map(c=>c.views)),originalUnknownWithEqualBudgetFields:all.filter(c=>c.campaigns===0&&c.totalBudget===c.averageBudget*c.campaigns).length};
const result={dataset:'dummy_creators.csv; 200 rows; unchanged',scenarioCount:scenarios.length,minimumEligible:3,conditions:meaningful.length,uniqueEligibleSets:unique,evidence,explanationAudit:{conditions:meaningful.length,mismatches:explanations.length,examples:explanations.slice(0,2)},reachExpectation:{conditions:meaningful.length,mismatches:reachCases.length,examples:reachCases.slice(0,2)},componentSpread,edgeCases};
writeFileSync('docs/logic-review.json',JSON.stringify(result,null,2)+'\n');
const report='# 추천 설계 추가 진단\n\n2026-09-21. 기존 추천 정책을 바꾸지 않고 수행한 진단이다. `node --import tsx scripts/review-logic.ts`로 재현한다. 원본 CSV를 읽으며 수정하지 않는다. 현재 정책을 채택할 근거와 반대 사례를 함께 찾는다.\n\n'
+'## 표본과 해석\n\n150개 단일 분야×규모×예산 조건 중 적격 후보가 3명 이상인 '+meaningful.length+'조건을 분석했다. 후보 집합은 '+unique+'개로 중복이 있다. 이는 독립적인 사용자·캠페인 표본이 아니며, 평균 결과는 합성 조건을 같은 비중으로 집계한 값이다. 순위 변화는 추천 품질 개선을 뜻하지 않는다.\n\n'
+'## 모든 우선순위의 민감도\n\n각 비중을 하나씩 0.8배/1.2배로 바꾼 뒤 합을 1로 재조정했다. 각 기준별 47×8=376회. 20%포인트 변화가 아니다.\n\n| 기준 | 1위 변경 | 상위 3명 평균 겹침 | 해당 원지표 단순 정렬과 1위 차이 |\n|---|---:|---:|---:|\n'
+evidence.map(r=>'| '+r.label+' | '+r.top1Changed+'/'+r.comparisons+' | '+(r.meanTop3Overlap*100).toFixed(1)+'% | '+(r.id==='balanced'?'비교 안 함':r.singleMetricTop1Changed+'/'+r.conditions)+' |').join('\n')
+'\n\n단순 정렬은 반응=참여율순, 조회=평균 조회수순, 이력=집행 건수순이다. 이력 단순 정렬은 평점을 고려하지 않는 비교 기준이므로 추천의 정답으로 간주하지 않는다.\n\n'
+'## 지표를 하나씩 제거하면\n\n나머지 가중치 합을 1로 재조정했을 때 1위가 바뀐 조건 수. 영향 측정이며 해당 지표가 유용하다는 성과 증거는 아니다.\n\n| 기준 | 참여율 제외 | 조회수 제외 | 평점 제외 | 경험 제외 |\n|---|---:|---:|---:|---:|\n'
+evidence.map(r=>'| '+r.label+' | '+keys.map(k=>r.removeMetricTop1Changed[k]+'/'+r.conditions).join(' | ')+' |').join('\n')
+'\n\n## 설명의 정확성과 유용성을 구분\n\n균등 기준 1위의 최대 기여 지표와 2위 대비 최대 점수 차이를 만든 지표가 '+explanations.length+'/'+meaningful.length+'조건에서 다르다. 현재 UI는 최대 기여 지표를 보여준다. 계산 오류는 아니지만 “왜 다른 후보보다 앞서는가”에 충분히 답하지 못할 수 있다.\n\n'
+explanations.slice(0,2).map(x=>'- '+x.input.categories[0]+' / '+x.input.sizeTier+' / '+x.input.budgetKRW.toLocaleString('ko-KR')+'원: '+x.first.name+' vs '+x.second.name+'. 1위의 최대 기여는 '+x.largestContribution.label+'('+x.largestContribution.points.toFixed(2)+'점), 2위와의 최대 차이는 '+x.largestRelativeAdvantage.label+'(+'+x.largestRelativeAdvantage.delta.toFixed(2)+'점).').join('\n')
+'\n\n## 조회 우선의 의미\n\n현재 조회 규모 프리셋의 1위는 '+reachCases.length+'/'+meaningful.length+'조건에서 절대 조회수 1위와 다르다. 다른 3지표와 플랫폼별 상대 위치가 함께 반영되기 때문이다. “예상 도달 최대화”로 설명하면 맞지 않는다.\n\n'
+reachCases.slice(0,2).map(x=>'- '+x.input.categories[0]+' / '+x.input.sizeTier+' / '+x.input.budgetKRW.toLocaleString('ko-KR')+'원: 추천 1위 '+x.recommended.name+' '+x.recommended.views.toLocaleString('ko-KR')+'회, 최대 조회 후보 '+x.maxViews.name+' '+x.maxViews.views.toLocaleString('ko-KR')+'회.').join('\n')
+'\n\n## 같은 비중이 같은 순위 영향은 아님\n\n유이력 173명의 환산 지표 범위와 모집단 표준편차. 분포가 좁은 지표는 같은 가중치라도 순위 차이를 만드는 폭이 달라진다. 보이는 총점 기여와 후보 간 변별력을 혼동하지 않는다.\n\n| 지표 | 최소 | 최대 | 표준편차 |\n|---|---:|---:|---:|\n'
+componentSpread.map(x=>'| '+x.key+' | '+x.min.toFixed(2)+' | '+x.max.toFixed(2)+' | '+x.sd.toFixed(2)+' |').join('\n')
+'\n\n## 후속 판단\n\n- 가중치 숫자를 최적값처럼 방어하지 않고 단순 기준·기각 이유·민감한 사례를 문서화한다.\n- 순위를 뒤집은 실제 차이와 해당 후보의 주의할 점을 함께 보여주는 설명을 검토한다. “미세 차이”를 통계적 신뢰도처럼 표현하지 않는다.\n- 비교 집단·측정 기간 부재·목표와 대리 지표의 차이를 드러낸다.\n- 이번 분석은 제품 변경이나 새 프리셋 채택을 의미하지 않는다. 실제 사용자·광고 성과 검증은 남아 있다.\n';
writeFileSync('docs/LOGIC_REVIEW.md',report);
writeFileSync('docs/LOGIC_REVIEW.md','\n## 소스 대조에서 발견한 설명 오류 — 수정 전\n\n1. 상세 화면은 비교 집단을 플랫폼 전체로 확대했을 때도 중간값을 원래 플랫폼×규모 집단에서 따로 계산한다. 합성 20명에서 계산 집단은 유튜브 전체 20명이고 조회 중간값은 8,500회지만, 현재 상세 수식을 대조하면 나노 2명의 150회를 사용한다. 현재 CSV의 6개 집단은 모두 10명 이상이라 이 분기는 발생하지 않는다. 브라우저 재현이 아닌 소스 검토와 합성 계산 재현이다.\n2. 데이터 자세히 보기의 “누적액은 평균 비용×집행 건수와 일치하지 않는다”는 문장이 모든 후보에게 공통으로 노출된다. 이력 없는 27명은 0=0으로 일치하므로 개별 후보 기준으로 문장을 분기해야 한다. 원본 데이터로 동일성을 확인했고 노출은 소스로 확인했다.\n3. 평점 결측의 50은 1~5 척도의 가운데인 3.0점에 해당한다. 현재 관측 평점의 환산 범위는 60~100이다. “중립”이 불이익 없음을 뜻하지 않도록 계산 대체값이라고 써야 한다. 실제 결측 27명은 비용 미확인 영역에 있어 점수를 노출하지 않으며, 현재 추천 순위에는 영향을 주지 않는다.\n\n추가 검토에서 발견한 항목이므로 기존 54개 테스트 통과만으로 전체 설명 일치를 보장하지 않는다. 점수 계산에서 비교 집단·중간값을 함께 반환해 UI와 공유하는 수정과 해당 예외 검증이 필요하다. 이 보고서는 수정 완료를 주장하지 않는다.\n',{flag:'a'});
console.log(JSON.stringify({conditions:meaningful.length,uniqueEligibleSets:unique,evidence,explanationMismatches:explanations.length,explanationExample:explanations[0]&&{first:explanations[0].first.name,second:explanations[0].second.name,largest:explanations[0].largestContribution.label,advantage:explanations[0].largestRelativeAdvantage.label},reachMismatches:reachCases.length,reachExample:reachCases[0]},null,2));
