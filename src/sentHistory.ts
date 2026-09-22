import type {SentInquiry,WorkRecord,WorkRecords} from './campaign';
export function sentHistoryOf(record:WorkRecord):SentInquiry[]{
  if(Array.isArray(record.sentHistory))return record.sentHistory;
  if(record.demoSentAt)return [{id:'legacy-demo',kind:'demo',sentAt:record.demoSentAt,message:record.sentMessage}];
  if(record.contactedAt)return [{id:'legacy-manual',kind:'manual',sentAt:record.contactedAt,message:record.sentMessage}];
  return [];
}
export const sentCount=(records:WorkRecords)=>Object.values(records).reduce((n,r)=>n+sentHistoryOf(r).length,0);
export const sentDateText=(entry:SentInquiry)=>entry.kind==='manual'?entry.sentAt:new Date(entry.sentAt).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
