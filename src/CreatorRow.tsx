import type {Creator} from './domain';
import type {Brief} from './experience';
import {candidateStatus} from './experience';
import {hasKnownBudget} from './domain';
import {moneyText,numberText} from './policy';
import {contentFor} from './creatorContent';
import type {SearchAssessment} from './searchPolicy';
import {Icon,Identity} from './ui';

type Props={creator:Creator;brief:Brief;saved:boolean;compared:boolean;inSaved:boolean;hasWork:boolean;searchAssessment?:SearchAssessment;onSave:()=>void;onCompare:()=>void;onAnalysis:()=>void;onDetails:()=>void;onInquiry:()=>void;onContent:(postId?:string)=>void};
export function CreatorRow({creator:c,brief,saved,compared,inSaved,hasWork,searchAssessment,onSave,onCompare,onAnalysis,onDetails,onInquiry,onContent}:Props){
 const d=contentFor(c.id),hits=searchAssessment?.hits??[];
 const relevantPost=hits.find(h=>h.postId)?.postId;
 const post=d?.posts.find(p=>p.id===relevantPost)??d?.posts.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
 return <article className={'creator-result-row '+(saved?'saved':'')} aria-label={c.name+' 후보'}>
  <div className="row-person"><button className="identity-open" onClick={onDetails} aria-label={c.name+' 상세 보기'}><Identity creator={c}/></button>{d?.bio&&d.bio!==c.category+' 콘텐츠'&&<p title={d.bio}>{d.bio}</p>}<div className="row-keywords">{hits.slice(0,2).map(h=><button key={h.keyword} title={h.source+' · '+h.excerpt} aria-label={c.name+' '+h.keyword+' '+h.source+' 근거 보기'} onClick={()=>h.source==='채널 정보'?onDetails():onContent(h.postId)}>{h.keyword}<span>↗</span></button>)}{inSaved&&candidateStatus(c,brief)!=='조건 충족'&&<small>{candidateStatus(c,brief)}</small>}</div></div>
  <div className="row-content-preview">{post?<button className="content-reference" onClick={()=>onContent(post.id)} aria-label={c.name+' '+post.title+' 콘텐츠 보기'}><span className="content-reference-art">{post.image?<img src={post.image} loading="lazy" alt=""/>:<Icon name={c.platform==='유튜브'?'youtube':'instagram'} size={18}/>}</span><span className="content-reference-text"><strong>{post.title}</strong><small>{post.kind==='ad'?'광고':post.format} · {post.date.slice(5).replace('-','.')}</small></span></button>:<button className="content-missing" onClick={()=>onContent()}><Icon name="views" size={16}/><span>자료 확인<span aria-hidden="true"> ↗</span></span></button>}</div>
  <div className="row-metric"><strong>{numberText(c.views)}</strong></div><div className="row-metric"><strong>{c.engagement}%</strong></div><div className="row-metric"><strong>{c.campaigns}건</strong><span className="row-rating">{c.rating===null?'미평가':c.rating.toFixed(1)+'점'}</span></div><div className="row-metric row-budget"><strong>{hasKnownBudget(c)?moneyText(c.averageBudget):'견적 문의'}</strong></div>
  <div className="row-actions"><div><button className="row-analysis" onClick={onAnalysis}>✦ 적합 분석</button><button className={'row-save '+((inSaved?compared:saved)?'chosen':'')} aria-pressed={inSaved?compared:saved} aria-label={c.name+(inSaved?(compared?' 비교 해제':' 비교 선택'):(saved?' 저장 취소':' 후보 저장'))} title={inSaved?'비교 선택':'후보 저장'} onClick={inSaved?onCompare:onSave}><Icon name={inSaved?'balance':saved?'check':'bookmark'} size={17}/></button></div><button className="text-button" onClick={onInquiry}>{hasWork?'협업 기록':'문의하기'} <span aria-hidden="true">↗</span></button></div>
 </article>;
}
