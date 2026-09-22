import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import type {Creator,MatchResult} from './domain';
import {recommend} from './domain';
import type {Brief} from './experience';
import {campaignOf} from './campaign';
import type {Campaign} from './campaign';
import {SORT_OPTIONS} from './policy';
import type {SortKey} from './policy';
import {getContentLibrary} from './creatorContent';
import {hasKeywordFilter,partitionSearch,searchReason} from './searchPolicy';
import type {SearchAssessment} from './searchPolicy';
import {Icon} from './ui';

type Props={
 result:MatchResult;all:Creator[];ordered:Creator[];selected:Creator[];savedView:boolean;brief:Brief;
 tab:'matched'|'quote';onTab:(tab:'matched'|'quote')=>void;sort:SortKey;onSort:(sort:SortKey)=>void;
 limit:number;onLimit:(limit:number)=>void;onExplore:()=>void;onConditions:()=>void;onApply:(brief:Brief)=>void;onSearch:(campaign:Campaign)=>void;
 onEvidence:(creator:Creator,postId?:string)=>void;
 renderCreator:(creator:Creator,assessment?:SearchAssessment)=>ReactNode;
};
export function CandidateResults({result,all,ordered,selected,savedView,brief,tab,onTab,sort,onSort,limit,onLimit,onExplore,onConditions,onApply,onSearch,onEvidence,renderCreator}:Props){
 const campaign=campaignOf(brief),library=getContentLibrary(),hasKeywords=hasKeywordFilter(campaign);
 const known=partitionSearch(ordered,campaign,library),quote=partitionSearch(result.needsQuote,campaign,library);
 const group=tab==='quote'?quote:known,base=tab==='quote'?result.needsQuote:ordered;
 const scopeCount=(g:typeof group)=>g.confirmed.length+g.unverified.length+g.excluded.length;
 const [choice,setChoice]=useState<'auto'|'confirmed'|'unverified'>('auto');
 const filterKey=JSON.stringify([campaign.includeKeywords,campaign.excludeKeywords,campaign.keywordMode,campaign.searchPlatform,tab]);
 useEffect(()=>{setChoice('auto');onLimit(12);},[filterKey]);
 const active=choice==='auto'?(group.confirmed.length?'confirmed':'unverified'):choice;
 const visible=savedView?selected:hasKeywords?group[active]:group.confirmed;
 const clearKeywords=()=>onSearch({...campaign,includeKeywords:[],excludeKeywords:[],searchText:''});
 const clearPlatform=()=>onSearch({...campaign,searchPlatform:''});
 const changeGroup=(value:'confirmed'|'unverified')=>{setChoice(value);onLimit(12);};
 const noScope=scopeCount(group)===0;
 const heading=savedView?'눈여겨본 후보를 저장하세요.':base.length&&!scopeCount(group)?'선택한 채널에는 후보가 없어요.':hasKeywords&&!noScope?(active==='unverified'?'추가로 자료를 확인할 후보가 없어요.':'등록한 자료에서 키워드 조건을 찾지 못했어요.'):tab==='quote'?'견적 확인이 필요한 후보가 없어요.':result.summary.categoryAndTier===0?'이 분야·규모에는 후보가 없어요.':result.summary.overBudget===0?'견적 확인이 필요한 후보만 있어요.':'예산 안에 드는 후보가 없어요.';
 return <>
  <div className="list-toolbar">{savedView?<h2>저장한 후보 <span className="count">{selected.length}</span></h2>:<div className="result-tabs" role="tablist" aria-label="예산 기준 후보"><button role="tab" aria-selected={tab==='matched'} onClick={()=>{onTab('matched');onLimit(12);}}>예산 내 후보 <span>{scopeCount(known)}</span></button><button role="tab" aria-selected={tab==='quote'} onClick={()=>{onTab('quote');onLimit(12);}}>견적 필요 <span>{scopeCount(quote)}</span></button></div>}{!savedView&&tab==='matched'&&<select aria-label="결과 정렬" value={sort} onChange={e=>{onSort(e.target.value as SortKey);onLimit(12);}}>{SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}</div>
  {!savedView&&hasKeywords&&<section className="search-outcome" aria-label="검색 결과 확인">
   <div className="applied-keywords">{!!campaign.includeKeywords?.length&&<><span>{campaign.keywordMode==='all'?'모두 포함':'하나 이상 포함'}</span>{campaign.includeKeywords.map(k=><span className="applied-keyword" key={'include-'+k}>{k}</span>)}</>}{!!campaign.excludeKeywords?.length&&<><span>제외</span>{campaign.excludeKeywords.map(k=><span className="applied-keyword exclude" key={'exclude-'+k}>{k}</span>)}</>}<button className="text-button" onClick={clearKeywords}>키워드 해제</button></div>
   <div className="evidence-switch" role="group" aria-label="검색 확인 상태"><button aria-pressed={active==='confirmed'} onClick={()=>changeGroup('confirmed')}>{campaign.includeKeywords?.length?'키워드 확인':'검색 범위 내 확인'} <strong>{group.confirmed.length}</strong></button><button aria-pressed={active==='unverified'} onClick={()=>changeGroup('unverified')}>자료 확인 필요 <strong>{group.unverified.length}</strong></button></div>
   <p>{active==='unverified'?(tab==='quote'?'분야·팔로워 조건은 맞지만, 비용과 콘텐츠 자료를 확인해야 해요. 후보에게 견적과 채널 자료를 문의해 보세요.':'예산·분야·팔로워 조건은 맞지만, 검색어를 검토할 콘텐츠 자료가 부족해요. 채널 자료를 확인하거나 후보에게 문의해 보세요.'):campaign.includeKeywords?.length?'소개·등록 콘텐츠·채널 정보에서 확인한 결과예요. 후보 옆 키워드를 누르면 근거를 볼 수 있어요.':'등록된 자료에서 제외 키워드를 찾지 못한 후보예요. 채널 전체를 확인한 결과는 아니에요.'}</p>
   {group.excluded.length>0&&<details className="search-exclusions"><summary>검색에서 제외된 {group.excluded.length}명과 이유</summary><ul>{group.excluded.map(c=>{const a=group.assessments.get(c.id)!;return <li key={c.id}><div><strong>{c.name}</strong><span>{searchReason(a)}</span></div><button className="text-button" onClick={()=>onEvidence(c,a.exclusionHits[0]?.postId)}>자료 보기 ↗</button></li>;})}</ul><p>‘미확인’은 등록한 자료 안에서 찾지 못했다는 뜻이에요. 해당 콘텐츠를 만들지 않는다는 판단은 아닙니다.</p></details>}
  </section>}
  <p className="list-context">{savedView?'후보를 비교하거나, 원하는 한 명에게 바로 문의하세요.':`${visible.length}명 · `+(tab==='quote'?'평균 조회수순. 비용은 문의에서 확인하세요.':'선택한 순서로 표시합니다. 협업비는 과거 평균이에요.')}</p>
  <div className="sr-only" role="status">{savedView?`저장한 후보 ${visible.length}명`:`예산 내 후보 ${scopeCount(known)}명, 견적 필요 ${scopeCount(quote)}명. 현재 ${hasKeywords?(active==='confirmed'?'키워드 확인':'자료 확인 필요'):'목록'} ${visible.length}명 표시.`}</div>
  {visible.length>0?<><div className="creator-result-list"><div className="result-column-labels"><span>크리에이터</span><span>살펴볼 콘텐츠</span><span>평균 조회</span><span>참여율</span><span>협업 · 평점</span><span>참고 협업비</span><span>다음 행동</span></div>{visible.slice(0,limit).map(c=>renderCreator(c,savedView||!hasKeywords?undefined:group.assessments.get(c.id)))}</div>{visible.length>limit&&<button className="more-button" onClick={()=>onLimit(limit+12)}>후보 더 보기 <span>{Math.min(limit,visible.length)} / {visible.length}</span></button>}</>:<div className="empty-state"><Icon name={savedView?'bookmark':'search'} size={34}/><h2>{heading}</h2><div className="alternatives">
   {savedView?<button className="primary-button" onClick={onExplore}>후보 찾기</button>:<>
    {!!base.length&&noScope&&<button onClick={clearPlatform}>모든 채널 보기</button>}
    {hasKeywords&&!noScope&&<><button onClick={clearKeywords}>키워드 해제 · {scopeCount(group)}명 보기</button>{group.unverified.length>0&&active!=='unverified'&&<button onClick={()=>changeGroup('unverified')}>자료 확인 필요 {group.unverified.length}명 보기</button>}{group.confirmed.length>0&&active!=='confirmed'&&<button onClick={()=>changeGroup('confirmed')}>키워드 확인 {group.confirmed.length}명 보기</button>}</>}
    {base.length===0&&tab==='matched'&&result.alternatives.map((a,i)=>{const alt=partitionSearch(recommend(all,a.input).matched.map(x=>x.creator),campaign,library);return <button key={i} onClick={()=>onApply({...brief,input:a.input})}><span><strong>{a.label}</strong><small>{a.detail}</small></span><span>{hasKeywords?`${alt.confirmed.length}명 확인 · ${alt.unverified.length}명 자료 필요`:`${alt.confirmed.length}명 보기`} →</span></button>;})}
    {tab==='quote'?<button className="secondary-button" onClick={()=>onTab('matched')}>예산 내 후보 보기</button>:result.needsQuote.length>0&&<button onClick={()=>onTab('quote')}>견적이 필요한 후보 살펴보기</button>}
    <button className="text-button" onClick={onConditions}>예산·분야·팔로워 조건 변경</button>
   </>}
  </div></div>}
 </>;
}
