import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CATEGORIES, DEFAULT_INPUT, SORT_OPTIONS, TIERS, WEIGHTS, moneyText, numberText, tierLabel } from './policy';
import type { Category, SortKey, Tier } from './policy';
import { parseBudget, recommend, sortMatches, validateInput } from './domain';
import type { Creator, InputErrors, MatchInput, ScoredCreator } from './domain';
import { loadCreators } from './loadData';

function Arrow() { return <span aria-hidden="true">↗</span>; }
function Metrics({ creator: c }: { creator: Creator }) {
  return <dl className="metrics">
    <div><dt>팔로워</dt><dd>{numberText(c.followers)}<small>명</small></dd></div>
    <div><dt>평균 조회수</dt><dd>{numberText(c.views)}<small>회</small></dd></div>
    <div><dt>참여율</dt><dd>{c.engagement.toFixed(1)}<small>%</small></dd></div>
    <div><dt>집행 이력</dt><dd>{numberText(c.campaigns)}<small>건</small></dd></div>
    <div><dt>광고주 평점</dt><dd>{c.rating === null ? <span className="unrated">미평가</span> : <>{c.rating.toFixed(1)}<small>/ 5</small></>}</dd></div>
  </dl>;
}
function Identity({ creator: c }: { creator: Creator }) {
  return <div className="identity"><div className={'avatar ' + (c.platform === '유튜브' ? 'youtube' : 'instagram')} aria-hidden="true">{c.name.slice(0, 1)}</div><div><div className="creator-meta"><span className={'platform ' + (c.platform === '유튜브' ? 'youtube' : 'instagram')}>{c.platform}</span><span>{c.category}</span><span>{c.id}</span></div><h3>{c.name}</h3></div></div>;
}
function CreatorCard({ item, rank, recommended }: { item: ScoredCreator; rank: number; recommended: boolean }) {
  const c = item.creator;
  const strongest = [...item.components].sort((a,b) => b.points - a.points).slice(0,2);
  return <article className="creator-card" aria-label={c.name + ' 후보'}>
    <div className="card-top"><div className="rank" title={recommended ? '추천 순위' : '현재 정렬 순서'}>{String(rank).padStart(2,'0')}</div><Identity creator={c}/><div className="score"><span>검토 점수</span><strong>{item.score.toFixed(1)}<small>/100</small></strong></div></div>
    <Metrics creator={c}/>
    <div className="card-footer"><div className="budget-line"><span>과거 평균 예산</span><strong>{moneyText(c.averageBudget)}</strong><small>현재 견적 확인 필요</small></div><p className="reason"><span aria-hidden="true">✧</span> {strongest.map(s=>s.label).join(' · ')}의 점수 기여가 큰 후보</p></div>
    <details className="score-details"><summary>추천 근거와 점수 계산 <span aria-hidden="true">＋</span></summary>
      <div className="score-content"><p><strong>{item.cohort.label} {item.cohort.size}명</strong>을 기준으로 참여율과 조회수를 비교합니다.{item.cohort.fallback && ' 표본이 적어 비교 범위를 확대했습니다.'}</p>
        {item.components.map(component=><div className="component" key={component.key}><div className="component-label"><strong>{component.label} <small>{component.weight*100}%</small></strong><span>{component.points.toFixed(2)}점</span></div><div className="bar" aria-hidden="true"><span style={{width:component.normalized+'%'}}/></div><p>{component.explanation} · 환산 {component.normalized.toFixed(1)} × {component.weight}</p></div>)}
        <p className="fine-print">기여도 합계 {item.score.toFixed(2)}점. 표시 반올림으로 소수점 합계에 차이가 날 수 있습니다. 점수는 검토 우선순위이며 광고 성과나 계약 성사를 예측하지 않습니다.</p>
      </div>
    </details>
  </article>;
}

export default function App() {
  const [data,setData] = useState<Creator[] | null>(null);
  const [loadError,setLoadError] = useState('');
  const [reload,setReload] = useState(0);
  const [budget,setBudget] = useState(String(DEFAULT_INPUT.budgetKRW));
  const [categories,setCategories] = useState<Category[]>([...DEFAULT_INPUT.categories]);
  const [tier,setTier] = useState<Tier>(DEFAULT_INPUT.sizeTier);
  const [applied,setApplied] = useState<MatchInput>({...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]});
  const [errors,setErrors] = useState<InputErrors>({});
  const [sort,setSort] = useState<SortKey>('recommended');
  const [limit,setLimit] = useState(12);
  const [notice,setNotice] = useState('');
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const budgetRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    const controller = new AbortController();
    setLoadError(''); setData(null);
    loadCreators(fetch,controller.signal).then(setData).catch((error: unknown)=>{
      if(!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.');
    });
    return ()=>controller.abort();
  },[reload]);

  const result = useMemo(()=>data ? recommend(data,applied) : null,[data,applied]);
  const sorted = useMemo(()=>result ? sortMatches(result.matched,sort) : [],[result,sort]);
  const dirty = parseBudget(budget)!==applied.budgetKRW || tier!==applied.sizeTier || categories.length!==applied.categories.length || categories.some(c=>!applied.categories.includes(c));
  const apply = (input: MatchInput, focus=true) => {
    const nextErrors=validateInput(input); setErrors(nextErrors);
    if(Object.keys(nextErrors).length) {
      if(nextErrors.budget) budgetRef.current?.focus(); else categoryRef.current?.focus();
      return;
    }
    setApplied({...input,categories:[...input.categories]}); setBudget(String(input.budgetKRW)); setCategories([...input.categories]);setTier(input.sizeTier);
    setSort('recommended');setLimit(12);setNotice('조건을 적용했습니다.');
    if(focus) requestAnimationFrame(()=>resultHeading.current?.focus());
  };
  const submit=(event: FormEvent)=>{event.preventDefault();apply({budgetKRW:parseBudget(budget),categories,sizeTier:tier});};
  const toggleCategory=(category:Category)=>setCategories(values=>values.includes(category)?values.filter(c=>c!==category):[...values,category]);
  const emptyTitle=result?.summary.categoryAndTier===0 ? '이 분야·규모 조합에는 후보가 없어요' : result?.summary.overBudget===0 && result?.needsQuote.length ? '먼저 견적 확인이 필요한 후보만 있어요' : '현재 예산 안에서 찾은 후보가 없어요';

  return <div className="app-shell">
    <a className="skip-link" href="#results">추천 결과로 바로가기</a>
    <header className="site-header"><a className="brand" href="./" aria-label="Creator Match 홈"><img src={import.meta.env.BASE_URL+'favicon.svg'} width="34" height="34" alt=""/><span>creator<span className="brand-light">match</span><i>CREATOR DISCOVERY</i></span></a><div className="header-right"><span className="demo-pill"><span/>데모 데이터</span><a href="#method">추천 기준 <Arrow/></a></div></header>
    <main>
      <section className="intro"><div><p className="eyebrow">FIND YOUR NEXT CREATOR</p><h1>숫자 너머의 가능성,<br className="mobile-break"/> 근거로 찾으세요.</h1><p className="intro-copy">예산에 맞는 후보를 찾고, 추천의 이유까지 확인하세요.</p></div><div className="dataset-note"><strong>{data ? data.length : '200'}<small>명의 크리에이터</small></strong><span>10개 분야 · 유튜브 & 인스타그램</span></div></section>
      <div className="workspace">
        <aside className="filter-panel" aria-label="탐색 조건">
          <div className="panel-heading"><h2>탐색 조건</h2><button type="button" className="text-button" onClick={()=>apply({...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]},false)}>기본값</button></div>
          <form onSubmit={submit} noValidate>
            <div className="form-section"><label className="field-label" htmlFor="budget">캠페인 예산 <span>1명 · 1회 기준</span></label><div className={'budget-input '+(errors.budget?'has-error':'')}><input ref={budgetRef} id="budget" name="budget" inputMode="numeric" autoComplete="off" value={budget} onChange={e=>setBudget(e.target.value)} aria-invalid={!!errors.budget} aria-describedby={errors.budget?'budget-help budget-error':'budget-help'}/><span>원</span></div><p className="field-help" id="budget-help">{Number.isSafeInteger(parseBudget(budget)) && parseBudget(budget)>0 ? moneyText(parseBudget(budget))+' 이내 · 쉼표 없이 입력' : '1원 이상의 숫자를 입력해 주세요.'}</p>{errors.budget&&<p className="field-error" id="budget-error" role="alert">{errors.budget}</p>}</div>
            <fieldset className="form-section"><legend className="field-label">콘텐츠 분야 <span>복수 선택</span></legend><div className="category-grid">{CATEGORIES.map((category,index)=><label className={'category-chip '+(categories.includes(category)?'selected':'')} key={category}><input ref={index===0?categoryRef:undefined} type="checkbox" name="category" value={category} checked={categories.includes(category)} onChange={()=>toggleCategory(category)} aria-describedby={errors.categories?'category-error':undefined}/><span>{category}</span><span className="check-icon" aria-hidden="true">{categories.includes(category)?'✓':'＋'}</span></label>)}</div><p className="field-help">선택한 분야 중 하나라도 일치하면 포함해요.</p>{errors.categories&&<p className="field-error" id="category-error" role="alert">{errors.categories}</p>}</fieldset>
            <fieldset className="form-section tier-section"><legend className="field-label">팔로워 규모</legend>{TIERS.map(item=><label className={'tier-option '+(tier===item.id?'selected':'')} key={item.id}><input type="radio" name="sizeTier" value={item.id} checked={tier===item.id} onChange={()=>setTier(item.id)}/><span>{item.label}</span><small>{item.range}</small></label>)}</fieldset>
            <button className="primary-button" type="submit" disabled={!data}>크리에이터 찾기 <span aria-hidden="true">→</span></button>
            <p className={'apply-help '+(dirty?'pending':'')} aria-live="polite">{dirty?'변경한 조건을 적용해 주세요.':'조건을 적용하면 추천을 다시 계산해요.'}</p>
          </form>
          <div className="filter-note"><span aria-hidden="true">ⓘ</span><p>예산은 과거 평균값으로 비교해요.<br/>실제 진행 전 견적을 확인해 주세요.</p></div>
        </aside>
        <section className="results-panel" id="results" aria-label="탐색 결과">
          {!data && !loadError && <div className="state-panel" role="status"><div className="loading-dot"/><h2>크리에이터를 불러오고 있어요</h2><p>추천 기준과 데이터를 준비합니다.</p></div>}
          {loadError && <div className="state-panel error-state" role="alert"><p className="eyebrow">DATA UNAVAILABLE</p><h2>데이터를 불러오지 못했어요</h2><p>{loadError}</p><button className="primary-button" onClick={()=>setReload(x=>x+1)}>다시 불러오기</button></div>}
          {result && <>
            <div className="results-heading"><div><p className="eyebrow">YOUR SHORTLIST</p><h2 ref={resultHeading} tabIndex={-1}>추천 후보 <span>{result.matched.length}</span></h2></div><label className="sort-control">정렬<select aria-label="결과 정렬" value={sort} onChange={e=>{setSort(e.target.value as SortKey);setLimit(12);}}>{SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
            <div className="applied-filters" aria-label="현재 적용 조건"><span>{moneyText(applied.budgetKRW)} 이내</span><span>{applied.categories.join(' · ')}</span><span>{tierLabel(applied.sizeTier)}</span>{dirty&&<em>변경 전 조건의 결과</em>}</div>
            <p className="result-context">분야·규모 일치 {result.summary.categoryAndTier}명 중 <strong>예산 참고값을 충족한 {result.matched.length}명</strong>{result.summary.overBudget>0&&' · 예산 초과 '+result.summary.overBudget+'명'}{result.needsQuote.length>0&&' · 견적 미확인 '+result.needsQuote.length+'명'}</p>
            <p className="sr-only" role="status">{notice} 추천 후보 {result.matched.length}명, 견적 확인 필요 {result.needsQuote.length}명.</p>
            {result.matched.length>0?<><div className="result-list">{sorted.slice(0,limit).map((item,index)=><CreatorCard key={item.creator.id} item={item} rank={index+1} recommended={sort==='recommended'}/>)}</div>{sorted.length>limit&&<button className="load-more" onClick={()=>setLimit(x=>x+12)}>후보 더 보기 · {Math.min(limit,sorted.length)} / {sorted.length} <span aria-hidden="true">↓</span></button>}</>:<div className="empty-state"><div className="empty-icon" aria-hidden="true">⌕</div><h3>{emptyTitle}</h3><p>{result.needsQuote.length>0?'견적 미확인 후보는 아래에서 따로 확인할 수 있어요.':'다른 조건을 적용하면 새로운 후보를 찾을 수 있어요.'}</p>{result.alternatives.length>0?<div className="alternatives">{result.alternatives.map((option,index)=><button className="alternative" key={index} onClick={()=>apply(option.input)}><span><strong>{option.label}</strong><small>{option.detail}</small></span><span className="alternative-count">{option.count}명 보기 →</span></button>)}</div>:<p className="fine-print">콘텐츠 분야를 바꾸거나 예산과 규모를 함께 조정해 보세요.</p>}</div>}
            {result.needsQuote.length>0&&<details className="quote-section"><summary><span><span className="quote-icon" aria-hidden="true">?</span>견적 확인 필요 <strong>{result.needsQuote.length}</strong></span><span className="quote-summary-hint">후보 펼치기 <span aria-hidden="true">＋</span></span></summary><p className="quote-description">분야와 규모는 일치하지만, 예산 적합을 판단할 이력이나 가격이 부족해요. 무료 후보가 아니며 추천 점수 없이 평균 조회수순으로 표시합니다.</p><div className="quote-list">{result.needsQuote.map(c=><article className="quote-card" key={c.id}><Identity creator={c}/><Metrics creator={c}/><p className="quote-price">금액 미확인 · 견적 문의 필요</p></article>)}</div></details>}
            <div className="result-footnote"><span aria-hidden="true">↳</span> 추천은 검토의 출발점이에요. 콘텐츠 적합성과 현재 견적을 확인하고 결정하세요.</div>
          </>}
        </section>
      </div>
      <section className="method-section" id="method"><div><p className="eyebrow">BEHIND THE MATCH</p><h2>추천의 기준도<br/>함께 공개합니다.</h2><p>점수는 후보를 살펴볼 우선순위예요.<br/>광고 성과를 예측하는 값은 아닙니다.</p></div><div className="method-body"><div className="weight-row">{[{key:'engagement',label:'참여율'},{key:'views',label:'평균 조회수'},{key:'rating',label:'광고주 평점'},{key:'experience',label:'집행 경험'}].map(w=><div key={w.key}><strong>{WEIGHTS[w.key as keyof typeof WEIGHTS]*100}<small>%</small></strong><span>{w.label}</span></div>)}</div><p>참여율과 조회수는 <strong>같은 플랫폼·규모 안의 상대 위치</strong>로 비교합니다. 평점은 5점 척도를 환산하고, 경험은 건수가 늘수록 가산 폭을 줄여 반영합니다.</p><p>평점 공란은 미평가로 남깁니다. 가격을 알 수 없는 후보는 견적 확인 영역에 따로 표시합니다. 데이터에 없는 전환·매출·오디언스 정보는 추정하지 않습니다.</p></div></section>
    </main>
    <footer><span>creator<span className="brand-light">match</span></span><p>제공된 더미 데이터로 만든 크리에이터 탐색 프로토타입</p><a href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}}>맨 위로 ↑</a></footer>
  </div>;
}

