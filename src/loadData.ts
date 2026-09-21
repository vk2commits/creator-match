import { parseCreators } from './domain';
export async function loadCreators(fetcher: typeof fetch = fetch, signal?: AbortSignal) {
  const response = await fetcher(import.meta.env.BASE_URL + 'data/dummy_creators.csv', { signal });
  if (!response.ok) throw new Error('데이터 요청에 실패했습니다. 연결 상태를 확인하고 다시 시도해 주세요.');
  return parseCreators(await response.text());
}

