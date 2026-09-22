import type {Creator} from './domain';
import type {Brief} from './experience';
import {candidateStatus} from './experience';
import type {CreatorContent} from './creatorContent';
import type {ResearchResult} from './researchAI';
import {campaignInsights} from './campaignInsights';
import {campaignOf} from './campaign';
import {contentNarrative,contentStats,creatorReport,getContentLibrary} from './creatorContent';

export type EvidenceTab='content'|'ads'|'metrics';
export type ReviewEvidence={id:string;label:string;detail:string;tab:EvidenceTab;postId?:string};
export type CampaignReview={
  key:string;headline:string;paragraph:string;questions:string[];evidence:ReviewEvidence[];
  proposal:string;engine:'local'|'model';insights:ReturnType<typeof campaignInsights>;
};

/** One snapshot drives the screen, evidence links, inquiry and exported report. */
export function buildReview(c:Creator,all:Creator[],brief:Brief,library=getContentLibrary()):CampaignReview{
  const d=library.find(x=>x.creatorId===c.id),insights=campaignInsights(c,all,brief),b=campaignOf(brief);
  const keywords=[...(b.includeKeywords??[]),...(/틴트|립/.test(b.product)?['틴트','발색']:[]),...(/직장|출근/.test(b.targetCustomer??'')?['출근']:[])];
  const ranked=(d?.posts??[]).map((p,index)=>({p,index,hits:keywords.filter(k=>(p.title+' '+p.caption).includes(k)).length})).sort((a,z)=>z.hits-a.hits||a.index-z.index);
  const evidence:ReviewEvidence[]=ranked.slice(0,2).map(({p})=>({id:'post:'+p.id,label:p.title,detail:p.caption,tab:'content',postId:p.id}));
  const questionPost=d?.posts.find(p=>p.kind==='ad'&&p.comments.some(x=>x.productQuestion&&x.sentiment!=='unreviewed'));
  if(questionPost){const comment=questionPost.comments.find(x=>x.productQuestion&&x.sentiment!=='unreviewed')!;evidence.push({id:'comment:'+questionPost.id,label:'제품에 관한 질문',detail:comment.text,tab:'ads',postId:questionPost.id});}
  if(!evidence.length)insights.evidence.forEach(e=>evidence.push({id:'metric:'+e.key,label:e.title,detail:e.value+' · '+e.body,tab:'metrics'}));
  const questions:string[]=[];
  if(b.targetCustomer)questions.push(`‘${b.targetCustomer}’과 시청자의 접점을 검토할 수 있도록 최근 채널 인사이트를 공유해 주실 수 있나요?`);
  if(!d?.posts.some(p=>p.kind==='ad'))questions.push('비슷한 제품을 소개한 콘텐츠가 있다면 공유해 주실 수 있나요?');
  if(d&&/직장|출근/.test(b.targetCustomer??'')&&d.keywords.includes('파티'))questions.push('일상에서 쓰기 편한 메이크업 구성으로도 촬영할 수 있나요?');
  else if(b.requiredElements)questions.push(`‘${b.requiredElements}’를 포함해 제작할 수 있나요?`);
  else questions.push(`${insights.creative.title} 방향의 제작 가능 여부와 필요한 촬영 범위를 알려주실 수 있나요?`);
  const mismatch=!!d&&/직장|출근/.test(b.targetCustomer??'')&&d.keywords.includes('파티');
  return {
    key:JSON.stringify({creator:c,brief,data:d??null,insights}),
    headline:candidateStatus(c,brief)!=='조건 충족'?insights.lead:d?(mismatch?'눈에 띄는 표현은 강점, 일상적인 연출은 조율이 필요해요':insights.creative.title):insights.lead,
    paragraph:contentNarrative(c,brief,library)??insights.summary,
    questions:[...new Set(questions)].slice(0,3),evidence,
    proposal:`콘텐츠 방향: ${mismatch?'일상에서 쓰기 편한 색감을 보여주는 메이크업':insights.creative.title}\n${mismatch?'기존의 선명한 색감 표현을 살리면서, 출근할 때 따라 하기 쉬운 메이크업으로 조율할 수 있을지 제안드립니다. 제품을 사용하는 과정과 자연광에서의 모습을 함께 보여주시면 좋겠습니다.':insights.creative.scene}\n${b.creatorStyle?`희망하는 표현: ${b.creatorStyle}\n`:''}${b.requiredElements?`꼭 담고 싶은 내용: ${b.requiredElements}\n`:''}마무리 안내: ${insights.cta}`,
    engine:'local',insights,
  };
}

export function applyModelReview(base:CampaignReview,result:ResearchResult):CampaignReview{
  // Reference validation is a structural check, not proof of the model's interpretation.
  const ids=result.evidenceIds;
  if(!ids?.length||ids.some(id=>!base.evidence.some(e=>e.id===id)))throw new Error('분석의 근거를 확인하지 못했어요. 다시 분석하거나 확인된 자료로 살펴보세요.');
  return {...base,paragraph:result.summary,questions:result.questions.slice(0,3),evidence:base.evidence.filter(e=>ids.includes(e.id)),engine:'model'};
}

export function inquiryFromReview(review:CampaignReview,questions=review.questions){
  return ['협업 콘텐츠 제안',review.proposal.replaceAll('보세요.','주시면 좋겠습니다.').replaceAll('제안해요.','제안드립니다.'),...(questions.length?['확인하고 싶은 내용',...questions.map(q=>'• '+q)]:[])].join('\n');
}

export function reportFromReview(c:Creator,brief:Brief,review:CampaignReview,library:CreatorContent[]=getContentLibrary()){
  const original=creatorReport(c,brief,library),details=original.slice(original.indexOf('## 채널 참고 지표'));
  return `# ${c.name} · 캠페인 검토 리포트\n\n캠페인: ${campaignOf(brief).name}\n\n## 캠페인 적합 분석\n\n${review.headline}\n\n${review.paragraph}\n\n## 판단에 사용한 근거\n\n${review.evidence.map(e=>`- ${e.label}: ${e.detail}`).join('\n')}\n\n## 제안할 콘텐츠\n\n${review.proposal}\n\n## 문의할 질문\n\n${review.questions.map(q=>'- '+q).join('\n')||'추가 질문 없음'}\n\n${details}\n분석 방식: ${review.engine==='model'?'연결된 언어 모델 + 제공 자료':'제공 자료와 로컬 정책에 따른 구성'}. 추천 순위를 변경하거나 광고 성과를 예측하지 않습니다.\n`;
}

export function reviewContext(review:CampaignReview,d:CreatorContent|undefined){
  return JSON.stringify({campaign:review.insights.campaign,evidence:review.evidence,source:d?.source??'provided-csv',sourceLabel:d?.sourceLabel??'제공 CSV',stats:contentStats(d?.posts??[]),localAssessment:review.paragraph});
}

const cache=new Map<string,CampaignReview>();
export const cachedReview=(key:string)=>cache.get(key);
export function cacheReview(review:CampaignReview){cache.set(review.key,review);if(cache.size>30)cache.delete(cache.keys().next().value!);}
