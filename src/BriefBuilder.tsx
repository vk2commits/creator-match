import {useEffect,useRef,useState} from 'react';
import type {Brief} from './experience';
import {moneyText,tierRange} from './policy';
import {GOALS} from './campaign';
import type {Goal} from './campaign';
import {BRIEF_EXAMPLE,briefDemo} from './briefDemo';
import {Icon,RequiredMark,RequiredHint} from './ui';
export function BriefBuilder({initial,onApply,onClose}:{initial:Brief;onApply:(brief:Brief)=>void;onClose:()=>void}){
  const [text,setText]=useState(initial.campaign?.product??''),[pending,setPending]=useState(false),[result,setResult]=useState<ReturnType<typeof briefDemo>|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const generate=()=>{setPending(true);setResult(null);timer.current=setTimeout(()=>{setResult(briefDemo(text,initial));setPending(false);},900);};
  const update=(brief:Brief)=>setResult(result?{...result,brief}:null),b=result?.brief;
  return <section className="brief-builder"><div className="assistant-heading"><div><h3>{b?'캠페인 초안을 확인하세요':'준비하는 캠페인을 편하게 적어주세요'}</h3><p>{b?'제품과 목표를 확인하고 다음으로 이어가세요.':'제품, 목표, 정해둔 예산을 한 번에 적어도 좋아요.'}</p></div><span className="ai-state">AI</span></div>
    <RequiredHint/>{!b?<><label className="field-label"><span>캠페인 설명<RequiredMark/></span><textarea required maxLength={1500} disabled={pending} value={text} onChange={e=>setText(e.target.value)} placeholder={BRIEF_EXAMPLE}/></label><div className="assistant-actions"><button className="text-button" disabled={pending} onClick={()=>setText(BRIEF_EXAMPLE)}>예시 문장 넣기</button><button className="ai-button" disabled={pending||!text.trim()} onClick={generate}>{pending?'초안을 정리하고 있어요…':'✦ 초안 만들기'}</button></div>{pending&&<div className="ai-pending" role="status"><span className="spinner"/>제품과 목표, 후보 조건을 정리하고 있어요.</div>}</>:<div className="brief-proposal"><label className="field-label"><span>캠페인명<RequiredMark/></span><input required maxLength={80} value={b.campaign!.name} onChange={e=>update({...b,campaign:{...b.campaign!,name:e.target.value}})}/></label><label className="field-label"><span>제품과 알리고 싶은 점<RequiredMark/></span><textarea required maxLength={1500} value={b.campaign!.product} onChange={e=>update({...b,campaign:{...b.campaign!,product:e.target.value}})}/></label><label className="field-label"><span>캠페인 목표<RequiredMark/></span><select required value={b.campaign!.goal} onChange={e=>update({...b,campaign:{...b.campaign!,goal:e.target.value as Goal},priority:GOALS.find(g=>g.id===e.target.value)!.priority})}>{GOALS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label><div className="brief-extracted"><strong>함께 정리한 후보 조건</strong><p>{b.input.categories.join(' · ')} · 1명당 {moneyText(b.input.budgetKRW)} · 팔로워 {tierRange(b.input.sizeTier)}</p>{result.suggested.length>0&&<p>입력에 없던 {result.suggested.join('·')}은 시작값입니다.</p>}<small>후보 조건 단계에서 수정할 수 있어요.</small></div><div className="form-actions"><button className="text-button" onClick={()=>setResult(null)}>다시 작성</button><button className="primary-button" disabled={!b.campaign!.name.trim()||!b.campaign!.product.trim()} onClick={()=>onApply(b)}>타깃 고객 정하기<Icon name="arrow" size={16}/></button></div></div>}
    <button className="text-button brief-manual-return" onClick={onClose}>직접 입력으로 돌아가기</button>
  </section>;
}
