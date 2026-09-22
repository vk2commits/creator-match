import {useEffect,useMemo,useState} from 'react';
import type {Creator} from './domain';
import type {Brief} from './experience';
import {campaignInsights} from './campaignInsights';
import {Identity,Modal,Icon} from './ui';

export function FitAnalysis({creator,all,brief,onClose,onInquiry,onCompare,hasWork}:{creator:Creator;all:Creator[];brief:Brief;onClose:()=>void;onInquiry:(proposal:string)=>void;onCompare:(c:Creator)=>void;hasWork:boolean}){
  const [step,setStep]=useState(0);
  const analysis=useMemo(()=>campaignInsights(creator,all,brief),[creator,all,brief]);
  useEffect(()=>{setStep(0);const a=setTimeout(()=>setStep(1),650),b=setTimeout(()=>setStep(2),1300),c=setTimeout(()=>setStep(3),2100);return()=>{clearTimeout(a);clearTimeout(b);clearTimeout(c);};},[creator,brief]);
  return <Modal title="✦ 캠페인 적합 분석" onClose={onClose} wide><div className="insight-modal">
    <div className="insight-context"><Identity creator={creator}/><span>{analysis.campaign.name}<small>{analysis.goal}</small></span></div>
    {step<3?<section className="insight-loading" role="status" aria-live="polite" aria-busy="true"><span className="insight-orb">✦</span><h3>{['캠페인과 채널 지표를 살펴보고 있어요','이 후보의 강점과 조율할 점을 정리하고 있어요','협업 아이디어와 확인할 성과를 준비하고 있어요'][step]}</h3><p>제품 · 타깃 고객 · 예산 · 추천 기준</p><div className="insight-loading-steps">{['캠페인 파악','지표 비교','협업 제안'].map((label,i)=><span key={label} className={step>=i?'active':''}>{step>i?'✓':i+1} {label}</span>)}</div></section>:<>
      <section className="insight-verdict"><span className="section-kicker">우리 캠페인과 맞는 이유</span><h3>{analysis.lead}</h3><p>{analysis.summary}</p></section>
      <section className="insight-section"><h3><span>01</span> 판단에 참고한 지표</h3><div className="insight-evidence">{analysis.evidence.map(e=><article key={e.key}><span>{e.title}</span><strong>{e.value}</strong><p>{e.body}</p></article>)}</div></section>
      <section className="insight-budget"><Icon name="balance" size={22}/><div><h3>{analysis.budget.title}</h3><p>{analysis.budget.body}</p></div></section>
      <section className="insight-section insight-creative"><h3><span>02</span> 우리 제품, 이렇게 소개해 보세요</h3><h4>{analysis.creative.title}</h4><ol><li><span>시작 장면</span><p>{analysis.creative.hook}</p></li><li><span>제품 소개</span><p>{analysis.creative.scene}</p></li><li><span>다음 행동</span><p>{analysis.cta}</p></li></ol><p className="insight-format">{analysis.format}</p></section>
      <section className="insight-section"><h3><span>03</span> 협업 전에 맞춰볼 점</h3><div className="insight-risks">{analysis.risks.map(r=><article key={r.title}><h4>{r.title}</h4><p>{r.body}</p></article>)}</div></section>
      {analysis.comparison&&<section className="insight-alternative"><div><span className="section-kicker">같은 분야·플랫폼에서 비교</span><h3>비용을 더 줄이고 싶다면</h3><p>{analysis.comparison.text}</p></div><button className="secondary-button" onClick={()=>onCompare(analysis.comparison!.creator)}>{analysis.comparison.creator.name} 분석<Icon name="arrow" size={15}/></button></section>}
      <section className="insight-section"><h3><span>04</span> 집행 후, 무엇을 확인할까요?</h3><ol className="insight-measurement">{analysis.measurement.map(m=><li key={m}>{m}</li>)}</ol></section>
      <details className="plain-method"><summary>분석에 사용한 정보</summary><p>{analysis.source}</p></details>
      <div className="insight-footer"><div><strong>{hasWork?'문의와 협업을 이어가세요':'이 방향으로 협업을 제안해 보세요'}</strong><small>{hasWork?'작성한 문안과 기록은 그대로 유지됩니다.':'콘텐츠 제안을 문의 초안에 넣어드립니다.'}</small></div><button className="primary-button" onClick={()=>onInquiry(analysis.proposal)}>{hasWork?'협업 기록 열기':'제안 담아 문의하기'}<Icon name="arrow" size={16}/></button></div>
    </>}
  </div></Modal>;
}
