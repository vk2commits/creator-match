import {useEffect,useState} from 'react';
import type {Brief} from './experience';
import {criteriaOf} from './experience';
import {campaignOf} from './campaign';
import {moneyText,tierRange} from './policy';
import {Icon} from './ui';
export const MATCHING_DURATION=4200;
export function MatchingTransition({brief}:{brief:Brief}){
  const [step,setStep]=useState(0);
  useEffect(()=>{const a=setTimeout(()=>setStep(1),1400),b=setTimeout(()=>setStep(2),2800);return()=>{clearTimeout(a);clearTimeout(b);};},[]);
  const stages=[
    {title:'분야와 팔로워 조건을 확인해요',body:`${brief.input.categories.join(' · ')} 분야에서 팔로워 ${tierRange(brief.input.sizeTier)} 후보를 모읍니다.`},
    {title:'예산에 맞는 후보를 구분해요',body:`과거 평균 협업비가 ${moneyText(brief.input.budgetKRW)} 이하인 후보를 찾고, 비용 정보가 없는 후보는 따로 보여드려요.`},
    {title:'선택한 기준으로 추천을 정리해요',body:`${criteriaOf(brief).label} 기준으로 순서를 정하고, 각 후보의 지표와 캠페인 분석을 함께 보여드려요.`},
  ];
  return <main className="match-transition" aria-busy="true"><span className="brand-sign">c<span>m</span></span><p className="section-kicker">{campaignOf(brief).name}</p><h1>우리 캠페인에 맞는<br/>크리에이터를 찾고 있어요.</h1><div className="matching-conditions"><span>{brief.input.categories.join(' · ')}</span><span>1명당 {moneyText(brief.input.budgetKRW)}</span><span>팔로워 {tierRange(brief.input.sizeTier)}</span></div><ol className="matching-stages">{stages.map((s,i)=><li key={s.title} className={i===step?'current':i<step?'done':''}><span className="matching-step-icon">{i<step?<Icon name="check" size={16}/>:i===step?<span className="spinner"/>:i+1}</span><div><strong>{s.title}</strong><p>{s.body}</p></div></li>)}</ol><p className="sr-only" role="status">{stages[step].title}. {stages[step].body}</p></main>;
}
