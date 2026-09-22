import {useEffect,useRef,useState} from 'react';
import type {Creator} from './domain';
import type {Brief} from './experience';
import {formatBudget} from './experience';
import {campaignOf,STAGES,METRICS,inquiryDraft,parseMetric,workIssues,normalizeWorkUrls,hasOutcome} from './campaign';
import type {WorkRecord,Outcome,Stage,FieldIssues} from './campaign';
import {numberText} from './policy';
import {Identity,Modal,RequiredMark,RequiredHint} from './ui';
import {AssistantPanel} from './AssistantPanel';
import {SentMessageHistory} from './SentInquiries';
import {sentHistoryOf} from './sentHistory';
import {stageNeeds,simulateSend,recordExternalInquiry,STAGE_GUIDES} from './collaborationFlow';

function fieldProps(name:string,issues:FieldIssues){const labels:Record<string,string>={'outcome.contentUrl':'게시한 콘텐츠 링크','outcome.measuredAt':'성과 확인일','outcome.source':'지표를 확인한 출처','outcome.attribution':'구매·매출 집계 기준',email:'확인한 이메일',channelUrl:'확인한 채널 링크',contactedAt:'실제로 문의한 날짜',dueDate:'게시 예정일'};return {'aria-label':labels[name],'data-field':name,id:'field-'+name,'aria-invalid':!!issues[name],'aria-describedby':issues[name]?'error-'+name:undefined};}
function FieldError({name,issues}:{name:string;issues:FieldIssues}){return issues[name]?<span className="error-text" id={'error-'+name}>{issues[name]}</span>:null;}
function AmountField({label,value,onChange,example='1,000,000',name='',issues={}}:{label:string;value:number|null;onChange:(n:number|null)=>void;example?:string;name?:string;issues?:FieldIssues}){
  const [raw,setRaw]=useState(value===null?'':numberText(value));
  useEffect(()=>{if(value===null)setRaw('');else if(Number.isFinite(value))setRaw(numberText(value));},[value]);
  return <label className="field-label">{label}<input {...fieldProps(name,issues)} aria-label={label} inputMode="numeric" placeholder={'예: '+example} value={raw} onChange={e=>{const v=formatBudget(e.target.value);setRaw(v);onChange(parseMetric(v));}}/><FieldError name={name} issues={issues}/></label>;
}
function OutcomeFields({value,onChange,issues}:{value:Outcome;onChange:(value:Outcome)=>void;issues:FieldIssues}){
  const examples:Record<string,string>={views:'25,000',likes:'850',comments:'42',shares:'120',saves:'200',clicks:'500',conversions:'15',revenue:'450,000'};
  const numeric=hasOutcome(value),purchase=value.conversions!==null||value.revenue!==null;
  const [expanded,setExpanded]=useState(purchase);
  useEffect(()=>{if(Object.keys(issues).some(k=>k.startsWith('outcome.')&&!['outcome.cost','outcome.views','outcome.contentUrl','outcome.measuredAt','outcome.source'].includes(k)))setExpanded(true);},[issues]);
  const metric=(key:string)=>{const m=METRICS.find(m=>m.key===key)!;return <AmountField key={m.key} name={'outcome.'+m.key} issues={issues} label={m.label+' ('+m.unit+')'} example={examples[m.key]} value={value[m.key]} onChange={n=>onChange({...value,[m.key]:n})}/>;};
  return <section className="outcome-fields"><div className="section-heading"><div><h3>콘텐츠와 확인한 성과</h3><p>수치를 입력하면 확인일·출처도 필요해요. 구매·매출에는 집계 기준을 함께 남겨주세요.</p></div><span className="manual-badge">직접 입력</span></div><RequiredHint/>
    <div className="field-grid"><label className="field-label span-two">게시한 콘텐츠 링크<input {...fieldProps('outcome.contentUrl',issues)} inputMode="url" autoCapitalize="none" value={value.contentUrl} placeholder="예: youtube.com/watch?v=…" onChange={e=>onChange({...value,contentUrl:e.target.value})}/><FieldError name="outcome.contentUrl" issues={issues}/></label><label className="field-label"><span>성과 확인일{numeric&&<RequiredMark/>}</span><input {...fieldProps('outcome.measuredAt',issues)} required={numeric} type="date" value={value.measuredAt} onInput={e=>onChange({...value,measuredAt:e.currentTarget.value})} onChange={e=>onChange({...value,measuredAt:e.target.value})}/><FieldError name="outcome.measuredAt" issues={issues}/></label><label className="field-label"><span>지표를 확인한 출처{numeric&&<RequiredMark/>}</span><input {...fieldProps('outcome.source',issues)} required={numeric} value={value.source} maxLength={1000} placeholder="예: 크리에이터가 전달한 7일차 인사이트" onChange={e=>onChange({...value,source:e.target.value})}/><FieldError name="outcome.source" issues={issues}/></label><AmountField name="outcome.cost" issues={issues} label="실제 집행비 (원)" value={value.cost} onChange={cost=>onChange({...value,cost})}/>{metric('views')}</div>
    <details className="contact-details" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>반응·클릭·구매 결과 추가{purchase&&<span className="details-state"> 구매·매출 입력 중</span>}</summary><div className="field-grid">{METRICS.filter(m=>m.key!=='views').map(m=>metric(m.key))}</div><label className="field-label"><span>구매·매출 집계 기준{purchase&&<RequiredMark/>}</span><input {...fieldProps('outcome.attribution',issues)} required={purchase} value={value.attribution} maxLength={1000} placeholder="예: 전용 할인코드 사용 구매, 게시 후 7일 집계" onChange={e=>onChange({...value,attribution:e.target.value})}/><FieldError name="outcome.attribution" issues={issues}/></label></details>
    <p className="muted">같은 콘텐츠의 누적 수치로 업데이트하세요. 확인하지 못한 값은 비워두세요.</p>
  </section>;
}

export function CollaborationEditor({creator:c,record,brief,reason,onSave,onClose,onReport,initialResults=false,initialSent=false,initialCompose=false}:{creator:Creator;record:WorkRecord;brief:Brief;reason:string;onSave:(record:WorkRecord)=>void;onClose:()=>void;onReport:()=>void;initialResults?:boolean;initialSent?:boolean;initialCompose?:boolean}){
  const [draft,setDraft]=useState(record),[result,setResult]=useState(!initialCompose&&!initialSent&&(initialResults||record.stage==='complete')),[history,setHistory]=useState(initialSent),[composing,setComposing]=useState(initialCompose),[errors,setErrors]=useState<string[]>([]),[status,setStatus]=useState(''),[showAI,setShowAI]=useState(false),[sending,setSending]=useState(false),[leaving,setLeaving]=useState(false);
  const leaveRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(leaving)leaveRef.current?.focus();},[leaving]);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const [attempted,setAttempted]=useState(false);
  const issues=attempted?workIssues(draft):{};
  const editorRef=useRef<HTMLDivElement>(null);
  const revealErrors=(problems:FieldIssues)=>{
    const first=Object.keys(problems)[0];
    setAttempted(true);setErrors([]);setLeaving(false);setHistory(false);setResult(first.startsWith('outcome.'));setComposing(false);
    requestAnimationFrame(()=>{const field=editorRef.current?.querySelector<HTMLElement>('[data-field="'+first+'"]');
      let parent=field?.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}
      field?.focus();field?.scrollIntoView({block:'center',behavior:'smooth'});
    });
  };
  const text=draft.message||inquiryDraft(c,brief,draft,reason),guide=STAGE_GUIDES[draft.stage],needs=stageNeeds(draft);
  const save=(next=draft)=>{next=normalizeWorkUrls(next);const problems=workIssues(next);if(Object.keys(problems).length){revealErrors(problems);return false;}setAttempted(false);setErrors([]);onSave(next);setDraft(next);setStatus('저장했습니다.');return true;};
  const changeStage=(stage:Stage)=>{setHistory(false);setComposing(false);setDraft({...draft,stage});setResult(stage==='complete');setStatus('변경사항을 저장하면 목록에도 반영됩니다.');};
  const advance=()=>{
    if(draft.stage==='draft'||composing){
      const clean=normalizeWorkUrls(draft),problems=workIssues(clean);if(Object.keys(problems).length){revealErrors(problems);return;}
      try{const next=simulateSend(clean,text,new Date().toISOString());setSending(true);timer.current=setTimeout(()=>{onSave(next);setDraft(next);setSending(false);setComposing(false);setHistory(true);setResult(false);setStatus(c.name+'님에게 보낸 문의를 저장했어요. 답변이 오면 견적과 조건을 기록하세요.');},700);}catch(e){setErrors([e instanceof Error?e.message:'문안을 확인해 주세요.']);}return;
    }
    if(guide.next){const next={...draft,stage:guide.next};if(save(next)){setHistory(false);setResult(guide.next==='complete');setStatus(STAGES.find(s=>s.id===guide.next)!.label+' 상태로 변경했습니다.');}}
    else if(save())onReport();
  };
  const close=()=>{if(JSON.stringify(draft,(_k,v)=>typeof v==='number'&&Number.isNaN(v)?'INVALID_NUMBER':v)!==JSON.stringify(record))setLeaving(true);else onClose();};
  const contactFields=<div className="field-grid"><label className="field-label"><span>실제로 문의한 날짜{draft.stage==='draft'&&<RequiredMark/>}</span><input {...fieldProps('contactedAt',issues)} aria-required={draft.stage==='draft'} type="date" value={draft.contactedAt} onInput={e=>setDraft({...draft,contactedAt:e.currentTarget.value})} onChange={e=>setDraft({...draft,contactedAt:e.target.value})}/><FieldError name="contactedAt" issues={issues}/></label><label className="field-label">확인한 이메일<input {...fieldProps('email',issues)} type="email" maxLength={254} value={draft.email} placeholder="예: creator@example.com" onChange={e=>setDraft({...draft,email:e.target.value})}/><FieldError name="email" issues={issues}/></label><label className="field-label span-two">확인한 채널 링크<input {...fieldProps('channelUrl',issues)} inputMode="url" autoCapitalize="none" value={draft.channelUrl} maxLength={1000} placeholder="예: instagram.com/계정명" onChange={e=>setDraft({...draft,channelUrl:e.target.value})}/><FieldError name="channelUrl" issues={issues}/></label></div>;
  const terms=<div className="field-grid"><label className="field-label">제작 범위<input value={draft.deliverable} maxLength={500} placeholder="예: 릴스 1편, 수정 1회" onChange={e=>setDraft({...draft,deliverable:e.target.value})}/></label><label className="field-label">게시 예정일<input {...fieldProps('dueDate',issues)} type="date" value={draft.dueDate} onInput={e=>setDraft({...draft,dueDate:e.currentTarget.value})} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/><FieldError name="dueDate" issues={issues}/></label><label className="field-label span-two">콘텐츠 사용 범위<input maxLength={500} value={draft.rights} placeholder="예: 브랜드 채널 재게시 30일, 광고 소재 사용 제외" onChange={e=>setDraft({...draft,rights:e.target.value})}/></label></div>;
  return <Modal title={c.name+' · 문의와 협업'} onClose={close} wide><div className="workflow-editor" ref={editorRef}>
    <div className="editor-summary"><Identity creator={c}/><label className="stage-control">진행 상태<select aria-label="협업 진행 상태" value={draft.stage} onChange={e=>changeStage(e.target.value as Stage)} disabled={sending}>{STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label></div>
    <div className="stage-guide"><span className="section-kicker">{STAGES.find(s=>s.id===draft.stage)?.label}</span><h3>{result?'게시한 콘텐츠의 성과를 남겨주세요':composing?'추가 문의를 작성하세요':guide.title}</h3><p>{result?'입력한 결과는 성과 리포트에서 비교할 수 있어요.':composing?'이전 문안을 수정해 다시 보낼 수 있어요. 보낸 내역과 협업 상태는 유지됩니다.':guide.description}</p></div>
    {status&&<p className="save-feedback" role="status">{status}</p>}
    {(Object.keys(issues).length>0||errors.length>0)&&<div className="error-box validation-summary" role="alert"><strong>아직 저장하지 못했어요.</strong><p>{errors.length?errors.join(' '):'표시된 '+Object.keys(issues).length+'개 항목을 확인해 주세요.'}</p></div>}
    <div className="editor-tabs" role="tablist" aria-label="협업 기록 영역"><button role="tab" aria-selected={!result&&!history} onClick={()=>{setHistory(false);setComposing(false);setResult(false);}}>진행 관리</button><button role="tab" aria-selected={history} onClick={()=>{setHistory(true);setComposing(false);setResult(false);}}>보낸 문의 <span>{sentHistoryOf(draft).length}</span></button><button role="tab" aria-selected={result} onClick={()=>{setHistory(false);setComposing(false);setResult(true);}}>성과 기록</button></div>
    {history?<><SentMessageHistory record={draft}/><button className="secondary-button" onClick={()=>{setHistory(false);setResult(false);setComposing(true);}}>추가 문의 작성</button></>:result?<OutcomeFields issues={issues} value={draft.outcome} onChange={outcome=>setDraft({...draft,outcome})}/>:<>
      {(draft.stage==='draft'||composing)&&<><div className="recipient-bar"><span>받는 사람</span><strong>{c.name}</strong></div><section className="inquiry-draft"><div className="section-heading"><h3>보낼 문의 문안<RequiredMark/></h3><button className="ai-button" disabled={sending} onClick={()=>setShowAI(!showAI)}>✦ AI로 다듬기</button></div><textarea aria-label="보낼 문의 문안" required disabled={sending} value={text} onChange={e=>setDraft({...draft,message:e.target.value})}/><div className="form-actions"><button className="text-button" onClick={()=>setDraft({...draft,message:''})}>현재 조건으로 다시 채우기</button><button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setStatus('문안을 복사했습니다. 실제 메일이나 DM에 붙여 넣으세요.');}catch{setStatus('문안을 직접 선택해 복사해 주세요.');}}}>문안 복사</button>{draft.email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)&&<a className="text-button" href={'mailto:'+encodeURIComponent(draft.email)+'?subject='+encodeURIComponent(campaignOf(brief).name+' 협업 문의')+'&body='+encodeURIComponent(text)}>이메일 초안 열기 ↗</a>}</div></section>{showAI&&<AssistantPanel mode="outreach" context={text} onApply={message=>{setDraft({...draft,message});setShowAI(false);setStatus('AI 문안을 적용했습니다. 보내기 전 내용을 확인해 주세요.');}}/>}<details className="contact-details"><summary>문의에 포함할 제작 조건</summary>{terms}</details></>}
      {!composing&&draft.stage==='contacted'&&<div className="waiting-card"><strong>{'답변이 도착하면 다음으로 이어가세요.'}</strong><p>{draft.demoSentAt?'아래 ‘답변 받았어요’를 누르면 견적과 제작 조건을 기록할 수 있어요.':'아직 답변이 없다면 기록을 저장하고 목록에서 다른 후보를 검토하세요.'}</p></div>}
      {!composing&&['negotiating','active','complete'].includes(draft.stage)&&<section className="terms-section"><h3>{draft.stage==='negotiating'?'답변과 받은 견적':'최종 협업 조건'}</h3><div className="field-grid"><AmountField name="quotedCost" issues={issues} label="받은 견적 (원)" value={draft.quotedCost} onChange={quotedCost=>setDraft({...draft,quotedCost})}/><div><AmountField name="agreedCost" issues={issues} label="합의 비용 (원)" value={draft.agreedCost} onChange={agreedCost=>setDraft({...draft,agreedCost})}/>{draft.quotedCost!==null&&<button className="text-button quote-copy" onClick={()=>setDraft({...draft,agreedCost:draft.quotedCost})}>받은 견적으로 채우기</button>}</div></div>{terms}</section>}
      {!composing&&draft.stage==='declined'&&<label className="field-label">진행하지 않은 이유<textarea maxLength={2000} value={draft.closedReason} placeholder="예: 제안 일정이 맞지 않아 다음 신제품 캠페인에서 재검토" onChange={e=>setDraft({...draft,closedReason:e.target.value})}/></label>}
      {!composing&&draft.stage!=='draft'&&<label className="field-label">답변·진행 메모<textarea maxLength={2000} value={draft.memo} placeholder="예: 견적 120만원 회신. 금요일까지 게시 가능 일정 확인 예정" onChange={e=>setDraft({...draft,memo:e.target.value})}/></label>}
      <details className="contact-details"><summary>{draft.stage==='draft'?'외부에서 직접 연락했나요?':'연락처·실제 문의 날짜'}</summary><p className="data-caption">메일이나 DM으로 직접 보냈다면 문의한 날짜를 남겨주세요. 연락처는 나중에 추가해도 돼요.</p><RequiredHint/>{contactFields}{draft.stage==='draft'&&<button className="secondary-button" disabled={!draft.contactedAt} onClick={()=>{try{const next=recordExternalInquiry(normalizeWorkUrls(draft),text,record);if(save(next)){setHistory(true);setResult(false);setStatus('외부에서 보낸 문의를 기록했습니다.');}}catch(e){setErrors([e instanceof Error?e.message:'문의 날짜를 확인해 주세요.']);}}}>외부에서 보낸 문의 기록</button>}</details>
    </>}
    {!history&&needs.length>0&&<p className="stage-needs">나중에 추가할 항목: {needs.join(' · ')}</p>}
    {leaving&&<div ref={leaveRef} tabIndex={-1} className="unsaved-choice" role="alert"><p>저장하지 않은 변경사항이 있어요.</p><button className="secondary-button" onClick={()=>setLeaving(false)}>계속 작성</button><button className="text-button" onClick={onClose}>저장하지 않고 닫기</button><button className="primary-button" onClick={()=>{if(save())onClose();}}>저장하고 닫기</button></div>}
    {!leaving&&<div className="editor-footer"><button className="secondary-button" disabled={sending} onClick={()=>{if(save())onClose();}}>저장하고 닫기</button><button className="primary-button" disabled={sending} onClick={result?()=>{if(save())onReport();}:advance}>{sending?'문의 보내는 중…':result?'저장하고 성과 리포트 보기':composing?'추가 문의 보내기':guide.action}</button></div>}
  </div></Modal>;
}
