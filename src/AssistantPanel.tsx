import {useEffect,useRef,useState} from 'react';
import type {AssistantMode} from './assistant';
import {numberText} from './policy';
import {Icon} from './ui';
import {outreachDemo} from './assistantDemo';

// Explicit demonstration, with no API requirement or external data transmission.
export function AssistantPanel({mode,context,onApply}:{mode:AssistantMode;context:string;onApply?:(text:string)=>void}){
  const [pending,setPending]=useState(false),[result,setResult]=useState(''),[tone,setTone]=useState('정중하게'),[status,setStatus]=useState('');
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{if(timer.current)clearTimeout(timer.current);setResult('');setPending(false);setStatus('');},[context,tone]);
  const analysis=mode==='analysis';
  const generate=()=>{setPending(true);setResult('');timer.current=setTimeout(()=>{
    if(analysis){
      try{const data=JSON.parse(context);const rows=data.results as {name:string;outcome:{views:number|null;cost:number|null;clicks:number|null;conversions:number|null};calculated:{cpv:number|null;cpa:number|null}}[];
        setResult(rows.map(r=>`${r.name}\n${r.outcome.views===null?'조회수는 아직 입력하지 않았어요.':`콘텐츠 조회수는 ${numberText(r.outcome.views)}회입니다.`} ${r.outcome.cost===null?'집행비를 입력하면 비용 대비 결과를 볼 수 있어요.':`집행비는 ${numberText(r.outcome.cost)}원입니다.`}\n${r.calculated.cpv===null?'조회수와 집행비가 모두 있어야 조회 1회당 비용을 알 수 있어요.':`조회 1회당 ${numberText(Math.round(r.calculated.cpv*100)/100)}원을 사용했어요.`}${r.outcome.conversions!==null?` 기록된 구매는 ${numberText(r.outcome.conversions)}건입니다.`:''}\n다음 협업 전: 같은 기간으로 집계한 다른 콘텐츠와 비용을 비교해 보세요.`).join('\n\n'));
      }catch{setResult('성과를 먼저 입력해 주세요. 조회수와 집행비부터 시작할 수 있어요.');}
    }else{
      setResult(outreachDemo(context,tone));
    }
    setPending(false);
  },900);};
  return <section className="assistant-panel"><div className="assistant-heading"><span className="ai-symbol">✦</span><div><h3>{analysis?'협업 결과를 한 문단으로 정리하세요':'문의 문안을 다듬어 보세요'}</h3><p>{analysis?'입력한 조회수와 집행비를 읽기 쉽게 정리합니다.':'제품·예산·제작 조건을 가져왔어요. 원하는 말투를 골라주세요.'}</p></div><span className="ai-state">AI 시연</span></div>
    {!analysis&&<div className="preset-options" aria-label="문의 문안 말투">{['정중하게','짧게'].map(t=><button key={t} aria-pressed={tone===t} onClick={()=>setTone(t)}>{t}</button>)}</div>}
    {!result&&<button className="ai-button" disabled={pending} onClick={generate}>{pending?'내용을 정리하고 있어요…':analysis?'✦ 결과 요약 만들기':'✦ 문의 초안 만들기'}</button>}
    {pending&&<div className="ai-pending" role="status"><span className="spinner"/>{analysis?'성과 기록을 읽기 쉬운 문장으로 바꾸고 있어요.':'선택한 말투로 문의 내용을 정리하고 있어요.'}</div>}
    {result&&<div className="ai-result"><label className="field-label">{analysis?'성과 요약':'보낼 문안 확인'}<textarea value={result} onChange={e=>setResult(e.target.value)}/></label><div className="form-actions"><button className="text-button" onClick={generate}>다시 만들기</button>{onApply?<button className="primary-button" onClick={()=>onApply(result)} disabled={!result.trim()}>이 문안 사용하기<Icon name="check" size={16}/></button>:<button className="primary-button" onClick={async()=>{try{await navigator.clipboard.writeText(result);setStatus('요약을 복사했습니다.');}catch{setStatus('문장을 선택해서 복사해 주세요.');}}}>요약 복사하기</button>}</div></div>}
    <p role="status">{status}</p><p className="assistant-demo-foot">AI 기능 체험용 예시입니다. 입력한 정보로 초안을 만들며, 적용 전에 수정할 수 있어요.</p>
  </section>;
}
