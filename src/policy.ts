export const CATEGORIES = ['뷰티', '식품', '패션', '피트니스', '여행', '아웃도어', '라이프스타일', '테크', '게임', '교육'] as const;
export type Category = typeof CATEGORIES[number];
export const PLATFORMS = ['유튜브', '인스타그램'] as const;
export type Platform = typeof PLATFORMS[number];
export const TIERS = [
  { id: 'nano', label: '나노', range: '1만 미만', min: 0, max: 10_000 },
  { id: 'micro', label: '마이크로', range: '1만–10만 미만', min: 10_000, max: 100_000 },
  { id: 'macro', label: '매크로', range: '10만 이상', min: 100_000, max: Infinity },
] as const;
export type Tier = typeof TIERS[number]['id'];
export const WEIGHTS = { engagement: 0.25, views: 0.25, rating: 0.25, experience: 0.25 } as const;
export type Weights = { -readonly [K in keyof typeof WEIGHTS]: number };
export const PRIORITIES = [
  { id: 'response', label: '참여율 우선', title: '반응이 활발한 채널', description: '참여율을 우선해 콘텐츠에 대한 반응을 살펴봐요.', icon: 'reaction', weights: { engagement: .5, views: .25, rating: .15, experience: .1 } },
  { id: 'reach', label: '조회수 우선', title: '평균 조회수가 높은 채널', description: '같은 플랫폼·규모에서 평균 조회수가 높은 후보를 먼저 봐요.', icon: 'views', weights: { engagement: .2, views: .55, rating: .15, experience: .1 } },
  { id: 'history', label: '협업 이력 우선', title: '협업 경험이 많은 채널', description: '광고 집행 경험과 광고주 평점을 함께 살펴봐요.', icon: 'history', weights: { engagement: .2, views: .2, rating: .3, experience: .3 } },
  { id: 'balanced', label: '균등 비교', title: '아직 정하지 않았어요', description: '아직 우선순위가 없다면 모든 지표를 같은 비중으로 봐요.', icon: 'balance', weights: WEIGHTS },
] as const;
export type Priority = typeof PRIORITIES[number]['id'];
export const priorityOf = (id: Priority) => PRIORITIES.find(p => p.id === id)!;
export const MIN_COHORT_SIZE = 10;
export const SOURCE_SHA256 = '6f139b1a8cac4a7aa0d8034bde2df16ae7c06896ee820eec16ddafbcf2738b8c';
export const SORT_OPTIONS = [
  { value: 'recommended', label: '추천순' },
  { value: 'engagement', label: '참여율 높은순' },
  { value: 'views', label: '평균 조회수 높은순' },
  { value: 'campaigns', label: '집행 건수 많은순' },
  { value: 'rating', label: '평점 높은순' },
] as const;
export type SortKey = typeof SORT_OPTIONS[number]['value'];
export const tierOf = (followers: number): Tier => followers < 10_000 ? 'nano' : followers < 100_000 ? 'micro' : 'macro';
export const tierRange = (tier: Tier) => TIERS.find(t => t.id === tier)!.range;
export const tierLabel = (tier: Tier) => TIERS.find(t => t.id === tier)!.label;
export const DEFAULT_INPUT = { budgetKRW: 2_000_000, categories: ['뷰티', '패션'] as Category[], sizeTier: 'micro' as Tier };
export const numberText = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
export const moneyText = (value: number) => numberText(value) + '원';
