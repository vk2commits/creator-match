import { flushSync } from 'react-dom';
import { briefSchema, modelContext, parseToolBrief } from './webmcp';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CATEGORIES, DEFAULT_INPUT, PRIORITIES, SORT_OPTIONS, TIERS, moneyText, numberText, priorityOf, tierRange } from './policy';
import type { Category, Priority, SortKey, Tier, Weights } from './policy';
import { budgetEvidence, hasKnownBudget, parseBudget, recommend, scoreCreator, sortMatches, validateInput } from './domain';
import type { Creator, InputErrors, ScoredCreator } from './domain';
import { loadCreators } from './loadData';
import { STORAGE_KEY, candidateCautions, candidateStatus, criteriaOf, decisionLabel, handoffMarkdown, comparisonReason, evidence, formatBudget, insight, readSession, toggleCompared } from './experience';
import type { Brief, Notes, Decision, Decisions } from './experience';
import { WEIGHT_FIELDS, redistribute } from './weights';

function Icon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,ReactNode> = {
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    reaction:<><path d="M12 20S3 14.5 3 8.5a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1C21 14.5 12 20 12 20Z"/></>,
    views:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    history:<><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 6V3h8v3M8 13l3 3 5-6"/></>,
    balance:<><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="19" r="2" fill="currentColor"/></>,
    bookmark:<path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
    close:<path d="m6 6 12 12M6 18 18 6"/>,
    check:<path d="m5 12 4 4L19 6"/>,
    edit:<><path d="m4 16 12-12 4 4L8 20H4Z"/><path d="m13 7 4 4"/></>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    youtube:<><rect x="2" y="5" width="20" height="14" rx="5" fill="currentColor" stroke="none"/><path d="m10 9 5 3-5 3Z" fill="white" stroke="none"/></>,
    instagram:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.search}</svg>;
}
function PlatformBadge({platform}:{platform:Creator['platform']}) {return <span className={'platform-badge '+(platform==='유튜브'?'yt':'ig')} title={platform}><Icon name={platform==='유튜브'?'youtube':'instagram'} size={16}/><span className="sr-only">{platform}</span></span>;}
function Identity({creator:c}:{creator:Creator}) {return <div className="creator-identity"><span className={'monogram tone-'+(Number(c.id.replace(/\D/g,''))%4)} aria-hidden="true">{c.name.slice(0,1)}</span><div><div className="creator-name"><strong>{c.name}</strong><PlatformBadge platform={c.platform}/></div><div className="creator-tags"><span className="category-tag">{c.category}</span><span>팔로워 {numberText(c.followers)}명</span></div></div></div>;}
function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className={'modal '+(wide?'wide':'')} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}} aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
function PriorityChoices({value,onChange}:{value:Priority|null;onChange:(value:Priority)=>void}) {
  return <div className="priority-choices"><div className="priority-grid" role="group" aria-label="추천 우선순위">{PRIORITIES.filter(p=>p.id!=='balanced').map(p=><button key={p.id} className={'priority-card '+(value===p.id?'chosen':'')} aria-pressed={value===p.id} onClick={()=>onChange(p.id)}><span className="priority-symbol"><Icon name={p.icon} size={24}/></span><span className="choice-mark">{value===p.id&&<Icon name="check" size={14}/>}</span><strong>{p.title}</strong><p>{p.description}</p></button>)}</div><button className="balanced-choice" aria-pressed={value==='balanced'} onClick={()=>onChange('balanced')}><Icon name={value==='balanced'?'check':'balance'} size={16}/><span>아직 정하지 않았어요 <small>네 지표를 같은 비중으로 비교</small></span></button></div>;
}
function WeightControls({weights,onChange}:{weights:Weights;onChange:(weights:Weights)=>void}) {
  const anchor=useRef<{key:keyof Weights;weights:Weights}|null>(null);
  const begin=(key:keyof Weights)=>{anchor.current={key,weights};};
  const change=(key:keyof Weights,value:number)=>onChange(redistribute(anchor.current?.key===key?anchor.current.weights:weights,key,value));
  return <fieldset className="weight-controls"><legend>지표별 비중 <span>합계 100%</span></legend><p id="weight-help">하나를 바꾸면 나머지는 기존 비율에 맞춰 조정됩니다.</p>{WEIGHT_FIELDS.map(({key,label})=><div className="weight-control" key={key}><label htmlFor={'weight-'+key}>{label}</label><input id={'weight-'+key} type="range" min={0} max={100} step={1} value={Math.round(weights[key]*100)} aria-describedby="weight-help" aria-valuetext={Math.round(weights[key]*100)+'%'} onFocus={()=>begin(key)} onPointerDown={()=>begin(key)} onBlur={()=>{anchor.current=null;}} onChange={e=>change(key,Number(e.target.value))}/><div><input type="number" min={0} max={100} step={1} aria-label={label+' 비중 숫자'} value={Math.round(weights[key]*100)} onFocus={()=>begin(key)} onBlur={()=>{anchor.current=null;}} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&n>=0&&n<=100)change(key,n);}}/><span>%</span></div></div>)}</fieldset>;
}
function PriorityEditor({brief,all,onApply,onClose}:{brief:Brief;all:Creator[];onApply:(value:Brief)=>void;onClose:()=>void}) {
  const [draft,setDraft]=useState(brief);
  const p=criteriaOf(draft);
  const preview=recommend(all,draft.input,'cohort',p.weights);
  const previous=recommend(all,brief.input,'cohort',criteriaOf(brief).weights).matched.slice(0,3);
  return <Modal title="무엇을 더 중요하게 볼까요?" onClose={onClose}><div className="priority-guide"><p>예산·분야·팔로워 조건은 유지하고, 후보의 순서만 바꿉니다.</p><PriorityChoices value={draft.customWeights?null:draft.priority} onChange={priority=>setDraft({...draft,priority,customWeights:undefined})}/><WeightControls weights={p.weights} onChange={customWeights=>setDraft({...draft,customWeights})}/><section className="rank-preview" aria-label="적용 전 추천 미리보기"><h3>적용하면 먼저 보이는 후보</h3><p>조건 충족 {preview.matched.length}명 · 비용 미확인 {preview.needsQuote.length}명</p>{preview.matched.length?<ol>{preview.matched.slice(0,3).map((x,i)=><li key={x.creator.id}><span>{i+1}</span><strong>{x.creator.name}</strong><small>{previous[i]?.creator.id===x.creator.id?'순서 유지':'순서 변경'}</small></li>)}</ol>:<p>현재 조건에 맞는 후보가 없습니다.</p>}</section><p className="muted">이 비율은 비교할 때의 중요도입니다. 광고 성과나 성공 확률을 뜻하지 않습니다.</p><details className="calculation"><summary>계산과 데이터 한계</summary><p>참여율·조회수는 같은 플랫폼과 팔로워 구간에서 비교합니다. 10명 미만이면 플랫폼 전체, 그래도 부족하면 전체 데이터로 넓힙니다. 평점 공란은 미평가이며 계산에만 척도 중간값 50을 대입합니다. 집행 경험은 건수가 늘수록 가산 폭을 줄입니다.</p><p>프리셋은 우선 지표에 비중을 더 준 설계값으로, 가장 높은 성과를 내는 비율로 검증되지 않았습니다. 구매 성과·브랜드 적합성·진성 팔로워는 현재 데이터로 판단할 수 없습니다.</p></details><div className="form-actions"><button className="secondary-button" onClick={onClose}>취소</button><button className="primary-button" onClick={()=>onApply(draft)}>이 기준 적용<Icon name="arrow" size={17}/></button></div></div></Modal>;
}
function Conditions({initial,onSubmit,action='이 조건으로 찾기',onBack}:{initial:Brief;onSubmit:(brief:Brief)=>void;action?:string;onBack?:()=>void}) {
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
    <div className="budget-field"><label htmlFor="budget">1명당 예산</label><div className={'money-input '+(errors.budget?'invalid':'')}><input id="budget" name="budget" inputMode="numeric" autoComplete="off" value={budget} onChange={e=>setBudget(formatBudget(e.target.value))} aria-invalid={!!errors.budget} aria-describedby={errors.budget?'budget-error':undefined}/><span>원</span></div><div className="quick-budgets">{[1000000,2000000,5000000].map(value=><button type="button" key={value} onClick={()=>setBudget(numberText(value))}>{value/10000}만원</button>)}</div>{errors.budget&&<p className="error-text" id="budget-error" role="alert">{errors.budget}</p>}</div>
    <fieldset><legend>콘텐츠 분야 <span>복수 선택</span></legend><div className="category-options">{CATEGORIES.map(c=><label key={c} className={categories.includes(c)?'active':''}><input type="checkbox" name="category" checked={categories.includes(c)} onChange={()=>setCategories(v=>v.includes(c)?v.filter(x=>x!==c):[...v,c])} aria-describedby={errors.categories?'category-error':undefined}/><span>{c}</span></label>)}</div>{errors.categories&&<p id="category-error" className="error-text" role="alert">{errors.categories}</p>}</fieldset>
    <fieldset><legend>팔로워 수</legend><div className="tier-options">{TIERS.map(t=><label className={tier===t.id?'active':''} key={t.id}><input type="radio" name="tier" checked={tier===t.id} onChange={()=>setTier(t.id)}/><strong>{t.range}</strong><span>{t.label}</span></label>)}</div></fieldset>
    <p className="muted form-note">과거 평균 비용으로 예산을 비교합니다. 실제 견적은 달라질 수 있어요.</p>
    <div className="form-actions">{onBack&&<button type="button" className="secondary-button" onClick={onBack}>이전</button>}<button className="primary-button" type="submit">{action}<Icon name="arrow" size={18}/></button></div>
  </form>;
}
function Onboarding({initial,onComplete,onCancel}:{initial?:Brief;onComplete:(brief:Brief)=>void;onCancel?:()=>void}) {
  const [draft,setDraft]=useState<Brief>(initial??{input:{...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]},priority:'balanced'});
  const [chosen,setChosen]=useState(!!initial);
  const [custom,setCustom]=useState(!!initial?.customWeights);
  const [step,setStep]=useState(1);
  return <div className="onboarding"><header className="onboarding-header"><span className="wordmark"><span className="brand-sign">c<span>m</span></span>creator match</span><div className="header-actions">{onCancel&&<button className="text-button" onClick={onCancel}>변경 없이 돌아가기</button>}<span className="demo-label">프로토타입</span></div></header><main className="onboarding-main"><section className="welcome"><div className="step-label">{initial?'캠페인 설정':'첫 캠페인 설정'} <span>0{step} / 02</span></div><h1>{step===1?<>누구에게<br/><em>견적을 물어볼까요?</em></>:<>예산 안에서,<br/><em>분야에 맞게.</em></>}</h1><p>{step===1?'조건에 맞는 후보를 비교하고,\n팀에 설명할 선정 이유를 정리하세요.':'분야와 예산에 맞는 후보를 모으고,\n선택한 기준으로 추천합니다.'}</p><ol className="steps"><li className={step===1?'current':'done'}><span>{step===1?'1':'✓'}</span>추천 기준</li><li className={step===2?'current':''}><span>2</span>캠페인 조건</li></ol><div className="welcome-foot">후보 탐색 → 비교·문의 후보 지정 → 팀 검토안<br/>200명의 더미 데이터로 체험합니다.</div></section><section className="setup-pane" aria-label={step===1?'추천 기준 설정':'캠페인 조건 설정'}>{step===1?<><h2>어떤 지표를 먼저 볼까요?</h2><p className="section-intro">빠르게 고르거나, 중요도를 직접 조절할 수 있어요.</p><PriorityChoices value={chosen&&!draft.customWeights?draft.priority:null} onChange={priority=>{setDraft({...draft,priority,customWeights:undefined});setChosen(true);}}/><button className="text-button customize-toggle" aria-expanded={custom} onClick={()=>setCustom(!custom)}>{custom?'비중 조절 접기':'비중 직접 조절'}</button>{custom&&<WeightControls weights={criteriaOf(draft).weights} onChange={customWeights=>{setDraft({...draft,customWeights});setChosen(true);}}/>}<div className="onboarding-actions">{!initial&&<button className="text-button" onClick={()=>onComplete({input:{...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]},priority:'balanced'})}>예시 캠페인 둘러보기</button>}<button className="primary-button" disabled={!chosen} onClick={()=>setStep(2)}>다음<Icon name="arrow" size={18}/></button></div></>:<><h2>어떤 후보를 찾고 있나요?</h2><p className="section-intro"><span className="inline-priority">{criteriaOf(draft).label}</span></p><Conditions initial={draft} onSubmit={onComplete} onBack={()=>setStep(1)}/></>}</section></main></div>;
}
function Profile({creator:c,all,brief,onClose,selected,onToggle,decision,onDecision,onHandoff}:{creator:Creator;all:Creator[];brief:Brief;onClose:()=>void;selected:boolean;onToggle:()=>void;decision?:Decision;onDecision:(decision:Decision)=>void;onHandoff:()=>void}) {
  const item=scoreCreator(c,all,'cohort',criteriaOf(brief).weights);
  const proof=evidence(item);
  const known=hasKnownBudget(c);
  return <Modal title="크리에이터 살펴보기" onClose={onClose}><div className="profile-content"><Identity creator={c}/><div className="profile-verdict"><span className="section-kicker">{criteriaOf(brief).label} 기준에서</span><h3>{known?insight(item):'가격 정보부터 확인해야 해요'}</h3><p>{!known?'집행 이력이나 평균 비용이 없어 예산에 맞는지 판단할 수 없습니다.':proof.detail}</p></div><div className="profile-stats">{[['평균 조회수',numberText(c.views)+'회'],['참여율',c.engagement+'%'],['집행 이력',c.campaigns+'건'],['광고주 평점',c.rating===null?'미평가':c.rating.toFixed(1)+' / 5'],['과거 평균 비용',known?moneyText(c.averageBudget):'비용 미확인'],['누적 집행액',moneyText(c.totalBudget)]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {candidateCautions(c,brief).length>0&&<div className="check-next"><h3>이 후보에서 확인할 점</h3><ul>{candidateCautions(c,brief).map(fact=><li key={fact}>{fact}</li>)}</ul></div>}
    <details className="calculation"><summary>데이터와 계산 자세히 보기</summary><p>{c.platform} 채널 URL은 제공되지 않았습니다.</p><p>원본 ID {c.id} · {c.platform} · {c.category} · 팔로워 {numberText(c.followers)}명</p><p>{budgetEvidence(c)}</p>{known?<><p>비교 집단: {item.cohort.label} {item.cohort.size}명. 추천 점수 {item.score.toFixed(2)} / 100. 성과 예측값이 아닙니다.</p>{item.components.map(comp=><div className="calculation-row" key={comp.key}><strong>{comp.label} {Math.round(comp.weight*100)}%</strong><span>{comp.points.toFixed(2)}점</span><p>{comp.explanation}</p></div>)}<p>참여·조회는 동점 중간 상대 위치, 평점은 (값−1)/4, 미평가는 척도 중간의 계산 대체값 50, 경험은 로그 환산합니다. 표시 합에는 반올림 차이가 생길 수 있습니다.</p></>:<p>비용 미확인 후보에는 추천 점수를 표시하지 않습니다.</p>}</details><div className="profile-decision"><label htmlFor="profile-decision">검토 상태</label><select id="profile-decision" value={decision??'review'} onChange={e=>onDecision(e.target.value as Decision)}><option value="review">검토 중</option><option value="contact">문의 후보</option><option value="hold">보류</option></select><p>문의 후보로 지정하면 보관 목록에 담깁니다. 목록의 ‘팀 검토안’에서 이유를 정리하세요.</p></div>{decision==='contact'&&<button className="primary-button full profile-next" onClick={onHandoff}>문의 이유 작성<Icon name="arrow" size={17}/></button>}<button className={'secondary-button full '+(selected?'is-saved':'')} onClick={onToggle}><Icon name={selected?'check':'bookmark'} size={17}/>{selected?'담은 후보에서 빼기':'검토 후보로 담기'}</button></div></Modal>;
}
function Compare({selected,all,brief,notes,decisions,onDecision,onNote,onClose,onHandoff}:{selected:Creator[];all:Creator[];brief:Brief;notes:Notes;decisions:Decisions;onDecision:(id:string,decision:Decision)=>void;onNote:(id:string,value:string)=>void;onClose:()=>void;onHandoff:()=>void}) {
  const scored=selected.filter(c=>candidateStatus(c,brief)==='조건 충족').map(c=>scoreCreator(c,all,'cohort',criteriaOf(brief).weights));
  const rows:{label:string;value:(c:Creator)=>string;numeric?:(c:Creator)=>number}[]=[
    {label:'현재 조건',value:c=>candidateStatus(c,brief)},
    {label:'평균 조회수',value:c=>numberText(c.views)+'회',numeric:c=>c.views},
    {label:'참여율',value:c=>c.engagement+'%',numeric:c=>c.engagement},
    {label:'집행 이력',value:c=>c.campaigns+'건',numeric:c=>c.campaigns},
    {label:'광고주 평점',value:c=>c.rating===null?'미평가':c.rating.toFixed(1)+' / 5',numeric:c=>c.rating??-1},
    {label:'과거 평균 비용',value:c=>hasKnownBudget(c)?moneyText(c.averageBudget):'비용 미확인'},
    {label:'현재 기준에서의 차이',value:c=>{const item=scored.find(x=>x.creator.id===c.id);return item?comparisonReason(item,scored):'현재 조건의 추천 비교에서 제외';}},
  ];
  return <Modal title="누구에게 견적을 문의할까요?" onClose={onClose} wide><p className="comparison-intro">{criteriaOf(brief).label} · 1명당 {moneyText(brief.input.budgetKRW)} · {brief.input.categories.join('·')} · 팔로워 {tierRange(brief.input.sizeTier)}</p><div className="comparison-scroll" tabIndex={0} aria-label="후보 비교표 가로 스크롤"><table className="comparison-table"><caption className="sr-only">선택한 크리에이터의 관측 지표와 검토 이유</caption><thead><tr><th scope="col">비교 항목</th>{selected.map(c=><th scope="col" key={c.id}><Identity creator={c}/></th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th>{selected.map(c=><td key={c.id} className={row.numeric&&row.numeric(c)===Math.max(...selected.map(row.numeric))&&new Set(selected.map(row.numeric)).size>1?'observed-best':''}>{row.value(c)}</td>)}</tr>)}<tr><th scope="row">검토 상태</th>{selected.map(c=><td key={c.id}><select aria-label={c.name+' 검토 상태'} value={decisions[c.id]??'review'} onChange={e=>onDecision(c.id,e.target.value as Decision)}><option value="review">검토 중</option><option value="contact">문의 후보</option><option value="hold">보류</option></select></td>)}</tr><tr className="decision-row"><th scope="row">선정·보류 이유</th>{selected.map(c=><td key={c.id}><textarea aria-label={c.name+' 검토 메모'} value={notes[c.id]??''} maxLength={500} placeholder="팀에 설명할 이유를 남겨주세요" onChange={e=>onNote(c.id,e.target.value)}/><small>{(notes[c.id]??'').length}/500 · 이 브라우저에 저장</small></td>)}</tr></tbody></table></div><div className="comparison-note"><p>강조는 선택한 후보 중 높은 관측값입니다. ‘차이’는 다른 적격 후보 중 점수가 가장 높은 한 명과 비교합니다.</p><p>‘문의 후보’로 지정한 사람과 선정 이유가 팀 검토안에 포함됩니다.</p></div><button className="primary-button export-button" onClick={onHandoff}>문의 후보 검토안 만들기<Icon name="arrow" size={17}/></button></Modal>;
}
function Handoff({selected,all,brief,notes,decisions,onNote,onClose}:{selected:Creator[];all:Creator[];brief:Brief;notes:Notes;decisions:Decisions;onNote:(id:string,value:string)=>void;onClose:()=>void}) {
  const contacts=selected.filter(c=>decisions[c.id]==='contact');
  const missing=contacts.filter(c=>!notes[c.id]?.trim()).length;
  const memo=handoffMarkdown(selected,brief,all,notes,decisions);
  const ref=useRef<HTMLTextAreaElement>(null);
  const [status,setStatus]=useState('');
  const copy=async()=>{try{await navigator.clipboard.writeText(memo);setStatus('팀 검토안을 복사했습니다. 팀 문서나 메시지에 붙여 넣으세요.');}catch{ref.current?.focus();ref.current?.select();setStatus('자동 복사가 제한되어 내용을 선택했습니다. 직접 복사해 주세요.');}};
  return <Modal title="팀에 공유할 문의 후보" onClose={onClose} wide><div className="handoff-content"><div className="handoff-lead"><span className="section-kicker">검토안 → 팀 확인 → 실제 견적 문의</span><h3>견적 문의 후보 {contacts.length}명</h3><p>선정 이유와 현재 조건을 함께 전달합니다. 이 화면에서 문의가 발송되지는 않습니다.</p></div>{!contacts.length?<div className="empty-state"><h3>아직 문의 후보가 없어요.</h3><p>후보 상세나 비교표에서 검토 상태를 ‘문의 후보’로 바꿔주세요.</p><button className="secondary-button" onClick={onClose}>후보 검토로 돌아가기</button></div>:<>{contacts.map(c=><section key={c.id} className="handoff-candidate"><Identity creator={c}/><span className="status-chip">{candidateStatus(c,brief)}</span><label htmlFor={'reason-'+c.id}>이 후보에게 문의하려는 이유</label><textarea id={'reason-'+c.id} value={notes[c.id]??''} maxLength={500} placeholder="예: 조회수와 비용을 고려해 우선 문의. 최근 콘텐츠는 별도 확인" onChange={e=>{onNote(c.id,e.target.value);setStatus('');}}/>{candidateCautions(c,brief).map(fact=><p className="candidate-caution" key={fact}>{fact}</p>)}</section>)}<div className="handoff-next"><h3>팀 확인 후 진행할 일</h3><p>실제 채널의 최근 콘텐츠를 검토하고, 현재 견적·제작 범위·사용권·일정을 확인하세요.</p><p>이 데모에는 채널 URL과 연락처가 없습니다. 평점 응답 수와 지표 측정 기간도 제공되지 않았습니다.</p></div><section className="memo-preview"><label htmlFor="handoff-memo">팀 검토안 미리보기</label><textarea ref={ref} id="handoff-memo" readOnly value={memo}/><div><button className="primary-button" disabled={missing>0} onClick={copy}>팀 검토안 복사</button><span role="status">{status||(missing?missing+'명의 선정 이유를 작성해 주세요.':'팀 문서나 메시지에 붙여 넣어 공유하세요.')}</span></div></section></>}</div></Modal>;
}

export default function App() {
  const [initial]=useState(()=>{try{return readSession(localStorage.getItem(STORAGE_KEY));}catch{return null;}});
  const [brief,setBrief]=useState<Brief|null>(initial?.brief??null);
  const [selectedIds,setSelectedIds]=useState<string[]>(initial?.selected??[]);
  const [comparedIds,setComparedIds]=useState<string[]>(initial?.compared??[]);
  const [notes,setNotes]=useState<Notes>(initial?.notes??{});
  const [decisions,setDecisions]=useState<Decisions>(initial?.decisions??{});
  const [showSetup,setShowSetup]=useState(location.hash==='#setup');
  useEffect(()=>{const update=()=>setShowSetup(location.hash==='#setup');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  const closeSetup=()=>{history.replaceState(null,'',location.pathname+location.search);setShowSetup(false);};
  const [data,setData]=useState<Creator[]|null>(null);const [loadError,setLoadError]=useState('');const [reload,setReload]=useState(0);
  const [tab,setTab]=useState<'matched'|'quote'>('matched');const [view,setView]=useState<'discovery'|'saved'>('discovery');
  const [sort,setSort]=useState<SortKey>('recommended');const [limit,setLimit]=useState(12);
  const [detail,setDetail]=useState<Creator|null>(null);const [modal,setModal]=useState<'conditions'|'priority'|'compare'|'handoff'|null>(null);
  const [toast,setToast]=useState('');const [storageError,setStorageError]=useState(false);
  useEffect(()=>{const controller=new AbortController();setLoadError('');setData(null);loadCreators(fetch,controller.signal).then(setData).catch((error:unknown)=>{if(!controller.signal.aborted)setLoadError(error instanceof Error?error.message:'데이터를 다시 불러와 주세요.');});return()=>controller.abort();},[reload]);
  useEffect(()=>{if(!brief)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:4,brief,selected:selectedIds,compared:comparedIds,notes,decisions}));setStorageError(false);}catch{setStorageError(true);}},[brief,selectedIds,comparedIds,notes,decisions]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(timer);},[toast]);
  const result=useMemo(()=>data&&brief?recommend(data,brief.input,'cohort',criteriaOf(brief).weights):null,[data,brief]);
  const sorted=useMemo(()=>result?sortMatches(result.matched,sort):[],[result,sort]);
  const selected=selectedIds.flatMap(id=>data?.find(c=>c.id===id)??[]);
  const compared=comparedIds.flatMap(id=>selected.find(c=>c.id===id)??[]);
  const matchIds=new Set(result?.matched.map(x=>x.creator.id));
  const visible=view==='saved'?selected:tab==='quote'?(result?.needsQuote??[]):sorted.map(x=>x.creator);
  const toggle=(id:string)=>{
    if(selectedIds.includes(id)){setSelectedIds(ids=>ids.filter(x=>x!==id));setComparedIds(ids=>ids.filter(x=>x!==id));setDecisions(d=>Object.fromEntries(Object.entries(d).filter(([key])=>key!==id)));setToast('담은 후보에서 뺐습니다.');}
    else {setSelectedIds(ids=>[...ids,id]);setToast('검토 후보로 담았습니다.');}
  };
  const compareToggle=(id:string)=>{
    if(!comparedIds.includes(id)&&comparedIds.length===3){setToast('비교는 한 번에 3명까지 가능합니다. 다른 후보의 비교 선택을 해제해 주세요.');return;}
    setComparedIds(ids=>toggleCompared(ids,id));
  };
  const decide=(id:string,decision:Decision)=>{setSelectedIds(ids=>ids.includes(id)?ids:[...ids,id]);setDecisions(d=>({...d,[id]:decision}));};
  const contacts=selected.filter(c=>decisions[c.id]==='contact');
  const complete=(next:Brief)=>{closeSetup();setBrief(next);setModal(null);setTab('matched');setSort('recommended');setLimit(12);setView('discovery');};
  const liveState=useRef({brief,selectedIds});
  liveState.current={brief,selectedIds};
  useEffect(()=>{
    if(!data)return;
    const context=modelContext();if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    const register=(tool:Parameters<typeof context.registerTool>[0])=>{try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported registry does not block the UI. */}};
    register({name:'apply_campaign_brief',description:'Apply budget, categories, follower range and recommendation priority. Updates the visible creator results and this browser’s saved brief.',inputSchema:briefSchema,annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(input)=>{const next=parseToolBrief(input);flushSync(()=>complete(next));const matches=recommend(data,next.input,'cohort',priorityOf(next.priority).weights);return {applied:next,matched:matches.matched.length,needsQuote:matches.needsQuote.length,top3:matches.matched.slice(0,3).map(x=>({id:x.creator.id,name:x.creator.name}))};}});
    register({name:'read_campaign_results',description:'Read the applied campaign conditions, shortlist IDs and top three creator results. Makes no changes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>{const current=liveState.current;if(!current.brief)return {stage:'onboarding'};const matches=recommend(data,current.brief.input,'cohort',criteriaOf(current.brief).weights);return {applied:current.brief,selected:current.selectedIds,matched:matches.matched.length,needsQuote:matches.needsQuote.length,top3:matches.matched.slice(0,3).map(x=>({id:x.creator.id,name:x.creator.name}))};}});
    return()=>lifecycle.abort();
  },[data]);
  if(!brief||showSetup)return <Onboarding initial={brief??undefined} onComplete={complete} onCancel={brief?closeSetup:undefined}/>;
  const priority=criteriaOf(brief);
  return <div className="app"><a className="skip-link" href="#main">결과로 바로가기</a><aside className="sidebar"><a className="wordmark" href="./"><span className="brand-sign">c<span>m</span></span><span>creator<br/>match</span></a><span className="nav-label">캠페인 작업실</span><nav><button className={view==='discovery'?'active':''} onClick={()=>setView('discovery')}><Icon name="search"/>크리에이터 찾기</button><button className={view==='saved'?'active':''} onClick={()=>setView('saved')}><Icon name="bookmark"/>담은 후보 <span>{selected.length}</span></button></nav><div className="sidebar-bottom"><span className="demo-dot"/>데모 워크스페이스<p>{storageError?'저장이 제한되어 새로고침하면 초기화됩니다.':'조건과 후보는 이 브라우저에 저장됩니다.'}</p></div></aside>
    <div className="main-shell"><header className="topbar"><span>워크스페이스 <span className="slash">/</span> {view==='saved'?'담은 후보':'크리에이터 탐색'}</span><div className="header-actions"><a className="text-button" href="#setup">캠페인 설정</a><span className="dataset-indicator">더미 데이터 · {data?.length??200}명</span></div></header><main id="main">
      <div className="page-heading"><div><p className="section-kicker">{view==='saved'?'비교 → 문의 후보 지정 → 팀 검토안':'후보 탐색 → 비교·문의 후보 지정 → 팀 검토안'}</p><h1>{view==='saved'?'담은 후보':'이번 캠페인의 검토 후보'}</h1></div><button className="secondary-button" onClick={()=>setModal('conditions')}><Icon name="edit" size={16}/>조건 변경</button></div>
      <div className="brief-bar"><div><span className="brief-key">예산</span><strong>{moneyText(brief.input.budgetKRW)}</strong><small>/ 1명</small></div><div><span className="brief-key">분야</span>{brief.input.categories.map(c=><span className="category-tag" key={c}>{c}</span>)}</div><div><span className="brief-key">팔로워</span><strong>{TIERS.find(t=>t.id===brief.input.sizeTier)!.range}</strong></div></div>
      <section className="priority-strip" aria-label="현재 추천 기준"><div><Icon name={priority.icon} size={19}/><span>추천 기준</span></div><div className="priority-switch">{PRIORITIES.map(p=><button aria-pressed={!brief.customWeights&&p.id===brief.priority} key={p.id} onClick={()=>{setBrief({...brief,priority:p.id,customWeights:undefined});setSort('recommended');setLimit(12);setToast(p.label+' 기준으로 추천을 바꿨습니다.');}}>{p.label}</button>)}</div><button className="text-button" onClick={()=>setModal('priority')}>{brief.customWeights?'직접 설정 · 비중 조절':'비중 조절'}</button></section>
      {!data&&!loadError&&<div className="empty-state" role="status"><Icon name="search" size={30}/><h2>후보를 불러오고 있어요.</h2></div>}
      {loadError&&<div className="empty-state" role="alert"><h2>데이터를 불러오지 못했어요.</h2><p>{loadError}</p><button className="primary-button" onClick={()=>setReload(x=>x+1)}>다시 불러오기</button></div>}
      {result&&<><div className="list-toolbar">{view==='discovery'?<div className="result-tabs" role="tablist" aria-label="후보 상태"><button role="tab" aria-selected={tab==='matched'} onClick={()=>{setTab('matched');setLimit(12);}}>추천 후보 <span>{result.matched.length}</span></button><button role="tab" aria-selected={tab==='quote'} onClick={()=>{setTab('quote');setLimit(12);}}>비용 미확인 <span>{result.needsQuote.length}</span></button></div>:<h2>검토 후보 <span className="count">{selected.length}</span></h2>}{view==='discovery'&&tab==='matched'&&<select aria-label="결과 정렬" value={sort} onChange={e=>{setSort(e.target.value as SortKey);setLimit(12);}}>{SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>}</div>
      <p className="list-context">{view==='saved'?'2~3명을 선택해 비교하거나, 후보를 열어 바로 문의 후보로 지정하세요. 조건을 바꿔도 검토 내용은 유지됩니다.':tab==='quote'?'분야·팔로워 조건은 맞지만 비용 정보가 없습니다. 견적을 확인한 뒤 검토하세요. 평균 조회수순으로 표시합니다.':result.matched.length?'과거 평균 비용이 예산 안에 드는 후보입니다. 실제 견적과 다를 수 있습니다.':''}</p>
      <div className="sr-only" role="status">추천 후보 {result.matched.length}명, 비용 미확인 {result.needsQuote.length}명. {priority.label} 기준.</div>
      {visible.length>0?<><div className="candidate-table"><div className="table-heading" aria-hidden="true"><span>{view==='saved'?'비교':'담기'}</span><span>크리에이터</span><span>평균 조회수</span><span>참여율</span><span>협업 이력</span><span>과거 평균 비용</span><span/></div>{visible.slice(0,limit).map(c=>{const item=result.matched.find(x=>x.creator.id===c.id);return <article className={'candidate-row '+(selectedIds.includes(c.id)?'row-selected':'')} key={c.id} aria-label={c.name+' 후보'}>{view==='saved'?<button className={'save-check '+(comparedIds.includes(c.id)?'checked':'')} aria-label={c.name+' 비교 선택'} aria-pressed={comparedIds.includes(c.id)} onClick={()=>compareToggle(c.id)}>{comparedIds.includes(c.id)&&<Icon name="check" size={14}/>}</button>:<button className={'save-check '+(selectedIds.includes(c.id)?'checked':'')} aria-label={c.name+(selectedIds.includes(c.id)?' 담기 취소':' 후보 담기')} aria-pressed={selectedIds.includes(c.id)} onClick={()=>toggle(c.id)}><Icon name={selectedIds.includes(c.id)?'check':'bookmark'} size={14}/></button>}<button className="identity-button" onClick={()=>setDetail(c)}><Identity creator={c}/>{view==='saved'&&<span className={'status-chip '+(decisions[c.id]??'review')}>{decisionLabel(decisions[c.id])}</span>}{view==='saved'&&!matchIds.has(c.id)?<span className="row-insight outside">{candidateStatus(c,brief)}</span>:item&&<span className="row-insight">{insight(item)}</span>}</button><div className="metric-cell"><span className="mobile-label">평균 조회수</span><strong>{numberText(c.views)}</strong><small>회</small></div><div className="metric-cell"><span className="mobile-label">참여율</span><strong>{c.engagement.toFixed(1)}</strong><small>%</small></div><div className="history-cell"><span className="mobile-label">협업 이력</span><strong>{c.campaigns}건</strong><span className="rating">{c.rating===null?'미평가':<><span aria-hidden="true">★</span> {c.rating.toFixed(1)}</>}</span></div><div className="cost-cell"><span className="mobile-label">과거 평균 비용</span><strong>{hasKnownBudget(c)?moneyText(c.averageBudget):'미확인'}</strong></div><button className="row-open" aria-label={c.name+' 상세 보기'} onClick={()=>setDetail(c)}>살펴보기 <Icon name="arrow" size={15}/></button></article>;})}</div>{visible.length>limit&&<button className="more-button" onClick={()=>setLimit(n=>n+12)}>후보 더 보기 <span>{Math.min(limit,visible.length)} / {visible.length}</span></button>}</>:<div className="empty-state"><Icon name={view==='saved'?'bookmark':'search'} size={34}/><h2>{view==='saved'?'눈여겨본 후보를 담아보세요.':tab==='quote'?'비용이 미확인된 후보가 없어요.':result.summary.categoryAndTier===0?'이 분야·규모에는 후보가 없어요.':result.summary.overBudget===0?'비용 확인이 필요한 후보만 있어요.':'예산 안에 드는 후보가 없어요.'}</h2><p>{view==='saved'?'후보를 비교하고 문의할 사람을 정리하세요. 한 명부터 검토안을 만들 수 있습니다.':tab==='quote'?'추천 후보에서 채널을 살펴보세요.':'아래 조건으로 바꾸거나 다른 분야를 살펴보세요.'}</p>{view==='saved'?<button className="primary-button" onClick={()=>setView('discovery')}>후보 찾기<Icon name="arrow" size={16}/></button>:tab==='quote'?<button className="secondary-button" onClick={()=>setTab('matched')}>추천 후보 보기</button>:<div className="alternatives">{result.alternatives.map((a,i)=><button key={i} onClick={()=>complete({...brief,input:a.input})}><span><strong>{a.label}</strong><small>{a.detail}</small></span><span>{a.count}명 보기 →</span></button>)}{result.needsQuote.length>0&&<button onClick={()=>setTab('quote')}><span><strong>비용 미확인 후보 먼저 보기</strong><small>분야·팔로워 조건 유지</small></span><span>{result.needsQuote.length}명 보기 →</span></button>}<button className="text-button" onClick={()=>setModal('conditions')}>탐색 조건 다시 정하기</button></div>}</div>}
      <div className="dataset-foot"><span>조건 충족은 과거 데이터 기준입니다. 최종 선정 전 현재 견적과 콘텐츠를 확인하세요.</span></div></>}
    </main></div>
    {selected.length>0&&<div className="comparison-tray"><div><span className="tray-count">{view==='saved'?compared.length:selected.length}</span><strong>{view==='saved'?'비교 선택 / 3명':'담은 후보'}</strong><span className="tray-names">{view==='saved'?compared.map(c=>c.name).join(' · '):'모아둔 후보에서 비교할 대상을 골라보세요.'}</span></div><div className="tray-actions">{contacts.length>0&&<button className="secondary-button" onClick={()=>setModal('handoff')}>팀 검토안 · {contacts.length}명</button>}{view==='saved'?<button className="primary-button" disabled={compared.length<2&&selected.length!==1} onClick={()=>selected.length===1?setDetail(selected[0]):setModal('compare')}>{selected.length===1?'후보 확인하고 결정하기':compared.length<2?'2명 이상 선택하세요':compared.length+'명 비교하기'}<Icon name="arrow" size={17}/></button>:<button className="primary-button" onClick={()=>setView('saved')}>담은 후보 검토<Icon name="arrow" size={17}/></button>}</div></div>}
    {toast&&<div className="toast" role="status">{toast}</div>}
    {modal==='conditions'&&<Modal title="캠페인 조건 바꾸기" onClose={()=>setModal(null)}><Conditions initial={brief} onSubmit={complete}/></Modal>}
    {modal==='priority'&&data&&<PriorityEditor brief={brief} all={data} onClose={()=>setModal(null)} onApply={value=>{setBrief(value);setSort('recommended');setLimit(12);setModal(null);setToast(criteriaOf(value).label+' 기준을 적용했습니다.');}}/>}
    {detail&&data&&<Profile creator={detail} all={data} brief={brief} selected={selectedIds.includes(detail.id)} decision={decisions[detail.id]} onDecision={value=>decide(detail.id,value)} onHandoff={()=>{setDetail(null);setModal('handoff');}} onToggle={()=>toggle(detail.id)} onClose={()=>setDetail(null)}/>}
    {modal==='compare'&&data&&compared.length>=2&&<Compare selected={compared} all={data} brief={brief} notes={notes} decisions={decisions} onDecision={decide} onNote={(id,value)=>setNotes(n=>({...n,[id]:value}))} onClose={()=>setModal(null)} onHandoff={()=>setModal('handoff')}/>}
    {modal==='handoff'&&data&&<Handoff selected={selected} all={data} brief={brief} notes={notes} decisions={decisions} onNote={(id,value)=>setNotes(n=>({...n,[id]:value}))} onClose={()=>setModal(null)}/>}
  </div>;
}
