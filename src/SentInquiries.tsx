import type {Creator} from './domain';
import type {WorkRecord,WorkRecords} from './campaign';
import {STAGES} from './campaign';
import {sentHistoryOf,sentDateText,sentCount} from './sentHistory';
import {Identity,Icon} from './ui';
export function SentMessageHistory({record}:{record:WorkRecord}){
  const entries=[...sentHistoryOf(record)].reverse();
  return <section className="sent-history"><h3>보낸 문의 {entries.length}건</h3>{entries.length?entries.map(entry=><article key={entry.id} className="sent-message-card"><header><strong>{sentDateText(entry)}</strong><span className="manual-badge">{entry.kind==='demo'?'플랫폼 문의':'외부 발송 직접 기록'}</span></header><pre className="sent-message">{entry.message||'문의 날짜만 기록되어 있어요. 보낸 문안은 저장되지 않았습니다.'}</pre></article>):<div className="empty-state"><p>아직 보낸 문의가 없어요.</p></div>}</section>;
}
export function SentInquiries({all,work,onOpen,onExplore}:{all:Creator[];work:WorkRecords;onOpen:(c:Creator)=>void;onExplore:()=>void}){
  const rows=all.flatMap(c=>{const record=work[c.id],entries=record?sentHistoryOf(record):[];return entries.length?[{creator:c,record,entries,last:entries[entries.length-1]}]:[];}).sort((a,b)=>b.last.sentAt.localeCompare(a.last.sentAt)||a.creator.id.localeCompare(b.creator.id));
  return <div className="sent-page"><div className="page-heading"><div><p className="section-kicker">문의 내용과 답변 진행 상황</p><h1>보낸 문의 <small>{sentCount(work)}건</small></h1></div></div>{rows.length?<div className="sent-list">{rows.map(({creator:c,record,entries,last})=><article key={c.id}><Identity creator={c}/><div><span className={'stage-badge '+record.stage}>{STAGES.find(s=>s.id===record.stage)?.label}</span><small>{sentDateText(last)} · {last.kind==='demo'?'플랫폼 문의':'직접 기록'} · {entries.length}건</small></div><button className="secondary-button" aria-label={c.name+' 보낸 문의 보기'} onClick={()=>onOpen(c)}>보낸 문의 보기<Icon name="arrow" size={15}/></button></article>)}</div>:<div className="empty-state"><Icon name="send" size={32}/><h2>아직 보낸 문의가 없어요.</h2><p>후보에게 문의를 보내면 문안과 진행 상태를 여기서 확인할 수 있어요.</p><button className="primary-button" onClick={onExplore}>문의할 후보 찾기</button></div>}</div>;
}
