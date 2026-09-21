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
export const WEIGHTS = { engagement: 0.35, views: 0.35, rating: 0.20, experience: 0.10 } as const;
export type Weights = { [K in keyof typeof WEIGHTS]: number };
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
export const tierLabel = (tier: Tier) => TIERS.find(t => t.id === tier)!.label;
export const DEFAULT_INPUT = { budgetKRW: 2_000_000, categories: ['뷰티', '패션'] as Category[], sizeTier: 'micro' as Tier };
export const numberText = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
export const moneyText = (value: number) => numberText(value) + '원';

