import { readWork } from './campaign';
import type { Campaign, WorkRecords } from './campaign';
import { budgetEvidence, hasKnownBudget, scoreCreator, validateInput } from './domain';
import type { Creator, MatchInput, ScoredCreator } from './domain';
import { PRIORITIES, priorityOf, moneyText, numberText, tierOf, tierRange } from './policy';
import type { Priority, Weights } from './policy';
import { validWeights } from './weights';

export type Brief = { input: MatchInput; priority: Priority; customWeights?: Weights; campaign?: Campaign };
export type Notes = Record<string, string>;
export type Decision = 'review' | 'contact' | 'hold';
export type Decisions = Record<string, Decision>;
export const decisionLabel = (d?:Decision) => d==='contact'?'문의 후보':d==='hold'?'보류':'검토 중';
export const criteriaOf = (brief:Brief) => brief.customWeights ? {...priorityOf(brief.priority),label:'직접 설정',icon:'balance',weights:brief.customWeights} : priorityOf(brief.priority);
export type SavedSession = { version: 5; work: WorkRecords; brief: Brief; selected: string[]; compared: string[]; notes: Notes; decisions: Decisions };
// Keep the key to migrate existing saved candidates without resetting them.
export const STORAGE_KEY = 'creator-match-v2';
export function readSession(raw: string | null): SavedSession | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (![2, 3, 4, 5].includes(data?.version) || !data.brief || !PRIORITIES.some(p => p.id === data.brief.priority)) return null;
    if(data.brief.customWeights!==undefined&&!validWeights(data.brief.customWeights))return null;
    const input = data.brief.input;
    if (!input || !Array.isArray(input.categories) || Object.keys(validateInput(input)).length) return null;
    if (!Array.isArray(data.selected) || data.selected.some((id: unknown) => typeof id !== 'string')) return null;
    const selected = [...new Set<string>(data.selected)];
    const compared = data.version === 2 ? selected.slice(0, 3) : Array.isArray(data.compared)
      ? [...new Set<string>(data.compared.filter((id: unknown) => typeof id === 'string' && selected.includes(id)))].slice(0, 3) : [];
    const notes = Object.fromEntries(Object.entries(data.notes ?? {}).filter(([id, value]) => selected.includes(id) && typeof value === 'string').map(([id, value]) => [id, (value as string).slice(0, 500)]));
    const decisions=Object.fromEntries(Object.entries(data.decisions??{}).filter(([id,d])=>selected.includes(id)&&['review','contact','hold'].includes(d as string))) as Decisions;
    const campaign=data.brief.campaign;
    if(campaign&&(typeof campaign.name!=='string'||typeof campaign.product!=='string'||!['awareness','engagement','sales'].includes(campaign.goal)))delete data.brief.campaign;
    if(data.brief.campaign){
      data.brief.campaign.keywordMode=campaign.keywordMode==='all'?'all':'any';
      for(const key of ['includeKeywords','excludeKeywords'])data.brief.campaign[key]=Array.isArray(campaign[key])?[...new Set(campaign[key].filter((v:unknown)=>typeof v==='string').map((v:string)=>v.slice(0,120)))].slice(0,20):[];
      for(const key of ['creatorStyle','requiredElements','searchText','searchPlatform'])data.brief.campaign[key]=typeof campaign[key]==='string'?campaign[key].slice(0,1500):'';
      data.brief.campaign.targetCustomer=typeof campaign.targetCustomer==='string'?campaign.targetCustomer.slice(0,300):'';
      if(!['proof','routine','discovery'].includes(campaign.customerNeed))delete data.brief.campaign.customerNeed;
    }
    return { version: 5, work: readWork(data.work), brief: data.brief, selected, compared, notes, decisions };
  } catch { return null; }
}
export function toggleCompared(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 3 ? [...ids, id] : [...ids];
}
export function formatBudget(raw: string): string {
  if (!/^[\d,]*$/.test(raw)) return raw;
  const digits = raw.replaceAll(',', '');
  return digits.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Describe cohort evidence, rather than repeating the largest absolute component.
export function evidence(item: ScoredCreator): { title: string; detail: string } {
  if(item.components.filter(c=>c.key==='engagement'||c.key==='views').every(c=>c.weight===0)){
    const active=[...item.components].filter(c=>c.weight>0).sort((a,b)=>b.points-a.points)[0];
    return active.key==='rating'?{title:item.creator.rating===null?'광고주 평점 미평가':'광고주 평점 '+item.creator.rating.toFixed(1)+' / 5',detail:'현재 비중에서 평점이 주로 반영됩니다. 응답 수는 제공되지 않았고 미평가는 관측값이 아닙니다.'}:{title:'광고 집행 '+item.creator.campaigns+'건',detail:'현재 비중에서 집행 경험이 주로 반영됩니다. 많은 이력이 좋은 성과를 보장하지 않습니다.'};
  }
  const observed = item.components.filter(c => c.key === 'engagement' || c.key === 'views');
  const weighted = observed.filter(c => c.weight > 0);
  const candidates = weighted.length ? weighted : observed;
  const best = [...candidates].sort((a, b) => (b.normalized - 50) * b.weight - (a.normalized - 50) * a.weight)[0];
  const key = best.key === 'engagement' ? 'engagement' : 'views';
  const value = item.creator[key];
  const reference = item.cohort.medians[key];
  const label = key === 'engagement' ? '참여율' : '평균 조회수';
  const format = (n: number) => key === 'engagement' ? n.toFixed(1) + '%' : numberText(n) + '회';
  return {
    title: key === 'views' && reference > 0 && value !== reference ? '평균 조회 · 중간값의 약 ' + (value/reference).toFixed(1) + '배' : value === reference ? label + ' · 비교 집단 중간 수준' : label + ' · 중간값보다 ' + (key === 'engagement' ? Math.abs(value-reference).toFixed(1)+'%p' : numberText(Math.abs(value-reference))+'회') + (value > reference ? ' 높음' : ' 낮음'),
    detail: item.cohort.label + ' ' + item.cohort.size + '명 기준, ' + label + ' ' + format(value) + ' / 중간값 ' + format(reference) + '. ' + (item.cohort.fallback ? '표본이 적어 비교 범위를 넓혔습니다. ' : '') + '선택한 비중을 반영한 참여·조회 지표의 상대적 특징입니다. 전체 기준은 계산 상세에서 확인할 수 있습니다.',
  };
}
export const insight = (item: ScoredCreator) => evidence(item).title;

export function comparisonReason(item: ScoredCreator, others: readonly ScoredCreator[]): string {
  const other = [...others].filter(x => x.creator.id !== item.creator.id).sort((a, b) => b.score - a.score || a.creator.id.localeCompare(b.creator.id, 'en'))[0];
  if (!other) return '점수를 비교할 다른 후보가 없습니다. ' + insight(item);
  const differences = item.components.map(c => ({ label: c.label, difference: c.points - other.components.find(o => o.key === c.key)!.points }));
  const best = [...differences].sort((a, b) => b.difference - a.difference)[0];
  const worst = [...differences].sort((a, b) => a.difference - b.difference)[0];
  const positive = best.difference > 1e-9;
  const negative = worst.difference < -1e-9;
  if (!positive && !negative) return other.creator.name + '과 점수 구성이 같습니다. 콘텐츠와 견적을 추가로 확인하세요.';
  return other.creator.name + ' 대비 ' + (positive ? best.label + '에서 앞섭니다.' : '현재 기준에서 앞서는 지표가 없습니다.') + (negative ? ' ' + worst.label + '에서는 상대 후보가 앞섭니다.' : ' 다른 지표도 같거나 더 유리합니다.');
}
export function candidateStatus(c: Creator, brief: Brief): string {
  if (!brief.input.categories.includes(c.category) || tierOf(c.followers) !== brief.input.sizeTier) return '현재 분야·팔로워 조건 밖';
  if (!hasKnownBudget(c)) return '비용 미확인';
  return c.averageBudget <= brief.input.budgetKRW ? '조건 충족' : '현재 예산 초과';
}
const cell = (value: string) => value.replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
export function comparisonMarkdown(creators: readonly Creator[], brief: Brief, all: readonly Creator[], notes: Notes = {}, decisions: Decisions = {}): string {
  const p = criteriaOf(brief);
  const scored = creators.filter(c => candidateStatus(c, brief) === '조건 충족').map(c => scoreCreator(c, all, 'cohort', p.weights));
  return '# 캠페인 후보 비교 메모\n\n' +
    '기준: ' + p.label + ' / ' + brief.input.categories.join('·') + ' / 팔로워 ' + tierRange(brief.input.sizeTier) + ' / 1명당 ' + moneyText(brief.input.budgetKRW) + ' 이내\n\n' +
    '가중치: 참여율 ' + Math.round(p.weights.engagement * 100) + '%, 조회수 ' + Math.round(p.weights.views * 100) + '%, 평점 ' + Math.round(p.weights.rating * 100) + '%, 경험 ' + Math.round(p.weights.experience * 100) + '%. 성과 예측이 아닌 검토 기준입니다.\n\n' +
    '| 후보 | 플랫폼·분야 | 팔로워 | 평균 조회수 | 참여율 | 집행 | 평점 | 과거 평균 비용 | 원본 누적 집행액 | 현재 조건 |\n|---|---|---:|---:|---:|---:|---|---:|---:|---|\n' +
    creators.map(c => '| ' + cell(c.name) + ' (' + c.id + ') | ' + c.platform + '·' + c.category + ' | ' + numberText(c.followers) + ' | ' + numberText(c.views) + ' | ' + c.engagement + '% | ' + c.campaigns + ' | ' + (c.rating ?? '미평가') + ' | ' + (hasKnownBudget(c) ? moneyText(c.averageBudget) : '비용 미확인') + ' | ' + moneyText(c.totalBudget) + ' | ' + candidateStatus(c, brief) + ' / '+decisionLabel(decisions[c.id])+' |').join('\n') +
    '\n\n## 검토 근거와 내 판단\n\n' + creators.map(c => {
      const item = scored.find(x => x.creator.id === c.id);
      return '### ' + cell(c.name) + ' · '+decisionLabel(decisions[c.id])+'\n\n' + (item ? evidence(item).detail + '\n\n' + comparisonReason(item, scored) : candidateStatus(c, brief) + ' — 현재 추천의 우선순위 비교에서 제외합니다.') + '\n\n' + budgetEvidence(c) + '\n\n**남긴 이유·추가 확인:** ' + (notes[c.id]?.trim() ? cell(notes[c.id]) : '미작성');
    }).join('\n\n') +
    '\n\n## 다음 확인\n\n- [ ] 실제 채널 URL·최근 콘텐츠·브랜드 적합성\n- [ ] 현재 견적·제작 범위·사용권·일정\n- [ ] 광고주 평점의 응답 수·관측 기간\n- [ ] 최종 선정 이유 확인\n\n더미 데이터입니다. 채널 링크가 제공되지 않았습니다. 평균 비용은 현재 견적이 아닙니다. 여러 후보의 비용을 합쳐 캠페인 총예산으로 계산하지 않습니다.\n';
}

export function candidateCautions(c:Creator,brief:Brief):string[] {
  const facts:string[]=[];
  const state=candidateStatus(c,brief);
  if(state!=='조건 충족')facts.push(state==='비용 미확인'?'과거 비용이 없어 예산 충족 여부를 판단할 수 없습니다.':state==='현재 예산 초과'?'과거 평균 비용이 현재 예산보다 '+moneyText(c.averageBudget-brief.input.budgetKRW)+' 높습니다.':state);
  if(c.campaigns===0)facts.push('제공된 광고 집행 이력이 없습니다.');
  if(c.rating===null)facts.push('광고주 평가가 없습니다. 0점으로 평가한 것이 아닙니다.');
  return facts;
}
export function handoffMarkdown(creators:readonly Creator[],brief:Brief,all:readonly Creator[],notes:Notes,decisions:Decisions,explain:(item:ScoredCreator)=>string=insight):string {
  const contacts=creators.filter(c=>decisions[c.id]==='contact'),p=criteriaOf(brief);
  const weightLine='참여율 '+Math.round(p.weights.engagement*100)+'%, 조회수 '+Math.round(p.weights.views*100)+'%, 평점 '+Math.round(p.weights.rating*100)+'%, 경험 '+Math.round(p.weights.experience*100)+'%';
  return '# 팀 검토안 · 견적 문의 후보\n\n'+contacts.length+'명을 견적 문의 대상으로 제안합니다. 실제 문의는 발송하지 않았습니다.\n\n'+
    '캠페인: '+brief.input.categories.join('·')+' / 팔로워 '+tierRange(brief.input.sizeTier)+' / 1명당 '+moneyText(brief.input.budgetKRW)+' 이내\n\n'+
    '기준: '+p.label+' ('+weightLine+'). 광고 성과 예측이 아닌 비교 기준입니다.\n\n'+
    contacts.map(c=>{
      const eligible=candidateStatus(c,brief)==='조건 충족';
      const scored=eligible?scoreCreator(c,all,'cohort',p.weights):null;
      const observation=scored?explain(scored):'현재 추천의 우선순위 비교에서 제외 — '+candidateStatus(c,brief);
      return '### '+cell(c.name)+' · '+c.platform+' · '+c.category+'\n\n'+
        '**문의 이유:** '+(notes[c.id]?.trim()?cell(notes[c.id]):'미작성')+'\n\n'+
        '- 팔로워 '+numberText(c.followers)+'명 / 평균 조회 '+numberText(c.views)+'회 / 참여율 '+c.engagement+'%\n'+
        '- 집행 '+c.campaigns+'건 / 평점 '+(c.rating===null?'미평가':c.rating.toFixed(1)+'/5')+' / 과거 평균 비용 '+(hasKnownBudget(c)?moneyText(c.averageBudget):'미확인')+'\n'+
        '- 현재 조건: '+candidateStatus(c,brief)+'\n- 비교 근거: '+observation+
        (candidateCautions(c,brief).length?'\n- 확인할 점: '+candidateCautions(c,brief).join(' '):'');
    }).join('\n\n')+'\n\n보류한 후보: '+(creators.filter(c=>decisions[c.id]==='hold').map(c=>cell(c.name)+(notes[c.id]?.trim()?' — '+cell(notes[c.id]):' — 보류 이유 미작성')).join(' / ')||'없음')+
    '\n\n## 팀 확인 후 진행할 일\n\n- 실제 채널과 최근 콘텐츠의 브랜드 적합성 검토\n- 현재 견적·제작 범위·사용권·일정 확인\n\n더미 데이터이며 채널 URL·연락처·평점 응답 수·측정 기간은 제공되지 않았습니다. 과거 비용은 현재 견적이 아니고, 예산은 1명당 상한입니다.\n';
}
