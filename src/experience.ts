import { hasKnownBudget, scoreCreator, validateInput } from './domain';
import type { Creator, MatchInput, ScoredCreator } from './domain';
import { PRIORITIES, priorityOf, moneyText, numberText, tierLabel } from './policy';
import type { Priority } from './policy';

export type Brief = { input: MatchInput; priority: Priority };
export type SavedSession = { version: 2; brief: Brief; selected: string[] };
export const STORAGE_KEY = 'creator-match-v2';
export function readSession(raw: string | null): SavedSession | null {
  try {
    const data = JSON.parse(raw ?? 'null');
    if(data?.version !== 2 || !data.brief || !PRIORITIES.some(p=>p.id===data.brief.priority)) return null;
    const input = data.brief.input;
    if(!input || !Array.isArray(input.categories) || Object.keys(validateInput(input)).length) return null;
    if(!Array.isArray(data.selected) || data.selected.some((id: unknown)=>typeof id!=='string')) return null;
    return {...data, selected: [...new Set<string>(data.selected)].slice(0,3)};
  } catch {return null;}
}
export function formatBudget(raw: string): string {
  if(!/^[\d,]*$/.test(raw)) return raw;
  const digits=raw.replaceAll(',','');
  return digits.replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
export function insight(item: ScoredCreator): string {
  const best = [...item.components].sort((a,b)=>b.points-a.points)[0];
  if(best.key==='engagement') return '참여율 '+item.creator.engagement.toFixed(1)+'%';
  if(best.key==='views') return '평균 조회 '+numberText(item.creator.views)+'회';
  if(best.key==='rating') return item.creator.rating===null ? '평점 미평가' : '광고주 평점 '+item.creator.rating.toFixed(1);
  return '광고 집행 '+item.creator.campaigns+'건';
}
export function comparisonMarkdown(creators: readonly Creator[], brief: Brief, all: readonly Creator[]): string {
  const p=priorityOf(brief.priority);
  const eligible=(c:Creator)=>brief.input.categories.includes(c.category) && (c.followers<10000?'nano':c.followers<100000?'micro':'macro')===brief.input.sizeTier && hasKnownBudget(c) && c.averageBudget<=brief.input.budgetKRW;
  return '# 캠페인 후보 비교 메모\n\n'+
    '기준: '+p.label+' / '+brief.input.categories.join('·')+' / '+tierLabel(brief.input.sizeTier)+' / 1명당 '+moneyText(brief.input.budgetKRW)+' 이내\n\n'+
    '가중치: 참여율 '+Math.round(p.weights.engagement*100)+'%, 조회수 '+Math.round(p.weights.views*100)+'%, 평점 '+Math.round(p.weights.rating*100)+'%, 경험 '+Math.round(p.weights.experience*100)+'%. 성과 예측이 아닌 검토 기준입니다.\n\n'+
    '| 후보 | 플랫폼·분야 | 팔로워 | 평균 조회수 | 참여율 | 집행 | 평점 | 과거 평균 비용 | 원본 누적 집행액 | 현재 조건 |\n|---|---|---:|---:|---:|---:|---|---:|---:|---|\n'+
    creators.map(c=>'| '+c.name+' ('+c.id+') | '+c.platform+'·'+c.category+' | '+numberText(c.followers)+' | '+numberText(c.views)+' | '+c.engagement+'% | '+c.campaigns+' | '+(c.rating??'미평가')+' | '+(hasKnownBudget(c)?moneyText(c.averageBudget):'비용 미확인')+' | '+moneyText(c.totalBudget)+' | '+(eligible(c)?'충족':hasKnownBudget(c)?'조건 재확인':'비용 미확인')+' |').join('\n')+
    '\n\n## 검토 근거\n\n'+creators.map(c=>'- '+c.name+': '+(hasKnownBudget(c)?insight(scoreCreator(c,all,'cohort',p.weights)):'가격·평점 등 추가 정보 확인 필요')).join('\n')+
    '\n\n## 다음 확인\n\n- [ ] 실제 채널 URL·최근 콘텐츠·브랜드 적합성\n- [ ] 현재 견적·제작 범위·사용권·일정\n- [ ] 광고주 평점의 응답 수·관측 기간\n- [ ] 최종 선정 이유 작성\n\n더미 데이터입니다. 채널 링크가 제공되지 않았습니다. 평균 비용은 현재 견적이 아닙니다. 원본 누적 집행액은 평균×건수와 불일치하며 수정하지 않았습니다. 여러 후보의 비용을 합쳐 캠페인 총예산으로 계산하지 않습니다.\n';
}

