import {useEffect,useRef,useState} from 'react';
import type {Brief} from './experience';
import {CATEGORIES,TIERS,moneyText,numberText} from './policy';
import type {Category,Tier} from './policy';
import {formatBudget} from './experience';
import {parseBudget} from './domain';
import {GOALS} from './campaign';
import type {Goal} from './campaign';
import {BRIEF_EXAMPLE,briefDemo} from './briefDemo';
import {Icon} from './ui';

export function BriefBuilder({initial,onApply,onClose}:{initial:Brief;onApply:(brief:Brief)=>void;onClose:()=>void}){
  const [text,setText]=useState(initial.campaign?.product??''),[pending,setPending]=useState(false),[result,setResult]=useState<ReturnType<typeof briefDemo>|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const generate=()=>{setPending(true);setResult(null);timer.current=setTimeout(()=>{setResult(briefDemo(text,initial));setPending(false);},900);};
  const update=(brief:Brief)=>setResult(result?{...result,brief}:null);
  const b=result?.brief;
  return <section className="brief-builder"><div className="assistant-heading"><span className="ai-symbol">✦</span><div><h3>캠페인을 말하면, 시작할 조건으로</h3><p>제품과 목표, 예산을 한 번에 적어보세요.</p></div><span className="ai-state">AI 시연</span></div>
    {!b?<><label className="field-label">어떤 협업을 준비하고 있나요?<textarea maxLength={1500} disabled={pending} value={text} onChange={e=>setText(e.target.value)} placeholder={BRIEF_EXAMPLE}/></label><div className="assistant-actions"><button className="text-button" disabled={pending} onClick={()=>setText(BRIEF_EXAMPLE)}>예시 문장 넣기</button><button className="ai-button" disabled={pending||!text.trim()} onClick={generate}>{pending?'조건을 정리하고 있어요…':'✦ 조건 초안 만들기'}</button></div>{pending&&<div className="ai-pending" role="status"><span className="spinner"/>목표, 분야, 예산을 정리하는 중이에요.</div>}</>:<div className="brief-proposal"><p className="proposal-success"><Icon name="check" size={18}/>찾을 후보의 조건을 정리했어요.</p><label className="field-label">캠페인명<input maxLength={80} value={b.campaign!.name} onChange={e=>update({...b,campaign:{...b.campaign!,name:e.target.value}})}/></label><label className="field-label">제품·핵심 메시지<textarea maxLength={1500} value={b.campaign!.product} onChange={e=>update({...b,campaign:{...b.campaign!,product:e.target.value}})}/></label><div className="field-grid"><label className="field-label">캠페인 목표<select value={b.campaign!.goal} onChange={e=>update({...b,campaign:{...b.campaign!,goal:e.target.value as Goal},priority:GOALS.find(g=>g.id===e.target.value)!.priority})}>{GOALS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><label className="field-label">1명당 예산 (원)<input inputMode="numeric" value={Number.isFinite(b.input.budgetKRW)?numberText(b.input.budgetKRW):''} onChange={e=>update({...b,input:{...b.input,budgetKRW:parseBudget(formatBudget(e.target.value))}})}/></label><label className="field-label">팔로워 수<select value={b.input.sizeTier} onChange={e=>update({...b,input:{...b.input,sizeTier:e.target.value as Tier}})}>{TIERS.map(t=><option key={t.id} value={t.id}>{t.range}</option>)}</select></label></div><fieldset><legend>찾을 분야</legend><div className="category-options">{CATEGORIES.map(c=><label key={c} className={b.input.categories.includes(c)?'active':''}><input type="checkbox" checked={b.input.categories.includes(c)} onChange={()=>update({...b,input:{...b.input,categories:b.input.categories.includes(c)?b.input.categories.filter(x=>x!==c):[...b.input.categories,c as Category]}})}/><span>{c}</span></label>)}</div></fieldset><div className="proposal-why"><strong>{GOALS.find(g=>g.id===b.campaign!.goal)?.label}에 맞춰 {b.priority==='reach'?'조회수':b.priority==='response'?'참여율':'네 가지 지표'}부터 비교해요.</strong><p>1명당 {moneyText(b.input.budgetKRW||0)} 안에서 후보를 찾습니다. 추천 비중은 다음 화면에서 조절할 수 있어요.</p>{result.suggested.length>0&&<p>문장에 없던 {result.suggested.join('·')}은 시작값을 넣었어요. 맞는지 확인해 주세요.</p>}</div><div className="form-actions"><button className="text-button" onClick={()=>setResult(null)}>문장 다시 쓰기</button><button className="primary-button" disabled={!b.campaign!.name.trim()||!b.campaign!.product.trim()||!b.input.categories.length||!Number.isSafeInteger(b.input.budgetKRW)||b.input.budgetKRW<=0} onClick={()=>onApply(b)}>이 조건으로 계속<Icon name="arrow" size={16}/></button></div></div>}
    <div className="assistant-demo-foot"><span>입력 내용을 정리하는 예시 기능입니다.</span><button className="text-button" onClick={onClose}>직접 입력으로 돌아가기</button></div>
  </section>;
}
