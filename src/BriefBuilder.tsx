import {useEffect,useRef,useState} from 'react';
import {BRIEF_EXAMPLE} from './briefDemo';
import {Icon,RequiredMark} from './ui';
export function BriefBuilder({text,onText,onGenerate,onManual,onReturn}:{text:string;onText:(text:string)=>void;onGenerate:(text:string)=>void;onManual:()=>void;onReturn?:()=>void}){
 const [pending,setPending]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const generate=()=>{if(!text.trim())return;setPending(true);timer.current=setTimeout(()=>{setPending(false);onGenerate(text);},900);};
 return <form className="campaign-composer" onSubmit={e=>{e.preventDefault();generate();}}>
  <label className="field-label"><span>캠페인 설명<RequiredMark/></span><textarea required autoFocus maxLength={1500} disabled={pending} value={text} onChange={e=>onText(e.target.value)} placeholder="출근 준비가 바쁜 직장인에게 오래가는 립틴트를 소개하고 싶어요. 자연스러운 일상 콘텐츠면 좋겠고, 한 명당 200만원까지 생각하고 있어요."/></label>
  <div className="composer-example"><button type="button" className="text-button" disabled={pending} onClick={()=>onText(BRIEF_EXAMPLE)}>예시 문장 넣기</button><span>{text.length.toLocaleString()} / 1,500</span></div>
  {pending&&<p className="intake-pending" role="status"><span className="spinner"/>제품과 고객, 후보 조건을 정리하고 있어요.</p>}
  <div className="composer-actions"><button className="primary-button" type="submit" disabled={pending||!text.trim()}><span aria-hidden="true">✦</span>{pending?'초안 정리 중':'캠페인 초안 만들기'}<Icon name="arrow" size={17}/></button><button className="text-button" type="button" disabled={pending} onClick={onReturn??onManual}>{onReturn?'작성한 초안으로 돌아가기':'직접 입력할게요'}</button></div>
 </form>;
}
