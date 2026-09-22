import {campaignOf, GOALS} from './campaign';
import {criteriaOf} from './experience';
import type {Brief} from './experience';
import {hasKnownBudget, scoreCreator} from './domain';
import type {Creator} from './domain';
import {moneyText, numberText, tierOf} from './policy';

/** Grounded local analysis: observed evidence and proposed creative are distinct.
 * Does not infer audience demographics, observed posts, or future performance.
 * Does not participate in eligibility or ranking. */
export function campaignInsights(c:Creator,all:Creator[],brief:Brief){
  const campaign=campaignOf(brief),criteria=criteriaOf(brief),score=scoreCreator(c,all,'cohort',criteria.weights);
  const components=[...score.components].filter(x=>x.weight>0).sort((a,b)=>b.points-a.points);
  const observed=components.filter(x=>!(x.key==='rating'&&c.rating===null));
  const strongest=observed[0]??components[0],weakest=[...components].sort((a,b)=>a.normalized-b.normalized)[0];
  const known=hasKnownBudget(c),headroom=known?brief.input.budgetKRW-c.averageBudget:null;
  const within=brief.input.categories.includes(c.category)&&tierOf(c.followers)===brief.input.sizeTier;
  const product=(campaign.product||campaign.name).slice(0,180),target=campaign.targetCustomer?.trim();
  const peers=all.filter(x=>x.platform===c.platform&&tierOf(x.followers)===tierOf(c.followers));
  const values={views:numberText(c.views)+'회',engagement:c.engagement.toFixed(1)+'%',rating:c.rating===null?'미평가':c.rating.toFixed(1)+'점',experience:c.campaigns+'건'};
  const descriptions={
    views:`비슷한 팔로워 규모의 ${c.platform} 채널 ${peers.length}명 중 평균 조회수가 더 높은 후보는 ${peers.filter(x=>x.views>c.views).length}명입니다. 제품을 널리 알리는 협업에서 먼저 살펴볼 지표예요.`,
    engagement:`비슷한 팔로워 규모의 ${c.platform} 채널 ${peers.length}명 중 참여율이 더 높은 후보는 ${peers.filter(x=>x.engagement>c.engagement).length}명입니다. 콘텐츠에 대한 반응을 비교할 때 참고할 수 있어요.`,
    rating:c.rating===null?'아직 광고주 평가가 없습니다. 첫 협업에서는 수정 범위와 중간 검토 일정을 먼저 정해 보세요.':`광고주 평점은 5점 만점에 ${c.rating.toFixed(1)}점입니다. 협업 만족도를 살펴볼 단서지만 응답 수는 확인되지 않았어요.`,
    experience:`광고 협업 ${c.campaigns}건이 기록돼 있습니다. 제품 설명, 검수, 일정 협의가 필요한 이번 작업에서 관련 진행 사례를 요청해 보세요.`,
  };
  const goal=GOALS.find(g=>g.id===campaign.goal)!.label;
  const pair=observed.slice(0,2).map(x=>x.key).sort().join('+');
  const pairLead:Record<string,string>={'rating+views':'조회 규모와 협업 평가를 함께 볼 후보예요','engagement+rating':'콘텐츠 반응과 협업 평가를 함께 볼 후보예요','engagement+views':'조회수와 참여율을 함께 볼 후보예요','experience+rating':'협업 경험과 광고주 평가를 함께 볼 후보예요','experience+views':'조회 규모와 협업 경험을 함께 볼 후보예요','engagement+experience':'콘텐츠 반응과 협업 경험을 함께 볼 후보예요'};
  const lead=!within?'지금의 탐색 조건과 다른 후보예요':headroom!==null&&headroom<0?'예산을 조율해야 진행할 수 있어요':!known?'협업 방향을 먼저 잡고 견적을 받아보세요':pairLead[pair]??(strongest.key==='views'?'제품을 소개할 접점을 먼저 볼 후보예요':strongest.key==='engagement'?'콘텐츠에 대한 반응을 먼저 볼 후보예요':strongest.key==='rating'?'광고주의 협업 평가가 눈에 띄는 후보예요':'협업 경험을 먼저 검토할 후보예요');
  const summary=c.rating===null&&strongest.key==='rating'?'광고주 평점을 우선하는 기준이지만, 이 후보는 아직 평가가 없어요. 채널 지표와 제작 조건을 먼저 살펴본 뒤 비교해 보세요.':`선택한 ‘${criteria.label}’ 기준에서 먼저 눈여겨볼 지표는 ${strongest.label} ${values[strongest.key]}입니다. ${goal} 캠페인에서는 ${campaign.goal==='sales'?'아래 콘텐츠 제안에 구매 링크나 전용 코드를 연결해 반응부터 구매까지 확인해 보세요.':campaign.goal==='engagement'?'제품에 관한 질문을 콘텐츠에 넣고 댓글·저장 반응을 확인해 보세요.':'제품을 알리는 핵심 장면을 앞부분에 배치하는 방향을 제안해요.'}`;
  const budget={title:!known?'먼저 견적을 받아야 해요':headroom!<0?'현재 예산보다 '+moneyText(-headroom!)+' 높아요':headroom===0?'과거 평균 비용과 예산이 같아요':moneyText(headroom!)+'의 조율 여지가 있어요',body:!known?'기록된 협업 비용이 없어 예산 안에서 가능한지 아직 판단할 수 없어요. 콘텐츠 형식과 수량을 정해 문의해 보세요.':`과거 평균 협업비 ${moneyText(c.averageBudget)}을 1명당 예산 ${moneyText(brief.input.budgetKRW)}과 비교했어요. ${headroom!>0?'추가 촬영이나 사용권 비용을 포함할 수 있는지 확인해 보세요.':'제작 범위·부가세·사용권을 포함한 최종 견적을 먼저 확인해 보세요.'}`};
  let creative=campaign.customerNeed==='proof'?{
    title:'궁금한 점에 답하는 비교 콘텐츠',hook:target?`‘${target}’인 고객이 제품을 고를 때 망설이는 지점 한 가지로 시작해 보세요.`:'제품 선택을 망설이게 하는 질문 한 가지로 시작해 보세요.',scene:`「${product}」에서 전달하려는 장점을 직접 보여주고, 사용 조건·차이점을 같은 화면에서 비교하는 구성을 제안해요.`
  }:campaign.customerNeed==='discovery'?{
    title:'처음 발견하는 순간을 만드는 콘텐츠',hook:target?`${target}에게 새로운 선택지가 될 만한 장면으로 시작해 보세요.`:'익숙한 제품과 무엇이 다른지 첫 장면에서 보여주세요.',scene:`「${product}」의 차별점을 하나만 고르고, 처음 사용하는 과정과 가장 인상적인 순간을 중심으로 소개해 보세요.`
  }:{title:'고객의 일상에 제품을 넣는 콘텐츠',hook:target?`${target}의 하루에서 제품이 필요한 순간으로 시작해 보세요.`:'제품이 필요한 생활 장면을 먼저 보여주세요.',scene:`「${product}」를 사용하는 전후 과정을 보여주고, 제품 설명을 그 장면 안에 자연스럽게 넣는 구성을 제안해요.`};
  // Product-specific creative examples remain proposals, never observed creator posts.
  if(/틴트|립스틱/.test(product)&&c.category==='패션')creative={
    title:campaign.customerNeed==='proof'?'같은 옷, 다른 립 컬러 비교':'출근 룩을 완성하는 립 컬러',
    hook:target?`‘${target}’에게 익숙한 옷차림을 고르는 장면으로 시작해 보세요.`:'옷차림을 고른 뒤 메이크업을 마무리하는 장면으로 시작해 보세요.',
    scene:campaign.customerNeed==='proof'?'같은 옷과 조명에서 립 컬러 두 가지를 비교해 보세요. 색상 차이와 전체적인 인상을 보여주고, 제품의 실제 발색을 자막으로 짚어주는 구성을 제안해요.':'흰 셔츠와 니트처럼 일상적인 룩 두 가지에 제품을 매치해 보세요. 바르는 과정과 완성된 룩을 연결하면 패션 콘텐츠 안에서도 립 제품의 쓰임을 보여줄 수 있어요.'
  };
  else if(/틴트|립스틱/.test(product)&&c.category==='뷰티')creative={
    title:campaign.customerNeed==='discovery'?'새로운 립 컬러를 발견하는 발색 콘텐츠':'첫 발색부터 사용 후까지 보여주는 콘텐츠',
    hook:target?`‘${target}’이 궁금해할 발색·사용감 질문 하나로 시작해 보세요.`:'처음 발랐을 때 어떤 색인지 가까운 장면으로 먼저 보여주세요.',
    scene:'같은 조명에서 바르기 전·첫 발색·사용 후 모습을 연결해 보세요. 촬영 간격과 사용 조건을 함께 보여주고, 개인의 사용 경험과 제품 정보를 나눠 설명하는 구성을 제안해요.'
  };
  const format=c.platform==='유튜브'?'사용 과정을 보여주는 영상 1편을 기준으로 길이·촬영 범위를 협의하세요.':'릴스 1편을 기준으로 핵심 장면과 자막을 협의하고, 스토리 추가 여부는 별도 견적으로 확인하세요.';
  const cta=campaign.goal==='sales'?'제품 정보와 전용 구매 링크·할인코드로 이어지는 안내를 넣어주세요.':campaign.goal==='engagement'?'“어떤 상황에서 써보고 싶나요?”처럼 제품에 관한 답변을 유도해 보세요.':'제품명과 핵심 장점을 마지막 장면에 다시 보여주세요.';
  const risks:{title:string;body:string}[]=[];
  if(!within)risks.push({title:'탐색 조건이 바뀌었어요',body:`현재 선택한 분야·팔로워 규모와 다릅니다. 조건을 다시 확인한 뒤 비교해 주세요.`});
  if(c.rating===null)risks.push({title:'광고주 평가가 아직 없어요',body:'작은 제작 범위로 시작하고, 초안 검토와 수정 횟수를 합의해 첫 협업의 불확실성을 줄여보세요.'});
  else if(weakest.key==='engagement')risks.push({title:'조회가 제품 관심으로 이어지는지 확인하세요',body:`참여율은 ${c.engagement.toFixed(1)}%예요. 최근 콘텐츠에서 제품 질문·경험 공유가 있는지 확인하고, 이번 협업에는 답변하기 쉬운 질문을 넣어보세요.`});
  else if(weakest.key==='views')risks.push({title:'도달 범위와 제작 범위를 함께 비교하세요',body:`평균 조회수는 ${numberText(c.views)}회예요. 더 넓게 알리는 것이 우선이라면, 같은 예산의 다른 후보와 조회수·제작 편수를 함께 비교해 보세요.`});
  else if(weakest.key==='rating')risks.push({title:'이전 협업의 개선점을 물어보세요',body:`광고주 평점은 ${c.rating.toFixed(1)}점입니다. 일정 준수·수정 대응 등 구체적인 피드백을 요청하고 이번 제작 조건에 반영해 보세요.`});
  else risks.push({title:'진행 방식은 사전에 맞춰보세요',body:`기록된 협업은 ${c.campaigns}건입니다. 우리 제품과 비슷한 협업 사례와 초안 전달 일정을 받아 제작 흐름을 확인해 보세요.`});
  if(c.category!=='뷰티'&&/틴트|화장품|스킨케어|세럼|립스틱/.test(product))risks.push({title:`${c.category} 콘텐츠에 제품을 연결할 장면이 필요해요`,body:'제품 자체 설명을 길게 넣기보다 실제 사용하는 상황을 먼저 제안해 보세요. 해당 제품군을 소개한 기존 작업도 함께 요청하세요.'});
  risks.push({title:target?'우리 타깃 고객이 실제로 보는 채널인지 확인하세요':'고객을 정하면 제안을 더 구체화할 수 있어요',body:target?`‘${target}’은 이번 캠페인의 타깃이에요. 최근 시청자·팔로워 인사이트를 받아 이 고객과 겹치는지 확인해야 해요.`:'캠페인 설정에서 타깃 고객과 구매 시 중요하게 보는 점을 추가해 보세요.'});
  const comparable=all.filter(x=>x.id!==c.id&&x.platform===c.platform&&x.category===c.category&&tierOf(x.followers)===tierOf(c.followers)&&hasKnownBudget(x)&&x.averageBudget<=brief.input.budgetKRW);
  const alternative=known?[...comparable].filter(x=>x.averageBudget<c.averageBudget).sort((a,b)=>b.views-a.views||a.id.localeCompare(b.id))[0]:[...comparable].sort((a,b)=>a.averageBudget-b.averageBudget||a.id.localeCompare(b.id))[0];
  const comparison=alternative?{creator:alternative,text:known?`${alternative.name}의 과거 평균 협업비는 ${moneyText(alternative.averageBudget)}으로 ${moneyText(c.averageBudget-alternative.averageBudget)} 낮아요. 평균 조회수는 ${numberText(alternative.views)}회, 참여율은 ${alternative.engagement.toFixed(1)}%입니다. 비용 차이만큼 원하는 제작 범위가 달라지는지도 비교해 보세요.`:`${alternative.name}은 과거 평균 협업비 ${moneyText(alternative.averageBudget)}가 확인돼 있어요. 평균 조회수 ${numberText(alternative.views)}회, 참여율 ${alternative.engagement.toFixed(1)}%인 후보와 견적을 함께 비교해 보세요.`}:null;
  const measurement=campaign.goal==='sales'?['게시 전 전용 링크·할인코드와 집계 기간을 정하세요.','게시 후 링크 클릭 → 구매 건수 → 연결 매출을 같은 기간으로 기록하세요.','실제 집행비와 구매 건수가 모이면 구매 1건당 비용을 비교할 수 있어요.']:campaign.goal==='engagement'?['게시 후 같은 시점의 조회수·좋아요·댓글·공유·저장을 기록하세요.','단순 반응과 제품 질문을 나눠 보면 다음 콘텐츠에서 보완할 점이 보여요.','실제 집행비와 반응 수가 모이면 반응 1회당 비용을 비교할 수 있어요.']:['게시 후 7일처럼 확인 시점을 먼저 정하세요.','조회수와 실제 집행비를 기록해 조회 1회당 비용을 비교하세요.','제품명이 기억에 남았는지는 댓글이나 별도 질문으로 확인해 보세요.'];
  const proposal=`제안드리는 콘텐츠 방향: ${creative.title}\n대상 고객: ${target||'브리프 협의 시 구체화'}\n소개할 제품·메시지: ${product}\n구성: ${creative.hook.replace('보세요.','주시면 좋겠습니다.')} ${creative.scene.replace('보세요.','주시면 좋겠습니다.')}\n제작 형식: ${c.platform==='유튜브'?'유튜브 영상 1편, 길이 협의':'릴스 1편, 스토리 추가 시 별도 견적 요청'}\n마무리: ${cta.replace('보세요.','주시면 좋겠습니다.')}\n위 방향의 제작 가능 여부와 견적을 알려주시면 감사하겠습니다.`;
  return {campaign,goal,lead,summary,evidence:(observed.length?observed:score.components.filter(x=>['views','engagement'].includes(x.key))).slice(0,2).map(x=>({key:x.key,title:x.label,value:values[x.key],body:descriptions[x.key]})),budget,creative,format,cta,risks,comparison,measurement,proposal,source:`${c.name}의 채널 지표와 과거 협업 기록, 이번 캠페인의 제품·목표·타깃 고객, ${criteria.label} 기준을 사용했어요. 콘텐츠 방향은 제작 제안입니다. 실제 게시물과 고객 구성은 채널 자료로 확인해 주세요.`};
}
