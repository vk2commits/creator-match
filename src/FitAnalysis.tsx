import {useState} from 'react';
import {GOALS} from './campaign';
import type {Campaign} from './campaign';
import type {Creator} from './domain';
import {campaignFit} from './channelAnalysis';
import {CustomerFields} from './CustomerFields';

export function CampaignFitSummary({creator,campaign}:{creator:Creator;campaign:Campaign}){
  const fit=campaignFit(creator,campaign);
  return <section className="campaign-fit-summary"><div><span>✦ 캠페인 적합 분석</span><small>AI 시연</small></div><h3>{fit.headline}</h3><p>{fit.summary}</p>{fit.customer&&<p className="fit-customer-summary">{fit.customer.aligned?'고객의 선택 기준과도 맞는 방향이에요.':`고객의 선택 기준인 ‘${({proof:'꼼꼼한 비교',routine:'일상에서의 쓰임',discovery:'새로운 발견'} as const)[fit.customer.need.id]}’에 맞춰 제작 방향을 조율해 보세요.`}</p>}</section>;
}
export function FitAnalysis({creator,campaign,onCampaign}:{creator:Creator;campaign:Campaign;onCampaign:(c:Campaign)=>void}){
  const [editing,setEditing]=useState(false),[draft,setDraft]=useState(campaign);
  const fit=campaignFit(creator,campaign);
  return <section className="fit-analysis"><div className="section-heading"><div><span className="section-kicker">✦ {GOALS.find(g=>g.id===campaign.goal)?.label}</span><h3>{fit.headline}</h3></div><span className="ai-state">AI 시연</span></div><p className="fit-lead">{fit.summary}</p>
    <div className="analysis-logic"><div><span>캠페인</span><p>{campaign.product||campaign.name}</p></div><div><span>콘텐츠 방식</span><p>{fit.evidence}</p></div>{fit.customer&&<div><span>타깃 고객</span><div><strong>{fit.customer.target}</strong><p>{fit.customer.aligned?fit.customer.reasoning:fit.customer.need.detail}</p></div></div>}</div>
    {fit.tradeoff&&<div className="analysis-tradeoff"><strong>제작 방향을 맞출 부분</strong><p>{fit.tradeoff}</p></div>}
    <div className="analysis-recommendation"><span>이렇게 협업을 제안해 보세요</span><p>{fit.request}</p></div>
    {editing?<div className="analysis-customer-edit"><CustomerFields value={draft} onChange={setDraft}/><div className="form-actions"><button className="text-button" onClick={()=>setEditing(false)}>취소</button><button className="secondary-button" onClick={()=>{onCampaign(draft);setEditing(false);}}>고객 정보 적용</button></div></div>:<button className="text-button" onClick={()=>{setDraft(campaign);setEditing(true);}}>{campaign.customerNeed?'타깃 고객 수정':'타깃 고객 추가'}</button>}
    <p className="analysis-boundary">예시 콘텐츠를 활용한 분석입니다. 실제 추천 순서는 아래의 제공 지표로 정했습니다.</p>
  </section>;
}
