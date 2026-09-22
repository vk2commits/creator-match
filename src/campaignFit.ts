import type {Creator} from './domain';
import {hasKnownBudget} from './domain';
import {campaignOf} from './campaign';
import type {Brief} from './experience';
import {moneyText,numberText,tierOf,MIN_COHORT_SIZE} from './policy';

/** Editorial fit argument. Category and metrics are observed; creative fit is a
 * proposal, not a claim about unseen content, audience demographics or sales. */
export function campaignFit(c:Creator,all:Creator[],brief:Brief){
  const campaign=campaignOf(brief),target=campaign.targetCustomer?.trim();
  const product=campaign.product.trim().slice(0,180);
  const lip=/틴트|립스틱/.test(product),beauty=/틴트|립스틱|화장품|스킨케어|세럼/.test(product);
  const need=campaign.customerNeed??'routine';
  const contexts:Record<string,string>={'뷰티':'제품을 바르고 사용감을 확인하는 장면','패션':'옷차림을 고르고 완성하는 장면','식품':'식사를 준비하거나 맛을 비교하는 장면','여행':'여행을 준비하고 이동하는 장면','피트니스':'운동 전후의 생활 장면','아웃도어':'야외 활동을 준비하고 즐기는 장면','게임':'게임을 준비하고 플레이하는 장면','테크':'기기를 직접 써보고 기능을 비교하는 장면','라이프스타일':'하루 중 제품이 필요한 생활 장면','교육':'배우고 익히는 과정'};
  const context=contexts[c.category]??`${c.category}에 관심 있는 고객이 제품을 쓰는 장면`;
  const bridge=lip&&c.category==='패션'?'옷차림에 립 컬러를 더하는 장면':beauty&&c.category==='뷰티'?'제품의 발색·사용감 변화를 보여주는 장면':context;
  const value=need==='proof'?'사용 전후나 선택지의 차이를 직접 비교하면, 고객이 제품을 고르기 전에 품을 질문에 답할 수 있어요.':need==='discovery'?'익숙한 선택과 다른 점을 첫 장면에서 보여주면, 새로운 제품을 발견할 이유를 만들 수 있어요.':/출근|준비 시간|바쁜|간편/.test(target??'')?'이 고객에게는 제품 설명보다 준비 과정이 얼마나 간편해지는지 보여주는 구성이 캠페인 메시지를 전달하기에 좋아요.':'제품 설명을 나열하기보다 필요한 순간과 사용 과정을 보여주면, 고객이 자기 일상에서 쓸 이유를 떠올리기 쉬워요.';
  const targetSentence=target?`‘${campaign.name}’에서 만나려는 고객은 ‘${target}’이므로, ${product?`「${product}」를 `:''}${bridge}으로 소개하는 협업을 제안해요.`:`‘${campaign.name}’에서는 ${product?`「${product}」를 `:''}${bridge}으로 소개하는 방향부터 검토해 보세요.`;
  const peers=all.filter(x=>x.platform===c.platform&&tierOf(x.followers)===tierOf(c.followers));
  const upperHalf=(key:'views'|'engagement')=>peers.length>=MIN_COHORT_SIZE&&peers.filter(x=>x[key]>c[key]).length<peers.length/2;
  const support=c.rating===null?'아직 평가가 없어요. 첫 협업은 제작 범위를 작게 잡고 초안을 함께 확인하는 편이 좋겠어요.':campaign.goal==='awareness'&&upperHalf('views')?`평균 조회수 ${numberText(c.views)}회는 같은 플랫폼·팔로워 구간에서 상위 절반에 들어, 제품을 알릴 접점을 검토할 만해요.`:campaign.goal==='engagement'&&upperHalf('engagement')?`참여율 ${c.engagement.toFixed(1)}%는 같은 플랫폼·팔로워 구간에서 상위 절반에 들어, 제품에 관한 질문과 대화를 이끌 협업 후보로 살펴볼 만해요.`:c.rating!==null&&c.rating>=4?`협업 ${c.campaigns}건과 광고주 평점 ${c.rating.toFixed(1)}점은 제작 경험과 만족도를 참고할 단서예요.`:`광고주 평점은 ${c.rating.toFixed(1)}점이므로, 이전 협업의 피드백을 받아보고 진행 여부를 판단해 보세요.`;
  const goalLink=campaign.goal==='sales'?'구매로 이어지는지 확인하려면 이 콘텐츠에 전용 구매 링크나 할인코드를 함께 넣어보세요.':'';
  const within=brief.input.categories.includes(c.category)&&tierOf(c.followers)===brief.input.sizeTier;
  const caution=!within?'현재 선택한 분야·팔로워 조건과 달라, 조건을 다시 확인한 뒤 비교해 주세요.':hasKnownBudget(c)&&c.averageBudget>brief.input.budgetKRW?`다만 과거 평균 협업비가 예산보다 ${moneyText(c.averageBudget-brief.input.budgetKRW)} 높아, 제작 범위를 줄이거나 예산을 조율해야 해요.`:!hasKnownBudget(c)?'제작 방향이 맞는지와 함께, 예산 안에서 가능한 견적부터 받아보세요.':beauty&&!['뷰티','패션'].includes(c.category)?`다만 ${c.category} 분야와 이 제품을 연결할 구체적인 사용 상황이 있는지 먼저 확인해야 해요.`:'';
  const audience=target?'최종 선정 전에는 채널 인사이트에서 우리 타깃 고객이 실제로 얼마나 겹치는지 확인해 주세요.':'타깃 고객을 추가하면 누구에게 어떤 장면을 보여줄지 더 구체적으로 제안할 수 있어요.';
  const headline=!within?'현재 탐색 조건과 다른 후보예요':hasKnownBudget(c)&&c.averageBudget>brief.input.budgetKRW?'제작 방향과 함께 예산 조율이 필요해요':lip&&c.category==='패션'?'립 제품을 룩의 완성으로 보여줄 후보예요':beauty&&c.category==='뷰티'?'제품의 사용감을 직접 보여줄 후보예요':need==='proof'?'제품을 고르는 질문에 답하는 협업을 제안해요':need==='discovery'?'새로운 선택지를 발견하는 협업을 제안해요':'제품이 필요한 순간을 보여주는 협업을 제안해요';
  return {headline,paragraph:[`${c.name}은 ${c.category} 분야의 ${c.platform} 크리에이터예요.`,targetSentence,value,support,goalLink,caution,audience].filter(Boolean).join(' ')};
}
