import {useEffect,useRef,useState} from 'react';
import {ASSISTANT_INSTRUCTIONS,ASSISTANT_LABELS,assistantPrompt,parseAssistantResult} from './assistant';
import type {AssistantMode,AssistantResult} from './assistant';
import {Icon} from './ui';
export function AssistantPanel({mode,context,onApply}:{mode:AssistantMode;context:string;onApply?:(text:string)=>void}) {
  const [configured,setConfigured]=useState<boolean|null>(null),[request,setRequest]=useState(mode==='brief'?'제품과 목표가 드러나도록 짧은 캠페인 브리프를 정리해 주세요.':mode==='outreach'?'견적과 일정을 확인하는 정중하고 간결한 문의 문안으로 다듬어 주세요.':'결과를 요약하고 다음 협업 전에 확인할 질문을 정리해 주세요.');
  const [pending,setPending]=useState(false),[result,setResult]=useState<AssistantResult|null>(null),[error,setError]=useState(''),[status,setStatus]=useState('');
  const abort=useRef<AbortController|null>(null);const requestId=useRef(0);
  const check=()=>{setConfigured(null);fetch('/api/assistant/status').then(r=>r.ok?r.json():null).then(r=>setConfigured(r?.configured===true)).catch(()=>setConfigured(false));};
  useEffect(()=>{check();return()=>{requestId.current++;abort.current?.abort();};},[]);
  useEffect(()=>{requestId.current++;abort.current?.abort();setPending(false);setResult(null);setError('');setStatus('');},[context]);
  const generate=async()=>{
    const id=++requestId.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;setPending(true);setError('');setResult(null);setStatus('');
    try{const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,context,request}),signal:controller.signal});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'AI 연결을 확인해 주세요.');if(id===requestId.current)setResult(parseAssistantResult(payload));}
    catch(e){if(id===requestId.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'생성하지 못했습니다. 다시 시도해 주세요.');}
    finally{if(id===requestId.current)setPending(false);}
  };
  const copy=async()=>{try{await navigator.clipboard.writeText(ASSISTANT_INSTRUCTIONS+'\n\n'+assistantPrompt(mode,context,request));setStatus('요청문을 복사했습니다. 사용하는 AI에 붙여 넣을 수 있어요.');}catch{setStatus('복사가 제한되어 있습니다. 아래 요청문을 펼쳐 직접 복사해 주세요.');}};
  return <section className="assistant-panel"><div className="assistant-heading"><span className="ai-symbol">✦</span><div><h3>{ASSISTANT_LABELS[mode]}</h3><p>AI 초안을 검토하고 내 문안으로 수정하세요.</p></div><span className="ai-state">{configured===null?'연결 확인 중':configured?'AI 연결됨':'연결 필요'}</span></div>
    {configured===false&&<div className="ai-connection"><p>아직 AI가 연결되지 않았어요. 연결 후 이 화면에서 바로 생성할 수 있습니다.</p><details><summary>연결 방법 보기</summary><p>로컬 실행 폴더의 .env.local에 OPENAI_API_KEY를 설정하고 앱을 다시 실행하세요. 키는 서버에서만 사용합니다. 자세한 설정은 README의 AI 연결 안내를 확인하세요.</p></details><button className="text-button" onClick={check}>연결 다시 확인</button></div>}
    <label className="field-label">AI에게 요청할 내용<textarea maxLength={3000} value={request} onChange={e=>setRequest(e.target.value)} disabled={pending}/></label>
    <details className="ai-context"><summary>AI에 전달할 자료 확인</summary><pre>{context}</pre></details>
    <div className="assistant-actions"><button className="ai-button" disabled={!configured||pending||!request.trim()} onClick={generate}>{pending?'문안 작성 중…':'✦ AI로 생성'}</button>{pending?<button className="text-button" onClick={()=>{requestId.current++;abort.current?.abort();setPending(false);setStatus('생성을 중단했습니다.');}}>중단</button>:<button className="text-button" onClick={copy}>요청문 복사</button>}</div><p className="muted">생성을 누르면 위 자료와 요청을 OpenAI로 보냅니다. 추천 순위·협업 상태는 자동으로 바뀌지 않습니다.</p>
    {pending&&<p role="status" className="ai-pending"><span className="spinner"/>입력한 자료를 바탕으로 초안을 작성하고 있어요.</p>}{error&&<p role="alert" className="error-text">{error}</p>}{status&&<p role="status">{status}</p>}
    {result&&<div className="ai-result"><label className="field-label">생성된 초안 · 직접 수정 가능<textarea value={result.text} onChange={e=>setResult({...result,text:e.target.value})}/></label>{result.questions.length>0&&<><h4>추가로 확인할 질문</h4><ul>{result.questions.map((q,i)=><li key={i}>{q}</li>)}</ul></>}{onApply?<button className="secondary-button" disabled={!result.text.trim()} onClick={()=>onApply(result.text)}>검토한 문안 적용<Icon name="check" size={16}/></button>:<button className="secondary-button" onClick={async()=>{try{await navigator.clipboard.writeText(result.text);setStatus('요약을 복사했습니다.');}catch{setStatus('초안을 선택해 직접 복사해 주세요.');}}}>요약 복사</button>}<p className="muted">AI 작성 초안입니다. 원자료와 대조한 뒤 사용하세요.</p></div>}
    <details className="ai-context"><summary>다른 AI에서 사용할 요청문</summary><textarea readOnly value={ASSISTANT_INSTRUCTIONS+'\n\n'+assistantPrompt(mode,context,request)} aria-label="복사용 AI 요청문"/></details>
  </section>;
}
