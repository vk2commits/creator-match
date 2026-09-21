import type {ScoredCreator} from './domain';
import {hasKnownBudget} from './domain';
import type {Brief} from './experience';
import {criteriaOf,candidateStatus} from './experience';
import {moneyText} from './policy';
import type {Weights} from './policy';

export const metricLabels:Record<keyof Weights,string>={views:'평균 조회수',engagement:'참여율',rating:'광고주 평점',experience:'협업 경험'};
export function focusKeys(brief:Brief){
  const weights=criteriaOf(brief).weights;
  const highest=Math.max(...Object.values(weights));
  return (Object.keys(weights) as (keyof Weights)[]).filter(key=>Math.abs(weights[key]-highest)<1e-9);
}
export function focusLabel(brief:Brief){const keys=focusKeys(brief);return keys.length===4?'네 가지 지표를 고르게':keys.map(key=>metricLabels[key]).join('·');}
export function campaignDirection(brief:Brief){
  const goal=brief.campaign?.goal;
  return goal==='engagement'?'제품에 관심과 반응을 모을 캠페인':goal==='sales'?'제품 구매를 유도할 캠페인':'제품을 알릴 캠페인';
}

// Product copy uses the exact score components. No inference about audience,
// content tone, actual quote, purchases or future performance is made.
export function matchStory(item:ScoredCreator,brief:Brief){
  const c=item.creator, status=candidateStatus(c,brief);
  const active=item.components.filter(x=>x.weight>0);
  const focus=focusKeys(brief);
  const lead=[...active.filter(x=>focus.includes(x.key))].sort((a,b)=>b.normalized-a.normalized||a.key.localeCompare(b.key))[0];
  const key=lead.key, high=lead.normalized>=75, low=lead.normalized<50;
  const peer=item.cohort.fallback?'비교 채널':'비슷한 규모의 '+c.platform+' 채널';
  const reasons:Record<keyof Weights,string>={
    views:high?`${peer} 중 조회수가 높은 편이에요. 제품을 알릴 채널을 고를 때 눈여겨볼 만해요.`:low?`${peer} 중 조회수는 낮은 편이에요. 조회수를 가장 중시한다면 다른 후보와 비교해 보세요.`:'조회수는 비교 채널의 중간 수준이에요. 비용과 협업 경험을 함께 보고 결정하세요.',
    engagement:high?`${peer} 중 참여율이 높은 편이에요. 콘텐츠 반응을 중시하는 협업에서 눈여겨볼 만해요.`:low?`${peer} 중 참여율은 낮은 편이에요. 반응을 가장 중시한다면 다른 후보와 비교해 보세요.`:'참여율은 비교 채널의 중간 수준이에요. 최근 댓글 내용까지 살펴보고 결정하세요.',
    rating:c.rating===null?'아직 광고주 평가가 없어요. 이전 협업 사례를 먼저 요청해 보세요.':high?'광고주 평점이 높은 편이에요. 이전 협업에 대한 평가를 중시할 때 검토할 만해요.':`광고주 평점은 ${c.rating}점이에요. 이전 협업 사례를 함께 확인해 보세요.`,
    experience:c.campaigns===0?'아직 광고 집행 이력이 없어요. 제작 일정과 작업 방식을 먼저 맞춰보세요.':`광고 집행 ${c.campaigns}건의 경험이 있어요. 협업 경험을 중시할 때 검토할 만해요.`,
  };
  const otherStrength=[...active].filter(x=>x.key!==key&&x.normalized>=75&&!(x.key==='rating'&&c.rating===null)).sort((a,b)=>b.weight*(b.normalized-50)-a.weight*(a.normalized-50))[0];
  const supporting=otherStrength?({engagement:'참여율도 높아 콘텐츠 반응을 함께 살펴볼 만해요.',views:'조회수도 높아 콘텐츠 노출 실적을 함께 살펴볼 만해요.',rating:'광고주 평점도 높아 이전 협업 평가를 함께 살펴볼 만해요.',experience:`광고 집행 ${c.campaigns}건의 경험도 함께 검토할 수 있어요.`}[otherStrength.key]):'';
  const summary=reasons[key]+(supporting?' '+supporting:'');
  const title=key==='views'?(high?'조회 실적이 돋보이는 후보':'조회수와 비용을 함께 비교할 후보'):key==='engagement'?(high?'콘텐츠 반응이 돋보이는 후보':'최근 반응을 더 살펴볼 후보'):key==='rating'?(c.rating!==null&&high?'이전 광고주의 평가가 좋은 후보':'이전 협업 사례를 확인할 후보'):'광고 협업 경험을 살펴볼 후보';
  const budget=!hasKnownBudget(c)?'협업비를 문의한 뒤 예산에 맞는지 확인하세요.':c.averageBudget<=brief.input.budgetKRW?`참고 협업비 ${moneyText(c.averageBudget)}으로, 1명당 예산 ${moneyText(brief.input.budgetKRW)} 안에서 검토할 수 있어요.`:`참고 협업비가 현재 예산보다 ${moneyText(c.averageBudget-brief.input.budgetKRW)} 높아요.`;
  const weak=[...active].filter(x=>x.key!==key&&x.normalized<50&&!(x.key==='rating'&&c.rating===null)).sort((a,b)=>b.weight-a.weight)[0];
  const next=c.rating===null?'이전 협업 사례와 작업 방식을 문의해 보세요.':weak?.key==='engagement'?'참여율은 상대적으로 낮아요. 최근 댓글이 제품에 대한 관심으로 이어지는지 살펴보세요.':weak?.key==='views'?'조회수는 상대적으로 낮아요. 노출 규모가 충분한지 다른 후보와 비교해 보세요.':'최근 콘텐츠를 보고 제품의 표현 방식이 브랜드와 어울리는지 확인하세요.';
  const eligible=status==='조건 충족';
  return {key,title:eligible?title:status==='비용 미확인'?'견적을 먼저 확인할 후보':status,summary,budget,next,category:brief.input.categories.includes(c.category)?`찾고 있는 ${c.category} 분야의 크리에이터예요.`:`현재 선택한 분야와 다른 ${c.category} 크리에이터예요.`,eligible,
    memo:`${c.category} 분야 후보. ${summary} ${budget}`,
    context:`${campaignDirection(brief)} · ${focusLabel(brief)}${focus.length===4?' 비교':' 우선'}`,
  };
}
