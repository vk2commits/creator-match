import {Onboarding} from './Onboarding';
import {WeightControls} from './WeightControls';
import {appendInquiryProposal} from './inquiryProposal';
import {CreatorRow} from './CreatorRow';
import {ContentDossier} from './ContentDossier';
import {DiscoverySearch} from './DiscoverySearch';
import {keywordMatches,contentNarrative,contentFor} from './creatorContent';
import {sentCount} from './sentHistory';
import {FitAnalysis} from './FitAnalysis';
import {MatchingTransition,MATCHING_DURATION} from './MatchingTransition';
import {ChannelPage,channelHref} from './ChannelPage';
import {matchStory} from './matchStory';
import {Workflow} from './Workflow';
import {campaignOf,emptyWork,inquiryDraft} from './campaign';
import type {WorkRecords} from './campaign';
import {useRecommendation} from './useRecommendation';
import {Icon,Identity,Modal,RequiredMark,RequiredHint} from './ui';
import { flushSync } from 'react-dom';
import { briefSchema, modelContext, parseToolBrief } from './webmcp';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent,ReactNode } from 'react';
import { CATEGORIES, DEFAULT_INPUT, PRIORITIES, SORT_OPTIONS, TIERS, moneyText, numberText, priorityOf, tierRange } from './policy';
import type { Category, Priority, SortKey, Tier, Weights } from './policy';
import { hasKnownBudget, parseBudget, recommend, scoreCreator, sortMatches, validateInput } from './domain';
import type { Creator, InputErrors, ScoredCreator } from './domain';
import { loadCreators } from './loadData';
import { candidateStatus, criteriaOf, formatBudget, toggleCompared } from './experience';
import type { Brief, Notes, Decision, Decisions, SavedSession } from './experience';

function PriorityChoices({value,onChange}:{value:Priority|null;onChange:(value:Priority)=>void}) {
  return <div className="priority-choices"><div className="priority-grid" role="group" aria-label="추천 우선순위">{PRIORITIES.filter(p=>p.id!=='balanced').map(p=><button key={p.id} className={'priority-card '+(value===p.id?'chosen':'')} aria-pressed={value===p.id} onClick={()=>onChange(p.id)}><span className="priority-symbol"><Icon name={p.icon} size={24}/></span><span className="choice-mark">{value===p.id&&<Icon name="check" size={14}/>}</span><strong>{p.title}</strong><p>{p.description}</p></button>)}</div><button className="balanced-choice" aria-pressed={value==='balanced'} onClick={()=>onChange('balanced')}><Icon name={value==='balanced'?'check':'balance'} size={16}/><span>아직 정하지 않았어요 <small>네 지표를 같은 비중으로 비교</small></span></button></div>;
}
function PriorityEditor({brief,onApply,onClose}:{brief:Brief;onApply:(value:Brief)=>void;onClose:()=>void}) {
  const [draft,setDraft]=useState(brief);
  const p=criteriaOf(draft);
  return <Modal title="무엇을 더 중요하게 볼까요?" onClose={onClose}><div className="priority-guide"><p>예산·분야·팔로워 조건은 유지하고, 후보의 순서만 바꿉니다.</p><PriorityChoices value={draft.customWeights?null:draft.priority} onChange={priority=>setDraft({...draft,priority,customWeights:undefined})}/><WeightControls weights={p.weights} onChange={customWeights=>setDraft({...draft,customWeights})}/><div className="form-actions"><button className="secondary-button" onClick={onClose}>취소</button><button className="primary-button" onClick={()=>onApply(draft)}>이 기준 적용<Icon name="arrow" size={17}/></button></div></div></Modal>;
}
function Conditions({initial,onSubmit,action='이 조건으로 찾기',onBack}:{initial:Brief;onSubmit:(brief:Brief)=>void;action?:string;onBack?:(value:Brief)=>void}) {
  const [budget,setBudget]=useState(numberText(initial.input.budgetKRW));
  const [categories,setCategories]=useState<Category[]>([...initial.input.categories]);
  const [tier,setTier]=useState<Tier>(initial.input.sizeTier);
  const [errors,setErrors]=useState<InputErrors>({});
  const form=useRef<HTMLFormElement>(null);
  const submit=(event:FormEvent)=>{
    event.preventDefault();const input={budgetKRW:parseBudget(budget),categories,sizeTier:tier};const next=validateInput(input);setErrors(next);
    if(Object.keys(next).length){requestAnimationFrame(()=>form.current?.querySelector<HTMLInputElement>(next.budget?'#budget':'input[name=category]')?.focus());return;}
    onSubmit({...initial,input});
  };
  return <form ref={form} className="conditions" onSubmit={submit} noValidate>
    <div className="budget-field"><RequiredHint/><label htmlFor="budget">1명당 예산<RequiredMark/></label><div className={'money-input '+(errors.budget?'invalid':'')}><input id="budget" name="budget" required inputMode="numeric" autoComplete="off" value={budget} onChange={e=>setBudget(formatBudget(e.target.value))} aria-invalid={!!errors.budget} aria-describedby={errors.budget?'budget-error':undefined}/><span>원</span></div><div className="quick-budgets">{[1000000,2000000,5000000].map(value=><button type="button" key={value} onClick={()=>setBudget(numberText(value))}>{value/10000}만원</button>)}</div>{errors.budget&&<p className="error-text" id="budget-error" role="alert">{errors.budget}</p>}</div>
    <fieldset><legend>콘텐츠 분야<RequiredMark/> <span>복수 선택</span></legend><div className="category-options">{CATEGORIES.map(c=><label key={c} className={categories.includes(c)?'active':''}><input type="checkbox" name="category" checked={categories.includes(c)} onChange={()=>setCategories(v=>v.includes(c)?v.filter(x=>x!==c):[...v,c])} aria-describedby={errors.categories?'category-error':undefined}/><span>{c}</span></label>)}</div>{errors.categories&&<p id="category-error" className="error-text" role="alert">{errors.categories}</p>}</fieldset>
    <fieldset><legend>팔로워 수<RequiredMark/></legend><div className="tier-options">{TIERS.map(t=><label className={tier===t.id?'active':''} key={t.id}><input type="radio" name="tier" required checked={tier===t.id} onChange={()=>setTier(t.id)}/><strong>{t.range}</strong><span>{t.label}</span></label>)}</div></fieldset>
    <p className="muted form-note">과거 평균 비용으로 예산을 비교합니다. 실제 견적은 달라질 수 있어요.</p>
    <div className="form-actions">{onBack&&<button type="button" className="secondary-button" onClick={()=>onBack({...initial,input:{budgetKRW:parseBudget(budget),categories,sizeTier:tier}})}>이전</button>}<button className="primary-button" type="submit">{action}<Icon name="arrow" size={18}/></button></div>
  </form>;
}
function Profile({creator:c,all,brief,onClose,selected,onToggle,onInquiry,onAnalysis,hasWork}:{creator:Creator;all:Creator[];brief:Brief;onClose:()=>void;selected:boolean;onToggle:()=>void;onInquiry:()=>void;onAnalysis:()=>void;hasWork:boolean}) {
  const item=scoreCreator(c,all,'cohort',criteriaOf(brief).weights),known=hasKnownBudget(c);
  return <Modal title="크리에이터 자세히 보기" onClose={onClose}><div className="profile-content"><div className="profile-identity"><Identity creator={c}/><a className="secondary-button" target="_blank" rel="noreferrer" href={channelHref(c.id,DEMO_SESSION)}>채널 보기 ↗</a></div><button className="candidate-save fit-button profile-fit" onClick={onAnalysis}><span aria-hidden="true">✦</span>캠페인 적합 분석</button>
    <h3 className="profile-data-title">판단에 사용한 채널 지표</h3><div className="profile-stats">{[['평균 조회수',numberText(c.views)+'회'],['참여율',c.engagement+'%'],['광고 협업',c.campaigns+'건'],['광고주 평점',c.rating===null?'아직 평가 없음':c.rating.toFixed(1)+' / 5'],['참고 협업비',known?moneyText(c.averageBudget):'견적 문의 필요'],['누적 집행액',moneyText(c.totalBudget)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="data-caption">참고 협업비는 과거 평균입니다. 최종 견적은 제작 조건에 따라 달라집니다.</p><details className="plain-method"><summary>지표는 어떻게 비교했나요?</summary><p>참여율과 조회수는 {item.cohort.label} {item.cohort.size}명 안에서 비교했어요. 선택한 비중으로 광고주 평점과 협업 경험도 반영했습니다.</p></details><div className="profile-actions"><button className="secondary-button" onClick={onToggle}><Icon name={selected?'check':'bookmark'} size={16}/>{selected?'저장 취소':'후보 저장'}</button><button className="primary-button" onClick={onInquiry}>{hasWork?'협업 기록 이어보기':'이 후보에게 문의하기'}<Icon name="arrow" size={16}/></button></div>
  </div></Modal>;
}
function Compare({selected,all,brief,onClose,onInquiry,onAnalysis,work}:{selected:Creator[];all:Creator[];brief:Brief;onClose:()=>void;onInquiry:(id:string)=>void;onAnalysis:(c:Creator)=>void;work:WorkRecords}) {
  const rows:{label:string;value:(c:Creator)=>string;numeric?:(c:Creator)=>number}[]=[
    {label:'현재 조건',value:c=>candidateStatus(c,brief)},
    {label:'캠페인 활용 방향',value:c=>contentFor(c.id)?.style??matchStory(scoreCreator(c,all,'cohort',criteriaOf(brief).weights),brief).summary},
    {label:'고객과의 접점',value:c=>contentNarrative(c,brief)?.split('. ').slice(1,3).join('. ')??'콘텐츠·타깃 자료 추가 확인'},
    {label:'평균 조회수',value:c=>numberText(c.views)+'회',numeric:c=>c.views},
    {label:'참여율',value:c=>c.engagement+'%',numeric:c=>c.engagement},
    {label:'광고 협업',value:c=>c.campaigns+'건',numeric:c=>c.campaigns},
    {label:'광고주 평점',value:c=>c.rating===null?'미평가':c.rating.toFixed(1)+' / 5',numeric:c=>c.rating??-1},
    {label:'참고 협업비',value:c=>hasKnownBudget(c)?moneyText(c.averageBudget):'견적 문의 필요'},
  ];
  return <Modal title={'선택한 '+selected.length+'명 비교'} onClose={onClose} wide><p className="comparison-intro">{criteriaOf(brief).label} · 1명당 {moneyText(brief.input.budgetKRW)} · {brief.input.categories.join(' · ')}. 문의는 후보별로 보낼 수 있어요.</p><div className="comparison-scroll" tabIndex={0} aria-label="후보 비교표 가로 스크롤"><table className="comparison-table"><caption className="sr-only">선택한 모든 크리에이터의 캠페인 분석과 지표</caption><thead><tr><th scope="col">비교 항목</th>{selected.map(c=><th scope="col" key={c.id}><Identity creator={c}/><button className="ai-button" onClick={()=>onAnalysis(c)}>✦ 캠페인 적합 분석</button><button className="primary-button" aria-label={c.name+(work[c.id]?' 협업 기록 이어보기':' 문의하기')} onClick={()=>onInquiry(c.id)}>{work[c.id]?'협업 기록 이어보기':'문의하기'}<Icon name="arrow" size={14}/></button></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th>{selected.map(c=><td key={c.id} className={row.numeric&&(!['평균 조회수','참여율'].includes(row.label)||new Set(selected.map(x=>x.platform)).size===1)&&row.numeric(c)===Math.max(...selected.map(row.numeric))&&new Set(selected.map(row.numeric)).size>1?'observed-best':''}>{row.value(c)}</td>)}</tr>)}</tbody></table></div><p className="comparison-note">평균 조회수·참여율은 같은 플랫폼끼리 비교해 보세요. 참고 협업비는 과거 평균입니다.</p></Modal>;
}

const CHANNEL_ID=new URLSearchParams(location.search).get('channel');
const DEMO_SESSION=new URLSearchParams(location.search).has('demo');
export default function App({initialSession,onSessionChange,campaignNav}:{initialSession:SavedSession|null;onSessionChange:(session:SavedSession)=>void;campaignNav:ReactNode}) {
  const [initial]=useState(initialSession);
  const [brief,setBrief]=useState<Brief|null>(initial?.brief??null);
  const [selectedIds,setSelectedIds]=useState<string[]>(initial?.selected??[]);
  const [comparedIds,setComparedIds]=useState<string[]>(initial?.compared??[]);
  const [notes]=useState<Notes>(initial?.notes??{});
  const [decisions,setDecisions]=useState<Decisions>(initial?.decisions??{});
  const [work,setWork]=useState<WorkRecords>(initial?.work??{});
  const [transition,setTransition]=useState(false);
  const transitionTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(transitionTimer.current)clearTimeout(transitionTimer.current);},[]);
  const [showSetup,setShowSetup]=useState(location.hash==='#setup');
  useEffect(()=>{const update=()=>setShowSetup(location.hash==='#setup');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  const closeSetup=()=>{history.replaceState(null,'',location.pathname+location.search);setShowSetup(false);};
  const [data,setData]=useState<Creator[]|null>(null);const [loadError,setLoadError]=useState('');const [reload,setReload]=useState(0);
  const [tab,setTab]=useState<'matched'|'quote'>('matched');const [view,setView]=useState<'discovery'|'saved'|'workflow'|'report'|'sent'>('discovery');
  const [sort,setSort]=useState<SortKey>('recommended');const [limit,setLimit]=useState(12);
  const [detail,setDetail]=useState<Creator|null>(null);const [modal,setModal]=useState<'conditions'|'priority'|'compare'|null>(null);
  const [analysisCreator,setAnalysisCreator]=useState<Creator|null>(null);
  const [contentCreator,setContentCreator]=useState<Creator|null>(null);
  const [contentPost,setContentPost]=useState<string|undefined>();
  const [pendingProposal,setPendingProposal]=useState<{id:string;text:string}|null>(null);
  const [,setContentRevision]=useState(0);useEffect(()=>{const update=()=>setContentRevision(n=>n+1);window.addEventListener('creator-content-changed',update);return()=>window.removeEventListener('creator-content-changed',update);},[]);
  const [workflowTarget,setWorkflowTarget]=useState<string|null>(null);
  const [workflowCompose,setWorkflowCompose]=useState(false);
  const [toast,setToast]=useState('');
  useEffect(()=>{const controller=new AbortController();setLoadError('');setData(null);loadCreators(fetch,controller.signal).then(setData).catch((error:unknown)=>{if(!controller.signal.aborted)setLoadError(error instanceof Error?error.message:'데이터를 다시 불러와 주세요.');});return()=>controller.abort();},[reload]);
  useEffect(()=>{if(brief)onSessionChange({version:5,brief,selected:selectedIds,compared:comparedIds,notes,decisions,work});},[brief,selectedIds,comparedIds,notes,decisions,work,onSessionChange]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  const [recommendRetry,setRecommendRetry]=useState(0);
  const {result,pending:recommendPending,error:recommendError}=useRecommendation(data,CHANNEL_ID?null:brief,recommendRetry);
  const sorted=useMemo(()=>result?sortMatches(result.matched,sort):[],[result,sort]);
  const selected=selectedIds.flatMap(id=>data?.find(c=>c.id===id)??[]);
  const compared=comparedIds.flatMap(id=>selected.find(c=>c.id===id)??[]);
    const baseVisible=view==='saved'?selected:tab==='quote'?(result?.needsQuote??[]):sorted.map(x=>x.creator);
  const visible=view==='saved'?baseVisible:baseVisible.filter(c=>(!brief?.campaign?.searchPlatform||c.platform===brief.campaign.searchPlatform)&&keywordMatches(c,brief?.campaign?.includeKeywords??[],brief?.campaign?.excludeKeywords??[]));
  const toggle=(id:string)=>{
    if(selectedIds.includes(id)){setSelectedIds(ids=>ids.filter(x=>x!==id));setComparedIds(ids=>ids.filter(x=>x!==id));setDecisions(d=>Object.fromEntries(Object.entries(d).filter(([key])=>key!==id)));setToast('저장한 후보에서 뺐습니다.');}
    else {setSelectedIds(ids=>[...ids,id]);setToast('후보를 저장했습니다.');}
  };
  const compareToggle=(id:string)=>{
    if(!comparedIds.includes(id)&&comparedIds.length===3){setToast('비교는 한 번에 3명까지 가능합니다. 다른 후보의 비교 선택을 해제해 주세요.');return;}
    setComparedIds(ids=>toggleCompared(ids,id));
  };
  const decide=(id:string,decision:Decision)=>{setSelectedIds(ids=>ids.includes(id)?ids:[...ids,id]);setDecisions(d=>({...d,[id]:decision}));};
  const contacts=selected.filter(c=>decisions[c.id]==='contact');
  const openAnalysis=(c:Creator)=>{setDetail(null);setModal(null);setAnalysisCreator(c);};
  const openInquiry=(id:string,proposal?:string)=>{
    setContentCreator(null);setAnalysisCreator(null);
    if(proposal&&work[id]){setPendingProposal({id,text:proposal});return;}
    decide(id,'contact');setWork(w=>{
    if(w[id])return w;
    const next=emptyWork(),c=data?.find(x=>x.id===id);
    if(proposal&&brief&&c)next.message=inquiryDraft(c,brief,next,'')+'\n\n'+proposal;
    return {...w,[id]:next};
  });setDetail(null);setModal(null);setAnalysisCreator(null);setWorkflowCompose(false);setWorkflowTarget(id);setView('workflow');};
  const complete=(next:Brief,showTransition=false)=>{setTransition(showTransition);if(transitionTimer.current)clearTimeout(transitionTimer.current);if(showTransition)transitionTimer.current=setTimeout(()=>setTransition(false),MATCHING_DURATION);closeSetup();setBrief(next);setModal(null);setTab('matched');setSort('recommended');setLimit(12);setView('discovery');};
  const liveState=useRef({brief,selectedIds});
  liveState.current={brief,selectedIds};
  useEffect(()=>{
    if(!data||CHANNEL_ID)return;
    const context=modelContext();if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:Parameters<typeof context.registerTool>[0])=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported registry does not block the UI. */}};
    register({name:'apply_campaign_brief',description:'Apply budget, categories, follower range and recommendation priority. Updates the visible creator results and this browser’s saved brief.',inputSchema:briefSchema,annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{const next={...parseToolBrief(input),campaign:liveState.current.brief?.campaign};flushSync(()=>complete(next));const matches=recommend(data,next.input,'cohort',priorityOf(next.priority).weights);return {applied:next,matched:matches.matched.length,needsQuote:matches.needsQuote.length,top3:matches.matched.slice(0,3).map(x=>({id:x.creator.id,name:x.creator.name}))};}});
    register({name:'read_campaign_results',description:'Read the applied campaign conditions, shortlist IDs and top three creator results. Makes no changes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{const current=liveState.current;if(!current.brief)return {stage:'onboarding'};const matches=recommend(data,current.brief.input,'cohort',criteriaOf(current.brief).weights);return {applied:current.brief,selected:current.selectedIds,matched:matches.matched.length,needsQuote:matches.needsQuote.length,top3:matches.matched.slice(0,3).map(x=>({id:x.creator.id,name:x.creator.name}))};}});
    return()=>lifecycle.abort();
  },[data]);
  if(CHANNEL_ID){const c=data?.find(c=>c.id===CHANNEL_ID);return c?<ChannelPage creator={c} demo={DEMO_SESSION}/>:<main className="empty-state"><h1>{loadError?'채널 정보를 불러오지 못했어요.':data?'찾을 수 없는 채널이에요.':'채널을 불러오고 있어요.'}</h1>{loadError&&<button className="secondary-button" onClick={()=>setReload(x=>x+1)}>다시 불러오기</button>}<a href={DEMO_SESSION?'?demo':'./'}>크리에이터 탐색으로 이동</a></main>;}
  if(!brief||showSetup)return <Onboarding campaignNav={campaignNav} initial={brief??undefined} onComplete={next=>complete(next,true)} onCancel={brief?closeSetup:undefined}/>;
  if(transition)return <MatchingTransition brief={brief}/>;
  const priority=criteriaOf(brief);
  return <div className="app"><a className="skip-link" href="#main">결과로 바로가기</a><aside className="sidebar"><a className="wordmark" href={DEMO_SESSION?'?demo':'./'}><span className="brand-sign">c<span>m</span></span><span>creator<br/>match</span></a>{campaignNav}<span className="nav-label">캠페인 작업실</span><nav><button className={view==='discovery'?'active':''} onClick={()=>setView('discovery')}><Icon name="search"/>크리에이터 찾기</button><button className={view==='saved'?'active':''} onClick={()=>setView('saved')}><Icon name="bookmark"/>저장한 후보 <span>{selected.length}</span></button><button className={view==='sent'?'active':''} onClick={()=>setView('sent')}><Icon name="send"/>보낸 문의 <span>{sentCount(work)}</span></button><button className={view==='workflow'?'active':''} onClick={()=>setView('workflow')}><Icon name="history"/>협업 관리</button><button className={view==='report'?'active':''} onClick={()=>setView('report')}><Icon name="views"/>성과 리포트</button></nav><div className="sidebar-bottom"><span className="demo-dot"/>Creator Match</div></aside>
    <div className="main-shell"><header className="topbar"><span>워크스페이스 <span className="slash">/</span> {campaignOf(brief).name}</span><div className="header-actions"><a className="text-button" href="#setup">캠페인 설정</a></div></header><main id="main">
      {view==='workflow'||view==='report'||view==='sent'?data?<Workflow key={view} all={data} contacts={contacts} work={work} brief={brief} notes={notes} report={view==='report'} sent={view==='sent'} initialCreatorId={workflowTarget} initialCompose={workflowCompose} onConsumeTarget={()=>setWorkflowTarget(null)} onReport={()=>setView('report')} onExplore={()=>setView('discovery')} onUpdate={(id,value)=>{setWork(w=>({...w,[id]:value}));setToast('협업 기록을 저장했습니다.');}}/>:<div className="empty-state" role="status"><h2>{loadError||'후보를 불러오고 있어요.'}</h2>{loadError&&<button className="primary-button" onClick={()=>setReload(x=>x+1)}>다시 불러오기</button>}</div>:<>
      <div className="page-heading"><div><p className="section-kicker">{view==='saved'?'비교하고, 연락할 후보를 정하세요.':campaignOf(brief).name}</p><h1>{view==='saved'?'저장한 후보':'우리 캠페인에 맞는 크리에이터'}</h1></div><button className="secondary-button" onClick={()=>setModal('conditions')}><Icon name="edit" size={16}/>조건 변경</button></div>
      {view==='discovery'&&<DiscoverySearch campaign={campaignOf(brief)} onApply={campaign=>{setBrief({...brief,campaign});setLimit(12);}}/>}<div className="brief-bar"><div><span className="brief-key">예산</span><strong>{moneyText(brief.input.budgetKRW)}</strong><small>/ 1명</small></div><div><span className="brief-key">분야</span>{brief.input.categories.map(c=><span className="category-tag" key={c}>{c}</span>)}</div><div><span className="brief-key">팔로워</span><strong>{TIERS.find(t=>t.id===brief.input.sizeTier)!.range}</strong></div></div>
      {view==='saved'&&<section className="shortlist-guide"><div><h2>누구와 협업할지 비교해 보세요.</h2><p>비교표에 2~3명을 추가하거나, 원하는 한 명에게 바로 문의하세요.</p></div><button className="primary-button" disabled={compared.length<2} onClick={()=>setModal('compare')}>{compared.length<2?'비교할 후보를 추가하세요':'선택한 '+compared.length+'명 비교'}</button></section>}
      <section className="priority-strip compact" aria-label="현재 추천 기준"><div><Icon name={priority.icon} size={18}/><span>추천 기준</span><strong>{priority.label}</strong></div><button className="text-button" onClick={()=>setModal('priority')}>기준·비중 변경</button></section>
      {(!data||recommendPending)&&!loadError&&<div className="empty-state" role="status"><span className="spinner large"/><h2>{data?'조건에 맞는 후보를 정리하고 있어요.':'크리에이터 데이터를 불러오고 있어요.'}</h2><p>예산과 분야를 확인하고, 선택한 기준으로 순서를 정합니다.</p></div>}
      {loadError&&<div className="empty-state" role="alert"><h2>데이터를 불러오지 못했어요.</h2><p>{loadError}</p><button className="primary-button" onClick={()=>setReload(x=>x+1)}>다시 불러오기</button></div>}
      {recommendError&&<div className="empty-state" role="alert"><h2>{recommendError}</h2><button className="primary-button" onClick={()=>setRecommendRetry(n=>n+1)}>추천 다시 계산</button></div>}
      {result&&<><div className="list-toolbar">{view==='discovery'?<div className="result-tabs" role="tablist" aria-label="후보 상태"><button role="tab" aria-selected={tab==='matched'} onClick={()=>{setTab('matched');setLimit(12);}}>추천 후보 <span>{result.matched.length}</span></button><button role="tab" aria-selected={tab==='quote'} onClick={()=>{setTab('quote');setLimit(12);}}>비용 미확인 <span>{result.needsQuote.length}</span></button></div>:<h2>저장한 후보 <span className="count">{selected.length}</span></h2>}{view==='discovery'&&tab==='matched'&&<select aria-label="결과 정렬" value={sort} onChange={e=>{setSort(e.target.value as SortKey);setLimit(12);}}>{SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}</div>
      <p className="list-context">{view==='discovery'&&<strong>{visible.length}명 표시 · </strong>}{view==='saved'?'후보를 비교하거나, 한 명씩 문의하고 협업 기록을 이어가세요.':tab==='quote'?'분야·팔로워 조건은 맞지만 비용 정보가 없습니다. 견적을 확인한 뒤 검토하세요. 평균 조회수순으로 표시합니다.':result.matched.length?'참고 협업비는 과거 평균입니다. 최종 견적은 문의해 주세요.':''}</p>
      <div className="sr-only" role="status">추천 후보 {result.matched.length}명, 비용 미확인 {result.needsQuote.length}명. {priority.label} 기준.</div>
      {visible.length>0?<><div className="creator-result-list"><div className="result-column-labels"><span>크리에이터</span><span>콘텐츠 미리보기</span><span>평균 조회</span><span>참여율</span><span>협업 · 평점</span><span>참고 협업비</span><span>다음 행동</span></div>{visible.slice(0,limit).map(c=><CreatorRow key={c.id} creator={c} brief={brief} saved={selectedIds.includes(c.id)} compared={comparedIds.includes(c.id)} inSaved={view==='saved'} hasWork={!!work[c.id]} onSave={()=>toggle(c.id)} onCompare={()=>compareToggle(c.id)} onAnalysis={()=>openAnalysis(c)} onDetails={()=>setDetail(c)} onContent={postId=>{setContentPost(postId);setContentCreator(c);}} onInquiry={()=>openInquiry(c.id)}/>)}</div>{visible.length>limit&&<button className="more-button" onClick={()=>setLimit(n=>n+12)}>후보 더 보기 <span>{Math.min(limit,visible.length)} / {visible.length}</span></button>}</>:<div className="empty-state"><Icon name={view==='saved'?'bookmark':'search'} size={34}/><h2>{view==='saved'?'눈여겨본 후보를 저장하세요.':tab==='quote'?'비용이 미확인된 후보가 없어요.':baseVisible.length?'검색 조건과 일치하는 후보가 없어요.':result.summary.categoryAndTier===0?'이 분야·규모에는 후보가 없어요.':result.summary.overBudget===0?'비용 확인이 필요한 후보만 있어요.':'예산 안에 드는 후보가 없어요.'}</h2><p>{view==='saved'?'후보를 비교하고 문의할 사람을 정리하세요. 한 명에게 바로 문의할 수도 있어요.':tab==='quote'?'추천 후보에서 채널을 살펴보세요.':'아래 조건으로 바꾸거나 다른 분야를 살펴보세요.'}</p>{view==='saved'?<button className="primary-button" onClick={()=>setView('discovery')}>후보 찾기<Icon name="arrow" size={16}/></button>:tab==='quote'?<button className="secondary-button" onClick={()=>setTab('matched')}>추천 후보 보기</button>:<div className="alternatives">{baseVisible.length>0&&<button onClick={()=>setBrief({...brief,campaign:{...campaignOf(brief),includeKeywords:[],excludeKeywords:[],searchPlatform:'',searchText:''}})}>키워드·채널 조건 해제 · {baseVisible.length}명 보기</button>}{result.alternatives.map((a,i)=><button key={i} onClick={()=>complete({...brief,input:a.input})}><span><strong>{a.label}</strong><small>{a.detail}</small></span><span>{a.count}명 보기 →</span></button>)}{result.needsQuote.length>0&&<button onClick={()=>setTab('quote')}><span><strong>비용 미확인 후보 먼저 보기</strong><small>분야·팔로워 조건 유지</small></span><span>{result.needsQuote.length}명 보기 →</span></button>}<button className="text-button" onClick={()=>setModal('conditions')}>탐색 조건 다시 정하기</button></div>}</div>}
      </>}
    </>}</main></div>
    {selected.length>0&&view==='discovery'&&<div className="comparison-tray"><div><strong>저장한 후보 {selected.length}명</strong><span className="tray-names">{selected.slice(0,2).map(c=>c.name).join(' · ')}</span></div><button className="primary-button" onClick={()=>setView('saved')}>비교하고 문의할 후보 고르기<Icon name="arrow" size={17}/></button></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
    {modal==='conditions'&&<Modal title="캠페인 조건 바꾸기" onClose={()=>setModal(null)}><Conditions initial={brief} onSubmit={complete}/></Modal>}
    {modal==='priority'&&data&&<PriorityEditor brief={brief} onClose={()=>setModal(null)} onApply={value=>{setBrief(value);setSort('recommended');setLimit(12);setModal(null);setToast(criteriaOf(value).label+' 기준을 적용했습니다.');}}/>}
    {detail&&data&&<Profile creator={detail} all={data} brief={brief} selected={selectedIds.includes(detail.id)} hasWork={!!work[detail.id]} onAnalysis={()=>openAnalysis(detail)} onInquiry={()=>openInquiry(detail.id)} onToggle={()=>toggle(detail.id)} onClose={()=>setDetail(null)}/>}
    {contentCreator&&data&&<ContentDossier creator={contentCreator} all={data} brief={brief} initialTab="content" initialPostId={contentPost} hasWork={!!work[contentCreator.id]} onClose={()=>setContentCreator(null)} onInquiry={proposal=>{setContentCreator(null);openInquiry(contentCreator.id,proposal);}}/>}
    {analysisCreator&&data&&<FitAnalysis key={analysisCreator.id} creator={analysisCreator} all={data} brief={brief} hasWork={!!work[analysisCreator.id]} onClose={()=>setAnalysisCreator(null)} onInquiry={proposal=>openInquiry(analysisCreator.id,proposal)}/>}
    {pendingProposal&&<Modal title="작성한 문의에 제안 추가" onClose={()=>setPendingProposal(null)}><div className="proposal-preview"><p>기존 문안 뒤에 아래 내용을 추가합니다. 보낸 문의와 협업 상태는 그대로 유지됩니다.</p><label className="field-label"><span>추가할 내용</span><textarea aria-label="문의에 추가할 제안" value={pendingProposal.text} maxLength={6000} onChange={e=>setPendingProposal({...pendingProposal,text:e.target.value})}/></label><div className="form-actions"><button className="secondary-button" onClick={()=>{const id=pendingProposal.id;setPendingProposal(null);openInquiry(id);}}>추가하지 않고 문의 열기</button><button className="primary-button" disabled={!pendingProposal.text.trim()} onClick={()=>{const {id,text}=pendingProposal;setWork(w=>{const existing=w[id];const creator=data?.find(c=>c.id===id);if(!existing||!creator)return w;return {...w,[id]:{...existing,message:appendInquiryProposal(existing.message||inquiryDraft(creator,brief,existing,''),text)}};});setPendingProposal(null);setWorkflowCompose(true);setWorkflowTarget(id);setView('workflow');setToast('기존 문의에 제안을 추가했습니다.');}}>문안에 추가</button></div></div></Modal>}
    {modal==='compare'&&data&&compared.length>=2&&<Compare work={work} selected={compared} all={data} brief={brief} onClose={()=>setModal(null)} onInquiry={openInquiry} onAnalysis={openAnalysis}/>}

  </div>;
}
