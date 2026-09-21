import {useEffect,useRef,useState} from 'react';
import type {Campaign} from './campaign';
import type {Creator} from './domain';
import {analyzeChannelExample} from './channelAnalysis';
import {CustomerFields} from './CustomerFields';

export function FitAnalysis({creator,campaign,onCampaign}:{creator:Creator;campaign:Campaign;onCampaign:(c:Campaign)=>void}){
  const [editing,setEditing]=useState(!campaign.customerNeed),[draft,setDraft]=useState(campaign);
  const [pending,setPending]=useState(false),[analyzed,setAnalyzed]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const result=analyzeChannelExample(creator,campaign);
  const generate=()=>{setPending(true);setAnalyzed(false);timer.current=setTimeout(()=>{setPending(false);setAnalyzed(true);},900);};
  return <section className="fit-analysis"><div className="section-heading"><div><span className="section-kicker">고객과 콘텐츠의 연결</span><h3>우리 고객에게 어떻게 소개하면 좋을까요?</h3></div><span className="ai-state">AI 시연</span></div>
    <p className="analysis-boundary">예시 콘텐츠로 분석 과정을 체험해요. 실제 채널 분석과 추천 순위에는 반영되지 않습니다.</p>
    {editing?<div className="analysis-customer-edit"><CustomerFields value={draft} onChange={setDraft}/><button className="secondary-button" disabled={!draft.customerNeed} onClick={()=>{onCampaign(draft);setEditing(false);setAnalyzed(false);}}>이 고객으로 검토</button></div>:<div className="analysis-target"><div><span>이번 캠페인의 고객</span><strong>{result?.target}</strong><p>{result?.need.detail}</p></div><button className="text-button" onClick={()=>{if(timer.current)clearTimeout(timer.current);setPending(false);setDraft(campaign);setEditing(true);setAnalyzed(false);}}>고객 수정</button></div>}
    {!editing&&!pending&&!analyzed&&<button className="ai-button" onClick={generate}>✦ 이 고객과 채널의 궁합 분석</button>}
    {pending&&<p role="status" className="ai-pending"><span className="spinner"/>고객의 선택 기준과 예시 콘텐츠를 살펴보고 있어요.</p>}
    {!editing&&analyzed&&result&&<div className="fit-analysis-result" role="status"><h4>{result.title}</h4><p>{result.reasoning}</p><div className="analysis-evidence"><span>살펴본 콘텐츠 · 예시</span><strong>{result.channel.label}</strong><ul>{result.channel.titles.map(t=><li key={t}>{t}</li>)}</ul><p>{result.channel.format}</p></div><div className="analysis-recommendation"><span>제작 요청에 이렇게 담아보세요</span>{campaign.product&&<blockquote>{campaign.product}</blockquote>}<p>{result.request}</p></div><div className="analysis-caveat"><span>선정 전에 확인할 점</span><p>{result.caution}</p></div></div>}
  </section>;
}
