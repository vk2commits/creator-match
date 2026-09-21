import Papa from 'papaparse';
import { CATEGORIES, PLATFORMS, TIERS, MIN_COHORT_SIZE, WEIGHTS, tierOf, tierLabel, moneyText } from './policy';
import type { Category, Platform, Tier, SortKey, Weights } from './policy';

export type Creator = {
  id: string; name: string; category: Category; platform: Platform;
  followers: number; views: number; engagement: number; campaigns: number;
  totalBudget: number; averageBudget: number; rating: number | null;
};
export type MatchInput = { budgetKRW: number; categories: Category[]; sizeTier: Tier };
export type InputErrors = Partial<Record<'budget' | 'categories' | 'tier', string>>;
export type Method = 'simple' | 'cohort';
export type ComponentScore = { key: keyof Weights; label: string; normalized: number; weight: number; points: number; explanation: string };
export type ScoredCreator = {
  creator: Creator; score: number; components: ComponentScore[];
  cohort: { label: string; size: number; fallback: boolean };
};
export type Alternative = { label: string; detail: string; count: number; input: MatchInput };
export type MatchResult = {
  matched: ScoredCreator[]; needsQuote: Creator[]; alternatives: Alternative[];
  summary: { all: number; category: number; categoryAndTier: number; overBudget: number };
};

const SCHEMA = ['creator_id', 'creator_name', 'category', 'platform', 'followers', 'avg_view_count', 'engagement_rate', 'total_campaign_count', 'total_campaign_budget_krw', 'avg_campaign_budget_krw', 'advertiser_rating'];

export function parseCreators(text: string): Creator[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: header => header.replace(/^\uFEFF/, '').trim() });
  if (parsed.errors.length) throw new Error('CSV 구조를 읽지 못했습니다. 원본 파일을 확인해 주세요.');
  const fields = parsed.meta.fields ?? [];
  if (fields.length !== SCHEMA.length || SCHEMA.some(field => !fields.includes(field))) throw new Error('필수 데이터 항목이 누락되었거나 형식이 다릅니다.');
  if (!parsed.data.length) throw new Error('크리에이터 데이터가 비어 있습니다.');
  const ids = new Set<string>();
  return parsed.data.map((row, index) => {
    const fail = (field: string): never => { throw new Error(String(index + 2) + '행의 ' + field + ' 값을 확인해 주세요.'); };
    const getText = (field: string): string => {
      const value = row[field]?.trim();
      if (!value) return fail(field);
      return value;
    };
    const getNumber = (field: string, integer = true, max = Number.MAX_SAFE_INTEGER): number => {
      const raw = getText(field);
      if (!/^\d+(\.\d+)?$/.test(raw)) return fail(field);
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isSafeInteger(value))) return fail(field);
      return value;
    };
    const id = getText('creator_id');
    if (ids.has(id)) return fail('중복 ID');
    ids.add(id);
    const category = getText('category');
    const platform = getText('platform');
    if (!CATEGORIES.includes(category as Category)) return fail('category');
    if (!PLATFORMS.includes(platform as Platform)) return fail('platform');
    const rating = row.advertiser_rating?.trim() ? getNumber('advertiser_rating', false, 5) : null;
    if (rating !== null && rating < 1) return fail('advertiser_rating');
    return { id, name: getText('creator_name'), category: category as Category, platform: platform as Platform,
      followers: getNumber('followers'), views: getNumber('avg_view_count'), engagement: getNumber('engagement_rate', false, 100),
      campaigns: getNumber('total_campaign_count'), totalBudget: getNumber('total_campaign_budget_krw'), averageBudget: getNumber('avg_campaign_budget_krw'), rating };
  });
}

export function validateInput(input: MatchInput): InputErrors {
  const errors: InputErrors = {};
  if (!Number.isSafeInteger(input.budgetKRW) || input.budgetKRW <= 0) errors.budget = '예산은 1원 이상의 정수로 입력해 주세요.';
  if (!input.categories.length || input.categories.some(category => !CATEGORIES.includes(category))) errors.categories = '카테고리를 하나 이상 선택해 주세요.';
  if (!TIERS.some(tier => tier.id === input.sizeTier)) errors.tier = '팔로워 규모를 선택해 주세요.';
  return errors;
}

export function parseBudget(raw: string): number {
  // Empty values, decimals and exponent notation are not silently converted.
  const value = raw.trim();
  return /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(value) ? Number(value.replaceAll(',', '')) : NaN;
}

export const hasKnownBudget = (creator: Creator) => creator.campaigns > 0 && creator.averageBudget > 0;

export function percentile(value: number, population: readonly number[]): number {
  if (population.length < 2) return 50;
  const less = population.filter(item => item < value).length;
  const equal = population.filter(item => item === value).length;
  return Math.min(100, Math.max(0, 100 * (less + Math.max(0, equal - 1) / 2) / (population.length - 1)));
}

function cohortFor(creator: Creator, all: readonly Creator[], method: Method) {
  if (method === 'simple') return { members: all, label: '전체 데이터', fallback: false };
  const tier = tierOf(creator.followers);
  const peer = all.filter(item => item.platform === creator.platform && tierOf(item.followers) === tier);
  if (peer.length >= MIN_COHORT_SIZE) return { members: peer, label: creator.platform + ' · ' + tierLabel(tier), fallback: false };
  const platform = all.filter(item => item.platform === creator.platform);
  if (platform.length >= MIN_COHORT_SIZE) return { members: platform, label: creator.platform + ' 전체 규모', fallback: true };
  return { members: all, label: '전체 데이터', fallback: true };
}

export function scoreCreator(creator: Creator, all: readonly Creator[], method: Method = 'cohort', weights: Weights = WEIGHTS): ScoredCreator {
  if (Object.values(weights).some(weight => !Number.isFinite(weight) || weight < 0) || Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 1) > 1e-9) throw new Error('가중치 합은 1이어야 합니다.');
  const cohort = cohortFor(creator, all, method);
  const engagement = percentile(creator.engagement, cohort.members.map(item => item.engagement));
  const views = percentile(creator.views, cohort.members.map(item => item.views));
  const rating = creator.rating === null ? 50 : (creator.rating - 1) / 4 * 100;
  const maxCampaigns = Math.max(1, ...all.map(item => item.campaigns));
  const experience = Math.log1p(creator.campaigns) / Math.log1p(maxCampaigns) * 100;
  const normalized = { engagement, views, rating, experience };
  const labels = { engagement: '참여율', views: '평균 조회수', rating: '광고주 평점', experience: '집행 경험' };
  const explanations = {
    engagement: cohort.label + ' ' + cohort.members.length + '명 내 상대 위치 ' + engagement.toFixed(1) + '/100',
    views: cohort.label + ' ' + cohort.members.length + '명 내 상대 위치 ' + views.toFixed(1) + '/100',
    rating: creator.rating === null ? '미평가 · 계산에만 중립 50/100 적용' : '관측 평점 ' + creator.rating.toFixed(1) + '/5 · 표본 수 미제공',
    experience: creator.campaigns + '건 · 건수 증가에 따른 가산 폭을 줄여 반영',
  };
  const components = (Object.keys(weights) as (keyof Weights)[]).map(key => ({ key, label: labels[key], normalized: normalized[key], weight: weights[key], points: normalized[key] * weights[key], explanation: explanations[key] }));
  return { creator, score: components.reduce((sum, component) => sum + component.points, 0), components, cohort: { label: cohort.label, size: cohort.members.length, fallback: cohort.fallback } };
}

export function sortMatches(items: readonly ScoredCreator[], sort: SortKey = 'recommended'): ScoredCreator[] {
  const value = (item: ScoredCreator) => sort === 'engagement' ? item.creator.engagement : sort === 'views' ? item.creator.views : sort === 'campaigns' ? item.creator.campaigns : sort === 'rating' ? item.creator.rating ?? -1 : item.score;
  return [...items].sort((a, b) => value(b) - value(a) || a.creator.id.localeCompare(b.creator.id, 'en'));
}

export function recommend(all: readonly Creator[], input: MatchInput, method: Method = 'cohort', weights: Weights = WEIGHTS): MatchResult {
  if (Object.keys(validateInput(input)).length) throw new Error('추천 조건을 확인해 주세요.');
  const category = all.filter(creator => input.categories.includes(creator.category));
  const selected = category.filter(creator => tierOf(creator.followers) === input.sizeTier);
  const known = selected.filter(hasKnownBudget);
  const eligible = known.filter(creator => creator.averageBudget <= input.budgetKRW);
  const needsQuote = selected.filter(creator => !hasKnownBudget(creator)).sort((a, b) => b.views - a.views || a.id.localeCompare(b.id, 'en'));
  const alternatives: Alternative[] = [];
  if (eligible.length === 0) {
    const minimum = Math.min(...known.map(creator => creator.averageBudget));
    if (Number.isFinite(minimum)) {
      alternatives.push({ label: '예산을 ' + moneyText(minimum) + '으로 변경', detail: '같은 카테고리·규모 유지 · ' + moneyText(minimum - input.budgetKRW) + ' 추가', count: known.filter(creator => creator.averageBudget <= minimum).length, input: { ...input, categories: [...input.categories], budgetKRW: minimum } });
    }
    for (const tier of TIERS.filter(tier => tier.id !== input.sizeTier)) {
      const count = category.filter(creator => tierOf(creator.followers) === tier.id && hasKnownBudget(creator) && creator.averageBudget <= input.budgetKRW).length;
      if (count) alternatives.push({ label: tier.label + ' 규모로 변경', detail: '예산·카테고리 유지 · ' + tier.range, count, input: { ...input, categories: [...input.categories], sizeTier: tier.id } });
    }
  }
  return { matched: sortMatches(eligible.map(creator => scoreCreator(creator, all, method, weights))), needsQuote, alternatives,
    summary: { all: all.length, category: category.length, categoryAndTier: selected.length, overBudget: known.length - eligible.length } };
}
