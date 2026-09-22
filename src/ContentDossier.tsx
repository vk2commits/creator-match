import {AudiencePanel} from './AudiencePanel';
import {requestResearch} from './researchAI';
import {ContentEntry} from './ContentEntry';
import {ReviewSummary} from './ReviewSummary';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Creator} from './domain';
import type {Brief} from './experience';
import {contentFor,contentStats} from './creatorContent';
import type {CreatorPost} from './creatorContent';
import {buildReview,applyModelReview,reportFromReview,inquiryFromReview,reviewContext,cachedReview,cacheReview} from './review';
import type {CampaignReview,ReviewEvidence} from './review';
import {numberText} from './policy';
import {Icon,Identity,Modal} from './ui';
export function downloadText(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},60000);}
type DossierTab='summary'|'content'|'ads'|'brands'|'audience';
export function ContentDossier({creator:c,all,brief,onClose,onInquiry,initialTab='summary',initialPostId,hasWork=false}:{creator:Creator;all:Creator[];brief:Brief;onClose:()=>void;onInquiry:(proposal:string)=>void;initialTab?:DossierTab;initialPostId?:string;hasWork?:boolean}){
 const [adding,setAdding]=useState(false),[revision,setRevision]=useState(0);
 const d=useMemo(()=>contentFor(c.id),[c.id,revision]),stats=useMemo(()=>contentStats(d?.posts??[]),[d]);
 const base=useMemo(()=>buildReview(c,all,brief),[c,all,brief,revision]);
 const [tab,setTab]=useState<DossierTab>(initialTab),[kind,setKind]=useState('all'),[opened,setOpened]=useState<CreatorPost|null>(()=>d?.posts.find(p=>p.id===initialPostId)??null);
 const [snapshot,setSnapshot]=useState<CampaignReview|undefined>(()=>cachedReview(base.key));
 const review=snapshot?.key===base.key?snapshot:base;
 const [exportNotice,setExportNotice]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [selectedQuestions,setSelectedQuestions]=useState(review.questions);
 const controller=useRef<AbortController|null>(null),evidenceAnchor=useRef<HTMLDivElement>(null),metricsAnchor=useRef<HTMLDivElement>(null);
 const ready=snapshot?.key===base.key;
 useEffect(()=>{setSelectedQuestions(review.questions);setExportNotice('');},[review]);
 useEffect(()=>{
  if(tab!=='summary'||adding)return;
  const previous=cachedReview(base.key);if(previous){setSnapshot(previous);setBusy(false);return;}
  const request=new AbortController();controller.current=request;setBusy(true);setError('');
  void requestResearch({task:'creator',text:'캠페인에 이 후보를 어떻게 활용할지 한 문단으로 설명하세요. 근거 없는 타깃 특성을 추정하지 말고 조율할 점과 다음에 물을 질문을 구분하세요.',context:reviewContext(base,d)},request.signal).then(result=>{
   if(request.signal.aborted)return;
   const next=result?applyModelReview(base,result):base;cacheReview(next);setSnapshot(next);
  }).catch(err=>{if(!request.signal.aborted)setError(err instanceof Error?err.message:'분석을 완료하지 못했어요. 다시 시도해 주세요.');}).finally(()=>{if(!request.signal.aborted)setBusy(false);});
  return()=>request.abort();
 },[base,d,tab,adding,retry]);
 useEffect(()=>{if(opened)evidenceAnchor.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[opened,tab]);
 const openEvidence=(e:ReviewEvidence)=>{
  if(e.tab==='metrics'){const panel=metricsAnchor.current?.querySelector('details');if(panel)panel.open=true;metricsAnchor.current?.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
  setKind('all');setOpened(d?.posts.find(p=>p.id===e.postId)??null);setTab(e.tab);
 };
 const saveContent=()=>{controller.current?.abort();setAdding(false);setRevision(n=>n+1);setTab('summary');setOpened(null);setSnapshot(undefined);setError('');};
 return <Modal title="캠페인 적합 분석" onClose={onClose} wide><div className="dossier unified-dossier">
  <div className="dossier-header"><Identity creator={c}/><span className="review-campaign-name">{brief.campaign?.name}</span><button className="text-button" onClick={()=>setAdding(true)}>+ 자료 추가</button></div>
  <nav className="dossier-tabs" aria-label="분석 영역">{([['summary','적합 분석'],['content','콘텐츠'],['ads','광고 반응'],['brands','협업 이력'],['audience','고객 도달 자료']] as const).map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);setOpened(null);}}>{label}</button>)}</nav>
  {adding?<ContentEntry creator={c} onCancel={()=>setAdding(false)} onDone={saveContent}/>:<>
  {tab==='summary'&&(busy||(!ready&&!error)?<section className="review-loading" role="status" aria-busy="true"><span className="spinner large"/><h3>캠페인과 후보의 근거를 정리하고 있어요.</h3><p>제품·타깃·콘텐츠에서 활용할 방향과 확인할 점을 찾습니다.</p></section>:error?<section className="dossier-empty" role="alert"><h3>분석을 마치지 못했어요.</h3><p>{error}</p><button className="primary-button" onClick={()=>setRetry(n=>n+1)}>다시 분석</button><button className="secondary-button" onClick={()=>{cacheReview(base);setSnapshot(base);setError('');}}>확인된 자료로 살펴보기</button></section>:<div ref={metricsAnchor}><ReviewSummary review={review} selectedQuestions={selectedQuestions} onQuestion={q=>setSelectedQuestions(qs=>qs.includes(q)?qs.filter(x=>x!==q):[...qs,q])} onEvidence={openEvidence}/></div>)}
  {tab!=='summary'&&(!d?<div className="dossier-empty"><h3>아직 연결한 콘텐츠 자료가 없어요.</h3><p>게시물과 댓글을 추가하면 표현 방식과 광고 반응을 함께 살펴볼 수 있어요.</p><button className="secondary-button" onClick={()=>setAdding(true)}>콘텐츠 자료 추가</button></div>:<>
 {tab==='content'&&<><div className="dossier-toolbar"><p>{d.bio}</p><select aria-label="콘텐츠 종류" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">모든 콘텐츠</option><option value="ad">광고 콘텐츠</option><option value="organic">일반 콘텐츠</option></select></div><div className="post-gallery">{d.posts.filter(p=>kind==='all'||p.kind===kind).map(p=><button key={p.id} onClick={()=>setOpened(p)} className="post-card">{p.image?<img alt={p.title+' · 생성 이미지'} src={p.image}/>:<div className="post-cover"><Icon name={c.platform==='유튜브'?'youtube':'instagram'} size={32}/><strong>{p.title}</strong></div>}<div><span className="content-label">{p.kind==='ad'?`광고 · ${p.brand??'브랜드 미확인'}`:p.format}</span><strong>{p.title}</strong><small>{p.date} · 조회 {p.views===null?'미확인':numberText(p.views)}</small></div></button>)}</div>{opened&&<section ref={evidenceAnchor} className="post-expanded"><button className="text-button" onClick={()=>setOpened(null)}>내용 접기</button><h3>{opened.title}</h3><p>{opened.caption}</p>{opened.url&&<a href={opened.url} target="_blank" rel="noreferrer" className="text-button">원문 게시물 열기 ↗</a>}<div className="row-keywords">{opened.visualTags.map(t=><span key={t}>{t}</span>)}</div><small>조회 {opened.views===null?'미확인':numberText(opened.views)} · 좋아요 {opened.likes===null?'미확인':numberText(opened.likes)} · 댓글 {opened.commentCount===null?'미확인':numberText(opened.commentCount)}</small></section>}</>}
 {tab==='ads'&&<>{opened&&<div ref={evidenceAnchor} className="source-post-comments"><span className="section-kicker">판단에 참고한 광고</span><h3>{opened.title}</h3>{opened.comments.filter(x=>x.sentiment!=='unreviewed'&&x.productQuestion).map((x,i)=><blockquote key={i}>“{x.text}”</blockquote>)}<button className="text-button" onClick={()=>{setKind('all');setTab('content');}}>이 콘텐츠 보기 ↗</button></div>}<h3 className="dossier-title">광고에서도 제품에 관심을 보이나요?</h3><div className="ad-comparison">{[['일반 콘텐츠',stats.organicViews,stats.organicViewCount,stats.organicCount],['광고 콘텐츠',stats.adViews,stats.adViewCount,stats.adCount]].map(([label,value,count,total])=><div key={label}><span>{label} <small>{total}개</small></span><strong>{value===null?'자료 없음':numberText(Number(value))+'회'}</strong><div className="comparison-bar"><i style={{width:Math.max(0,Number(value??0)/Math.max(stats.adViews??0,stats.organicViews??0,1)*100)+'%'}}/></div><small>{Number(count)>0?`조회수를 확인한 ${count}개 게시물의 평균`:Number(total)>0?'조회수가 아직 등록되지 않았어요.':'등록된 콘텐츠가 없어요.'}</small></div>)}</div><p className="data-caption">게시 시점과 내용이 다른 게시물입니다. 광고 효과의 차이로 단정하지 않습니다.</p><div className="comment-analysis"><div><h4>광고 댓글의 반응</h4><p>검토한 댓글 <strong>{stats.sampleCount}개</strong></p><div className="sentiment-bar" aria-label={`긍정 ${stats.positive}개, 중립 ${stats.neutral}개, 부정 ${stats.negative}개`}>{[stats.positive,stats.neutral,stats.negative].map((n,i)=><span key={i} className={'sentiment-'+i} style={{width:n/Math.max(stats.sampleCount,1)*100+'%'}}/>)}</div><div className="sentiment-legend"><span>긍정 {stats.positive}</span><span>중립 {stats.neutral}</span><span>부정 {stats.negative}</span></div></div><div className="question-metrics"><div><strong>{stats.productQuestions}개</strong><span>제품 질문</span></div><div><strong>{stats.purchaseIntent}개</strong><span>구매 의향 표현</span></div><small>한 댓글에 두 특징이 함께 있을 수 있어요. 실제 구매 건수와는 다릅니다.</small></div></div><div className="comment-list">{d.posts.filter(p=>p.kind==='ad').flatMap(p=>p.comments.map((comment,i)=><blockquote key={p.id+i}><p>“{comment.text}”</p><footer><span>{comment.sentiment==='positive'?'긍정':comment.sentiment==='negative'?'부정':comment.sentiment==='neutral'?'중립':'미확인'}</span>{comment.productQuestion&&<span>제품 질문</span>}{comment.purchaseIntent&&<span>구매 의향</span>}<small>{p.title}</small></footer></blockquote>)).slice(0,8)}</div><details className="plain-method"><summary>댓글 분석의 범위</summary><p>게시물의 전체 댓글 수와 검토한 표본 수는 다릅니다. 분류를 확인한 댓글만 집계하며, 댓글의 긍·부정과 구매 의향은 별도로 집계합니다.</p></details></>}
 {tab==='brands'&&<><h3 className="dossier-title">어떤 브랜드를 어떻게 소개했나요?</h3><div className="brand-timeline">{d.posts.filter(p=>p.kind==='ad').map(p=><article key={p.id}><time>{p.date}</time><div><strong>{p.brand??'브랜드 미확인'}</strong><h4>{p.title}</h4><p>{p.caption}</p><span>{p.format} · 조회 {p.views===null?'미확인':numberText(p.views)}</span></div><button className="text-button" onClick={()=>{setTab('content');setOpened(p);}}>콘텐츠 보기 ↗</button></article>)}{!stats.adCount&&<p>등록된 광고 콘텐츠가 없습니다. 협업 경험이 없는지와는 별개입니다.</p>}</div></>}
 {tab==='audience'&&<AudiencePanel data={d} brief={brief} onInquiry={onInquiry}/>}
 </>)}
  <details className="dossier-source"><summary>분석에 사용한 자료</summary><p>{d?d.sourceLabel+' · 확인일 '+d.checkedAt:'제공된 채널 지표'}. {d?.source==='illustrative'?'추가 콘텐츠·댓글·오디언스는 별도로 구성한 예시 자료입니다. 실제 SNS 수집 자료와는 다릅니다.':d?'직접 등록한 자료이며 자동 수집·검증하지 않았습니다.':'콘텐츠와 시청자 구성 자료는 아직 없습니다.'} 콘텐츠 분석은 지표에 따른 추천 순위를 바꾸지 않습니다.</p>{ready&&<p>{review.engine==='model'?'연결된 AI가 등록된 근거를 바탕으로 해석했습니다.':'등록 자료와 정해진 분석 기준으로 정리했습니다.'}</p>}</details>
  {exportNotice&&<div className="report-export-notice" role="status"><span>{exportNotice}</span><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(reportFromReview(c,brief,review));setExportNotice('리포트 내용을 복사했어요.');}catch{setExportNotice('복사를 허용한 브라우저에서 다시 시도해 주세요.');}}}>리포트 내용 복사</button></div>}
  <footer className="review-footer"><button className="secondary-button" disabled={!ready||busy||!!error} onClick={()=>{downloadText(`${c.name}-검토리포트.md`,reportFromReview(c,brief,review));setExportNotice('파일 저장이 시작되지 않으면 리포트 내용을 복사해 주세요.');}}><Icon name="download" size={16}/>검토 리포트 내려받기</button>{tab==='summary'?<button className="primary-button" disabled={!ready||busy||!!error} onClick={()=>onInquiry(inquiryFromReview(review,selectedQuestions))}>{hasWork?'기존 문의에 제안 추가':'제안 담아 문의하기'}<Icon name="arrow" size={16}/></button>:<button className="primary-button" onClick={()=>{setTab('summary');setOpened(null);}}>적합 분석으로 돌아가기</button>}</footer>
 </>}
 </div></Modal>;
}
