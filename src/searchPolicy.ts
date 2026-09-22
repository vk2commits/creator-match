import type {Campaign} from './campaign';
import type {Creator} from './domain';
import {cleanKeywords,contentFor,getContentLibrary,matchEvidence} from './creatorContent';
import type {CreatorContent,KeywordEvidence} from './creatorContent';

export type SearchAssessment={
  state:'confirmed'|'unverified'|'excluded';
  reason:'no-filter'|'found'|'no-content'|'missing-keywords'|'excluded-keyword'|'platform';
  hits:KeywordEvidence[];exclusionHits:KeywordEvidence[];missing:string[];
};
export const hasKeywordFilter=(campaign:Campaign)=>cleanKeywords([...(campaign.includeKeywords??[]),...(campaign.excludeKeywords??[])]).length>0;

/** These are matches within the supplied material, not a claim about every post. */
export function assessSearch(creator:Creator,campaign:Campaign,library:CreatorContent[]=getContentLibrary()):SearchAssessment{
  const include=cleanKeywords(campaign.includeKeywords??[]),exclude=cleanKeywords(campaign.excludeKeywords??[]);
  const hits=matchEvidence(creator,include,library),exclusionHits=matchEvidence(creator,exclude,library);
  const missing=include.filter(k=>!hits.some(h=>h.keyword===k));
  const base={hits,exclusionHits,missing};
  if(campaign.searchPlatform&&campaign.searchPlatform!==creator.platform)return {...base,state:'excluded',reason:'platform'};
  if(exclusionHits.length)return {...base,state:'excluded',reason:'excluded-keyword'};
  if(!include.length&&!exclude.length)return {...base,state:'confirmed',reason:'no-filter'};
  const content=contentFor(creator.id,library);
  const hasMaterial=!!content&&(!!content.bio.trim()||!!content.style.trim()||content.keywords.length>0||content.posts.length>0);
  const includesMatch=!include.length||(campaign.keywordMode==='all'?missing.length===0:hits.length>0);
  if(!hasMaterial&&(!includesMatch||exclude.length>0))return {...base,state:'unverified',reason:'no-content'};
  if(!includesMatch)return {...base,state:'excluded',reason:'missing-keywords'};
  return {...base,state:'confirmed',reason:'found'};
}

export function partitionSearch(creators:readonly Creator[],campaign:Campaign,library:CreatorContent[]=getContentLibrary()){
  const result={confirmed:[] as Creator[],unverified:[] as Creator[],excluded:[] as Creator[],platformExcluded:[] as Creator[],assessments:new Map<string,SearchAssessment>()};
  for(const creator of creators){
    const assessment=assessSearch(creator,campaign,library);result.assessments.set(creator.id,assessment);
    if(assessment.reason==='platform')result.platformExcluded.push(creator);else result[assessment.state].push(creator);
  }
  return result;
}

export function searchReason(assessment:SearchAssessment):string{
  if(assessment.reason==='excluded-keyword')return `제외 키워드 ‘${assessment.exclusionHits.map(h=>h.keyword).join(' · ')}’ 확인`;
  if(assessment.reason==='missing-keywords')return `등록한 자료에서 ‘${assessment.missing.join(' · ')}’ 미확인`;
  if(assessment.reason==='platform')return '선택한 채널과 다름';
  if(assessment.reason==='no-content')return '콘텐츠 자료를 확인하면 키워드 조건을 검토할 수 있어요.';
  return '';
}
