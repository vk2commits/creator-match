import {useEffect,useRef,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {BriefBuilder} from './BriefBuilder';
import {WeightControls} from './WeightControls';
import type {Brief} from './experience';
import {formatBudget} from './experience';
import {CATEGORIES,PRIORITIES,TIERS,priorityOf} from './policy';
import {GOALS} from './campaign';
import type {Campaign,CustomerNeed} from './campaign';
import {CUSTOMER_NEEDS} from './channelAnalysis';
import {newSetup,setupFromText,setupErrors,finishSetup,withSetupGoal} from './setup';
import {Icon,RequiredMark} from './ui';

export function Onboarding({initial,onComplete,onCancel,campaignNav}:{initial?:Brief;onComplete:(brief:Brief)=>void;onCancel?:()=>void;campaignNav?:ReactNode}){
 const [value,setValue]=useState(()=>newSetup(initial));
 const [storedPhase,setPhase]=useState<'describe'|'campaign'|'conditions'|'priority'|'review'>(initial?'campaign':'describe');
 const phase=storedPhase==='review'?'campaign':storedPhase;
 const steps=[{id:'campaign',label:'캠페인·고객'},{id:'conditions',label:'후보 조건'},{id:'priority',label:'추천 기준'}] as const;
 const stepIndex=steps.findIndex(s=>s.id===phase);
 const extractedHere=value.extracted.filter(label=>(phase==='campaign'?['제품','고객','목표','표현 방향','필수 요소']:phase==='conditions'?['예산','분야','팔로워 수']:[]).includes(label));
 const titles={campaign:'어떤 캠페인인가요?',conditions:'어떤 크리에이터를 찾으세요?',priority:'어떤 기준을 더 중요하게 볼까요?'};
 const descriptions={campaign:'소개할 제품과 고객을 알려주세요.',conditions:'예산과 분야에 맞는 후보를 모을게요.',priority:'기준을 고르거나, 비중을 직접 조절하세요.'};
 const [text,setText]=useState(''),[reviewed,setReviewed]=useState(!!initial),[submitted,setSubmitted]=useState(false);
 const heading=useRef<HTMLHeadingElement>(null),form=useRef<HTMLFormElement>(null);
 const currentKeys=phase==='campaign'?['name','product']:phase==='conditions'?['budget','categories','tier']:['weights'];
 const campaign=value.campaign,errors=submitted?Object.fromEntries(Object.entries(setupErrors(value)).filter(([key])=>currentKeys.includes(key))):{},weights=value.customWeights??priorityOf(value.priority).weights;
 const missing=[...(!value.budget.trim()?['예산']:[]),...(!value.categories.length?['분야']:[]),...(!value.tier?['팔로워 수']:[])];
 useEffect(()=>{heading.current?.focus();window.scrollTo(0,0);},[phase]);
 const change=(patch:Partial<Campaign>)=>setValue(v=>({...v,campaign:{...v.campaign,...patch},nameChosen:patch.name!==undefined?true:v.nameChosen}));
 const submit=(e:FormEvent)=>{
  e.preventDefault();setSubmitted(true);
  const invalid=setupErrors(value);
  if(Object.keys(invalid).some(key=>currentKeys.includes(key))){requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());return;}
  if(phase==='campaign'){setSubmitted(false);setPhase('conditions');return;}
  if(phase==='conditions'){setSubmitted(false);setPhase('priority');return;}
  if(Object.keys(invalid).length){setPhase(invalid.name||invalid.product?'campaign':'conditions');return;}
  onComplete(finishSetup(value));
 };
 const fieldError=(key:keyof typeof errors)=>errors[key]?<p className="error-text" id={'setup-'+key+'-error'}>{errors[key]}</p>:null;
 return <div className="campaign-intake"><header className="intake-header"><span className="wordmark"><span className="brand-sign">c<span>m</span></span>creator match</span>{campaignNav}{onCancel&&<button className="text-button" onClick={onCancel}>변경 없이 돌아가기</button>}</header>
 <main className={'intake-main '+(phase==='describe'?'intake-start':'intake-review')}>
  <div className="intake-progress" aria-label="캠페인 설정 단계">{phase==='describe'?<span>캠페인 시작하기</span>:steps.map((step,i)=><span key={step.id} className={i===stepIndex?'current':i<stepIndex?'done':''} aria-current={i===stepIndex?'step':undefined}>{i+1} {step.label}</span>)}</div>
  {phase==='describe'?<div className="intake-opening"><section className="intake-intro"><p className="section-kicker">새 캠페인</p><h1 ref={heading} tabIndex={-1}>어떤 제품을<br/>누구에게 소개할까요?</h1><p>정해둔 내용을 편하게 적어주세요.<br/>다음 단계의 입력란을 미리 채워드려요.<br/>내용을 확인하고, 빠진 조건만 추가하세요.</p><ol className="intake-value"><li><Icon name="search" size={18}/><span><strong>후보 찾기</strong>예산과 조건에 맞는 크리에이터</span></li><li><Icon name="reaction" size={18}/><span><strong>적합 이유 확인</strong>우리 제품과 연결되는 콘텐츠 근거</span></li><li><Icon name="send" size={18}/><span><strong>문의 준비</strong>제작 제안과 확인할 질문</span></li></ol></section><BriefBuilder text={text} onText={setText} onGenerate={source=>{setValue(v=>setupFromText(source,v));setReviewed(true);setSubmitted(false);setPhase('campaign');}} onManual={()=>{setReviewed(true);setPhase('campaign');}} onReturn={reviewed?()=>setPhase('campaign'):undefined}/></div>:<div className="intake-opening intake-step">
   <div className="intake-review-heading intake-intro"><div><p className="section-kicker">{stepIndex+1} / 3 · {initial?'캠페인 설정':'새 캠페인'}</p><h1 ref={heading} tabIndex={-1}>{titles[phase]}</h1><p>{descriptions[phase]}</p></div><button className="text-button" onClick={()=>setPhase('describe')}>설명으로 다시 정리</button></div>
   <form ref={form} noValidate onSubmit={submit} className="intake-review-form">
    {extractedHere.length>0&&<p className="extraction-note"><Icon name="check" size={15}/><span>설명을 바탕으로 {extractedHere.join('·')} 항목을 채웠어요. 확인하고 수정하세요.</span></p>}
    {submitted&&Object.keys(errors).length>0&&<p className="intake-error-summary" role="alert">표시된 항목을 확인해 주세요. 작성한 내용은 그대로 있어요.</p>}
    <div className="intake-columns">
     {phase==='campaign'&&
     <section className="intake-panel"><div className="intake-panel-heading"><h2>소개할 제품과 고객</h2><span><RequiredMark/>필수 입력</span></div>
      <label className="field-label"><span>캠페인명<RequiredMark/></span><input required maxLength={80} value={campaign.name} onChange={e=>change({name:e.target.value})} aria-invalid={!!errors.name} aria-describedby={errors.name?'setup-name-error':undefined} placeholder="예: 가을 립틴트 출시"/>{fieldError('name')}</label>
      <label className="field-label"><span>제품과 알리고 싶은 점<RequiredMark/></span><textarea required maxLength={1500} value={campaign.product} onChange={e=>change({product:e.target.value})} aria-invalid={!!errors.product} aria-describedby={errors.product?'setup-product-error':undefined} placeholder="예: 색이 오래가는 립틴트, 자연광에서의 발색과 지속력"/>{fieldError('product')}</label>
      <label className="field-label"><span>소개하고 싶은 고객 <small>선택</small></span><input maxLength={300} value={campaign.targetCustomer??''} onChange={e=>change({targetCustomer:e.target.value})} placeholder="예: 출근 준비가 바쁜 직장인"/></label>
      <fieldset className="intake-goals"><legend>캠페인 목표<RequiredMark/></legend><div>{GOALS.map(g=><label className={campaign.goal===g.id?'selected':''} key={g.id}><input type="radio" name="setup-goal" required checked={campaign.goal===g.id} onChange={()=>setValue(v=>withSetupGoal(v,g.id))}/><span>{g.label}</span></label>)}</div>{!value.goalConfirmed&&<p>목표는 ‘제품 알리기’로 시작했어요. 원하는 방향으로 바꿀 수 있어요.</p>}</fieldset>
     </section>}
     {phase==='conditions'&&<section className="intake-panel"><div className="intake-panel-heading"><h2>함께할 후보의 조건</h2>{missing.length>0&&<span className="intake-missing">{missing.join(' · ')} 선택</span>}</div>
      <label className="field-label"><span>1명당 예산<RequiredMark/></span><div className="intake-budget"><input required inputMode="numeric" autoComplete="off" value={value.budget} onChange={e=>setValue(v=>({...v,budget:formatBudget(e.target.value)}))} aria-invalid={!!errors.budget} aria-describedby={errors.budget?'setup-budget-error':'setup-budget-help'} placeholder="예: 2,000,000"/><span>원</span></div>{fieldError('budget')}</label><p className="intake-field-help" id="setup-budget-help">과거 평균 협업비로 비교해요. 실제 견적은 문의에서 확인합니다.</p>
      <fieldset className="intake-categories"><legend>콘텐츠 분야<RequiredMark/><small>복수 선택</small></legend><div>{CATEGORIES.map(c=><label key={c} className={value.categories.includes(c)?'selected':''}><input type="checkbox" name="setup-category" checked={value.categories.includes(c)} aria-invalid={!!errors.categories} aria-describedby={errors.categories?'setup-categories-error':undefined} onChange={()=>setValue(v=>({...v,categories:v.categories.includes(c)?v.categories.filter(x=>x!==c):[...v.categories,c]}))}/>{c}</label>)}</div>{fieldError('categories')}</fieldset>
      <fieldset className="intake-tiers"><legend>크리에이터 규모<RequiredMark/></legend><div>{TIERS.map(t=><label className={value.tier===t.id?'selected':''} key={t.id}><input type="radio" name="setup-tier" required checked={value.tier===t.id} aria-invalid={!!errors.tier} aria-describedby={errors.tier?'setup-tier-error':undefined} onChange={()=>setValue(v=>({...v,tier:t.id}))}/><span><strong>{t.label}</strong><small>{t.range}</small></span></label>)}</div>{fieldError('tier')}</fieldset>
     </section>}
    </div>
    {phase==='campaign'&&<details className="intake-direction"><summary><span>원하는 표현과 꼭 담을 내용 <small>선택</small></span><span>{[campaign.creatorStyle,campaign.requiredElements].filter(Boolean).join(' · ')||'정해둔 내용이 있을 때 추가하세요'}</span></summary><div className="intake-direction-fields"><label className="field-label"><span>크리에이터의 표현 방식</span><input maxLength={500} value={campaign.creatorStyle??''} onChange={e=>change({creatorStyle:e.target.value})} placeholder="예: 자연스러운 일상, 자세한 비교 리뷰"/></label><label className="field-label"><span>콘텐츠에 꼭 담을 내용</span><input maxLength={500} value={campaign.requiredElements??''} onChange={e=>change({requiredElements:e.target.value})} placeholder="예: 자연광 발색, 사용 전후, 구매 링크"/></label><label className="field-label"><span>고객이 제품을 고를 때 중요한 점</span><select value={campaign.customerNeed??''} onChange={e=>change({customerNeed:(e.target.value||undefined) as CustomerNeed|undefined})}><option value="">아직 정하지 않았어요</option>{CUSTOMER_NEEDS.map(n=><option key={n.id} value={n.id}>{n.label} · {n.detail}</option>)}</select></label><p>적합 분석의 제작 제안과 문의 초안에 반영해요.</p></div></details>}
    {phase==='priority'&&<section className="intake-recommendation" id="setup-recommendation"><div><h2>어떤 후보를 먼저 볼까요?</h2><p>기준을 선택하거나 비중을 직접 조절하세요. 조건에 맞는 후보의 순서가 바뀝니다.</p><div className="intake-presets" role="group" aria-label="추천 우선순위">{PRIORITIES.map(p=><button key={p.id} type="button" aria-pressed={!value.customWeights&&value.priority===p.id} onClick={()=>setValue(v=>({...v,priority:p.id,customWeights:undefined,priorityChosen:true}))}><Icon name={p.icon} size={16}/>{p.label}</button>)}</div></div><WeightControls weights={weights} onChange={customWeights=>setValue(v=>({...v,customWeights,priorityChosen:true}))}/>{fieldError('weights')}</section>}
    <footer className="intake-submit"><button type="button" className="text-button" onClick={()=>{setSubmitted(false);setPhase(phase==='priority'?'conditions':phase==='conditions'?'campaign':'describe');}}>이전</button><button type="submit" className="primary-button">{phase==='priority'?'이 조건으로 추천받기':'다음'}<Icon name="arrow" size={17}/></button></footer>
   </form>
  </div>}
 </main></div>;
}
