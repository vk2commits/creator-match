import {hasOutcome,workErrors} from './campaign';
import type {Stage,WorkRecord} from './campaign';

export const STAGE_GUIDES:Record<Stage,{title:string;description:string;action:string;next?:Stage}>={
  draft:{title:'이 크리에이터에게 협업을 제안하세요',description:'문안을 확인하고 문의 보내기를 체험하세요. 실제 연락은 복사한 문안으로 메일이나 DM에서 보낼 수 있어요.',action:'문의 보내기 · 시연',next:'contacted'},
  contacted:{title:'답변을 기다리고 있어요',description:'견적이나 진행 가능 일정이 도착하면 답변과 조건을 기록하세요.',action:'답변 받았어요',next:'negotiating'},
  negotiating:{title:'받은 견적과 제작 조건을 맞춰보세요',description:'받은 견적과 최종 합의 비용을 구분해 기록합니다. 확인 중인 조건은 나중에 채워도 돼요.',action:'협업 확정하기',next:'active'},
  active:{title:'제작 일정과 확정된 조건을 확인하세요',description:'게시를 마치면 콘텐츠 링크를 남기고, 확인한 성과를 이어서 기록하세요.',action:'게시 완료로 변경',next:'complete'},
  complete:{title:'이번 협업의 결과를 남기세요',description:'확인한 조회수와 집행비부터 기록하세요. 자세한 반응과 구매 결과는 이후에도 추가할 수 있어요.',action:'저장하고 성과 리포트 보기'},
  declined:{title:'다음 검토를 위해 이유를 남겨주세요',description:'진행하지 않은 이유를 기록해 두면 다음 캠페인에서 다시 검토하기 편해요.',action:'조건 협의로 다시 검토',next:'negotiating'},
};
// Missing stage information is guidance, not an artificial barrier to recording reality.
export function stageNeeds(w:WorkRecord):string[]{
  if(w.stage==='draft')return [];
  if(w.stage==='declined')return w.closedReason.trim()?[]:['진행하지 않은 이유'];
  const needs:string[]=[];
  if(!w.contactedAt&&!w.demoSentAt)needs.push('문의한 날짜');
  if(w.stage==='negotiating'&&w.quotedCost===null)needs.push('받은 견적');
  if(['active','complete'].includes(w.stage)){
    if(w.agreedCost===null)needs.push('합의 비용');
    if(!w.deliverable.trim())needs.push('제작 범위');
  }
  if(w.stage==='active'&&!w.dueDate)needs.push('게시 예정일');
  if(w.stage==='complete'){
    if(!w.outcome.contentUrl)needs.push('게시한 콘텐츠 링크');
    if(!hasOutcome(w.outcome))needs.push('확인한 성과');
  }
  return needs;
}
export function simulateSend(record:WorkRecord,message:string,now:string):WorkRecord{
  if(!message.trim())throw new Error('보낼 문의 문안을 입력해 주세요.');
  const next={...record,stage:'contacted' as const,message,sentMessage:message,demoSentAt:now};
  const errors=workErrors(next);if(errors.length)throw new Error(errors.join(' '));
  return next;
}
