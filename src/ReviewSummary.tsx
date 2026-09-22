import type {CampaignReview,ReviewEvidence} from './review';

export function ReviewSummary({review,selectedQuestions,onQuestion,onEvidence}:{review:CampaignReview;selectedQuestions:string[];onQuestion:(question:string)=>void;onEvidence:(e:ReviewEvidence)=>void}){
  return <div className="review-summary">
    <section className="review-verdict"><span className="section-kicker">우리 캠페인에 활용할 방향</span><h3>{review.headline}</h3><p>{review.paragraph}</p></section>
    <section className="review-evidence"><h4>판단에 참고한 근거</h4><div>{review.evidence.map(e=><button key={e.id} onClick={()=>onEvidence(e)}><small>{e.tab==='ads'?'광고 댓글':e.tab==='content'?'콘텐츠':'채널 지표'}</small><strong>{e.label}</strong><span>{e.detail}</span><b aria-hidden="true">↗</b></button>)}</div></section>
    <section className="review-budget"><strong>{review.insights.budget.title}</strong><p>{review.insights.budget.body}</p></section>
    <section className="review-proposal"><h4>이런 콘텐츠를 제안해 보세요</h4><p>{review.proposal}</p></section>
    <fieldset className="review-questions"><legend>문의에 담을 질문</legend><p>필요한 질문만 골라 문의 초안에 함께 담으세요.</p>{review.questions.map(q=><label key={q}><input type="checkbox" checked={selectedQuestions.includes(q)} onChange={()=>onQuestion(q)}/><span>{q}</span></label>)}</fieldset>
    <details className="review-metrics" id="review-channel-metrics"><summary>채널 지표로 본 강점</summary><div className="insight-evidence">{review.insights.evidence.map(e=><article key={e.key}><span>{e.title}</span><strong>{e.value}</strong><p>{e.body}</p></article>)}</div><p className="data-caption">지표에 따른 추천 순서와 콘텐츠 검토는 서로 다른 판단입니다.</p></details>
  </div>;
}
