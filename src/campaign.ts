import type { Creator } from './domain';
import type { Brief } from './experience';
import { moneyText } from './policy';

export const GOALS = [
  {id:'awareness',label:'제품 알리기',detail:'제품을 더 많은 사람에게 소개하고 싶어요',priority:'reach'},
  {id:'engagement',label:'관심·반응 얻기',detail:'콘텐츠에 관심과 대화가 생기면 좋겠어요',priority:'response'},
  {id:'sales',label:'구매로 연결하기',detail:'제품을 보고 실제 구매까지 이어지길 바라요',priority:'balanced'},
] as const;
export type Goal = typeof GOALS[number]['id'];
export type CustomerNeed = 'proof' | 'routine' | 'discovery';
export type Campaign = { name: string; product: string; goal: Goal; targetCustomer?: string; customerNeed?: CustomerNeed; includeKeywords?: string[]; excludeKeywords?: string[]; creatorStyle?: string; requiredElements?: string; searchText?: string; searchPlatform?: string };
export const EMPTY_CAMPAIGN:Campaign={name:'',product:'',goal:'awareness'};
export const campaignOf=(brief:Brief):Campaign=>brief.campaign??{name:'나의 캠페인',product:'',goal:'awareness'};
export const STAGES=[{id:'draft',label:'문의 준비',next:'문의 문안 작성'},{id:'contacted',label:'답변 대기',next:'답변·견적 기록'},{id:'negotiating',label:'조건 협의',next:'견적·조건 검토'},{id:'active',label:'제작 진행',next:'제작 진행 관리'},{id:'complete',label:'집행 완료',next:'성과 업데이트'},{id:'declined',label:'진행 안 함',next:'사유·재검토'}] as const;
export type Stage=typeof STAGES[number]['id'];
export const METRICS=[{key:'views',label:'조회수',unit:'회'},{key:'likes',label:'좋아요',unit:'개'},{key:'comments',label:'댓글',unit:'개'},{key:'shares',label:'공유',unit:'회'},{key:'saves',label:'저장',unit:'회'},{key:'clicks',label:'링크 클릭',unit:'회'},{key:'conversions',label:'구매',unit:'건'},{key:'revenue',label:'연결 매출',unit:'원'}] as const;
export type Metric=typeof METRICS[number]['key'];
export type Outcome={cost:number|null;measuredAt:string;source:string;contentUrl:string;attribution:string}&Record<Metric,number|null>;
export type SentInquiry={id:string;kind:'demo'|'manual';sentAt:string;message:string};
export type WorkRecord={stage:Stage;email:string;channelUrl:string;deliverable:string;dueDate:string;rights:string;agreedCost:number|null;quotedCost:number|null;contactedAt:string;demoSentAt:string;sentMessage:string;sentHistory:SentInquiry[];closedReason:string;memo:string;message:string;outcome:Outcome};
export type WorkRecords=Record<string,WorkRecord>;
export const emptyOutcome=():Outcome=>({cost:null,measuredAt:'',source:'',contentUrl:'',attribution:'',views:null,likes:null,comments:null,shares:null,saves:null,clicks:null,conversions:null,revenue:null});
export const emptyWork=():WorkRecord=>({stage:'draft',email:'',channelUrl:'',deliverable:'',dueDate:'',rights:'',agreedCost:null,quotedCost:null,contactedAt:'',demoSentAt:'',sentMessage:'',sentHistory:[],closedReason:'',memo:'',message:'',outcome:emptyOutcome()});
/** Accept pasted public web addresses, never executable schemes or credentials. */
export function normalizeWebUrl(value:string):string|null {
  const raw=value.trim();
  if(!raw)return '';
  if(/[\s\\]/.test(raw)||raw.startsWith('/'))return null;
  const explicit=/^[a-z][a-z\d+.-]*:/i.test(raw);
  if(explicit&&!/^https?:\/\//i.test(raw))return null;
  try {
    const u=new URL(explicit?raw:'https://'+raw);
    if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname.includes('.')||u.hostname.startsWith('.')||u.hostname.endsWith('.'))return null;
    return u.href;
  }catch{return null;}
}
export function safeUrl(value:string):boolean {return !!value.trim()&&normalizeWebUrl(value)!==null;}
export function normalizeWorkUrls(w:WorkRecord):WorkRecord {return {...w,channelUrl:normalizeWebUrl(w.channelUrl)??w.channelUrl,outcome:{...w.outcome,contentUrl:normalizeWebUrl(w.outcome.contentUrl)??w.outcome.contentUrl}};}
export type FieldIssues=Record<string,string>;
export const validNumber=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
export function parseMetric(value:string):number|null {if(!value.trim())return null;const n=Number(value.replaceAll(',',''));return validNumber(n)&&/^[\d,]+$/.test(value)?n:NaN;}
export function validDate(value:string):boolean {return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function outcomeIssues(o:Outcome):FieldIssues {
  const errors:FieldIssues={};
  for(const key of ['cost',...METRICS.map(m=>m.key)] as const)if(o[key]!==null&&!validNumber(o[key]))errors['outcome.'+key]='0 이상의 정수로 입력해 주세요.';
  if((hasOutcome(o)||o.measuredAt)&&!validDate(o.measuredAt))errors['outcome.measuredAt']='성과를 확인한 날짜를 입력해 주세요.';
  if(hasOutcome(o)&&!o.source.trim())errors['outcome.source']='지표를 확인한 출처를 입력해 주세요.';
  if(o.contentUrl&&!safeUrl(o.contentUrl))errors['outcome.contentUrl']='콘텐츠 주소를 확인해 주세요. 예: youtube.com/watch?v=…';
  if((o.revenue!==null||o.conversions!==null)&&!o.attribution.trim())errors['outcome.attribution']='구매·매출의 집계 기준을 입력해 주세요. 예: 전용 할인코드, 7일 집계';
  return errors;
}
export const outcomeErrors=(o:Outcome)=>Object.values(outcomeIssues(o));
export function workIssues(w:WorkRecord):FieldIssues {
  const errors:FieldIssues={};
  if(w.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w.email))errors.email='이메일 주소를 확인해 주세요.';
  if(w.channelUrl&&!safeUrl(w.channelUrl))errors.channelUrl='채널 주소를 확인해 주세요. 예: instagram.com/계정명';
  if(w.dueDate&&!validDate(w.dueDate))errors.dueDate='게시 예정일을 확인해 주세요.';
  if(w.contactedAt&&!validDate(w.contactedAt))errors.contactedAt='문의한 날짜를 확인해 주세요.';
  if(w.agreedCost!==null&&!validNumber(w.agreedCost))errors.agreedCost='합의 비용은 0 이상의 정수로 입력해 주세요.';
  if(w.quotedCost!==null&&!validNumber(w.quotedCost))errors.quotedCost='받은 견적은 0 이상의 정수로 입력해 주세요.';
  if(w.demoSentAt&&!Number.isFinite(Date.parse(w.demoSentAt)))errors.demoSentAt='발송 기록을 확인해 주세요.';
  return {...errors,...outcomeIssues(w.outcome)};
}
export const workErrors=(w:WorkRecord)=>Object.values(workIssues(w));
export const hasOutcome=(o:Outcome)=>[o.cost,...METRICS.map(m=>o[m.key])].some(n=>n!==null);
export function efficiencies(o:Outcome){
  const ratio=(denominator:number|null)=>o.cost!==null&&denominator!==null&&denominator>0?o.cost/denominator:null;
  const parts=[o.likes,o.comments,o.shares,o.saves];
  const interactions=parts.every(x=>x!==null)?parts.reduce<number>((s,x)=>s+x!,0):null;
  return {cpv:ratio(o.views),cpe:ratio(interactions),cpc:ratio(o.clicks),cpa:ratio(o.conversions),roas:o.cost!==null&&o.cost>0&&o.revenue!==null?o.revenue/o.cost*100:null,interactions};
}
// Aggregate only matched cost/view pairs; never divide all spend by partial views.
export function reportSummary(records:WorkRecords){
  const outcomes=Object.values(records).map(w=>w.outcome).filter(hasOutcome);
  const views=outcomes.filter(o=>o.views!==null);
  const costs=outcomes.filter(o=>o.cost!==null);
  const pairs=outcomes.filter(o=>o.cost!==null&&o.views!==null&&o.views>0);
  const pairViews=pairs.reduce((s,o)=>s+o.views!,0);
  return {count:outcomes.length,views:views.reduce((s,o)=>s+o.views!,0),viewCount:views.length,cost:costs.reduce((s,o)=>s+o.cost!,0),costCount:costs.length,cpv:pairViews?pairs.reduce((s,o)=>s+o.cost!,0)/pairViews:null,pairCount:pairs.length};
}
export function inquiryDraft(c:Creator,brief:Brief,w:WorkRecord,_reason:string){
  const campaign=campaignOf(brief);
  return `안녕하세요, ${c.name}님.\n\n「${campaign.name}」 캠페인의 콘텐츠 협업을 제안드립니다.\n${campaign.product?`소개할 제품·메시지: ${campaign.product}\n`:''}\n${campaign.creatorStyle?`희망 콘텐츠 스타일: ${campaign.creatorStyle}\n`:''}${campaign.requiredElements?`필수 노출 요소: ${campaign.requiredElements}\n`:''}희망 제작 범위: ${w.deliverable||'[콘텐츠 형식·수량 입력]'}\n게시 희망일: ${w.dueDate||'[일정 협의]'}\n콘텐츠 사용 범위: ${w.rights||'[2차 활용·광고 사용 여부 협의]'}\n검토 예산: 1명당 ${moneyText(brief.input.budgetKRW)} 이내\n\n해당 조건에서 진행 가능한 일정과 견적(부가세 포함 여부), 수정 범위, 콘텐츠 사용권을 알려주시면 검토 후 회신드리겠습니다. 감사합니다.`;
}
export function readWork(raw:unknown):WorkRecords {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  const result:WorkRecords={};
  for(const [id,value] of Object.entries(raw)){
    if(!/^C\d{4}$/.test(id)||!value||typeof value!=='object')continue;
    const w={...emptyWork(),...value,outcome:{...emptyOutcome(),...value.outcome}} as WorkRecord;
    if(!STAGES.some(s=>s.id===w.stage))continue;
    const strings=['email','channelUrl','deliverable','dueDate','rights','contactedAt','demoSentAt','sentMessage','closedReason','memo','message'] as const;
    if(strings.some(k=>typeof w[k]!=='string')||['measuredAt','source','contentUrl','attribution'].some(k=>typeof w.outcome[k as keyof Outcome]!=='string'))continue;
    if(!('sentHistory' in value))w.sentHistory=w.demoSentAt?[{id:'legacy-demo',kind:'demo',sentAt:w.demoSentAt,message:w.sentMessage}]:w.contactedAt?[{id:'legacy-manual',kind:'manual',sentAt:w.contactedAt,message:w.sentMessage}]:[];
    if(!Array.isArray(w.sentHistory))w.sentHistory=[];
    w.sentHistory=w.sentHistory.filter(s=>s&&typeof s.id==='string'&&['demo','manual'].includes(s.kind)&&typeof s.sentAt==='string'&&typeof s.message==='string'&&(s.kind==='manual'?validDate(s.sentAt):Number.isFinite(Date.parse(s.sentAt)))).map(s=>({...s,message:s.message.slice(0,12000)}));
    if(workErrors(w).length)continue;
    for(const k of strings)w[k]=w[k].slice(0,['message','sentMessage'].includes(k)?12000:2000);
    result[id]=normalizeWorkUrls(w);
  }
  return result;
}

// Isolated, clearly labelled illustration. Never written to local storage or the source CSV.
export function exampleWork():WorkRecord{return {...emptyWork(),stage:'complete',contactedAt:'2026-09-14',deliverable:'예시 콘텐츠 1편',agreedCost:100000,outcome:{cost:100000,views:10000,likes:100,comments:20,shares:10,saves:20,clicks:500,conversions:10,revenue:200000,measuredAt:'2026-09-21',source:'화면 체험용 예시 · 실제 집행 데이터 아님',attribution:'예시 전용 코드 · 7일 집계',contentUrl:''}};}
