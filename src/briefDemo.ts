import {suggestKeywords} from './discovery';
import {CATEGORIES,DEFAULT_INPUT} from './policy';
import {EMPTY_CAMPAIGN,GOALS} from './campaign';
import type {Brief} from './experience';

export const BRIEF_EXAMPLE='가을 립틴트 신제품을 알리고 싶어요. 뷰티·패션 크리에이터를 찾고, 1명당 200만원까지 생각하고 있어요. 팔로워는 1만~10만명 정도요.';
// Deterministic prototype only. Explicit phrases are extracted; unspecified
// conditions remain editable starting suggestions, never reported as facts.
export function briefDemo(text:string,initial?:Brief){
  const base:Brief=initial??{campaign:{...EMPTY_CAMPAIGN},input:{...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]},priority:'reach'};
  const compact=text.replaceAll(',','');
  const budget=compact.match(/(?:1명당|인당|한\s*명당)\s*(\d+)\s*(만)?원/);
  const amount=budget?Number(budget[1])*(budget[2]?10000:1):null;
  const product=text.trim().split(/(?<=[.!?])\s+/).filter(line=>!/(?:1명당|인당|한\s*명당|팔로워|크리에이터를 찾)/.test(line)).join(' ')||text.trim();
  const categories=CATEGORIES.filter(c=>text.includes(c));
  const goal=/구매|매출|판매/.test(text)?'sales':/댓글|반응|참여/.test(text)?'engagement':'awareness';
  const range=/1만\s*[~–-]\s*10만/.test(text)?'micro':/10만\s*(이상|넘)/.test(text)?'macro':/1만\s*미만/.test(text)?'nano':null;
  return {brief:{...base,campaign:{...base.campaign,name:base.campaign?.name||'새 제품 크리에이터 협업',product:product.slice(0,1500),goal,includeKeywords:[],excludeKeywords:[],creatorStyle:suggestKeywords(text).filter(k=>['미니멀','화려한','비교 리뷰','차분한'].includes(k)).join(' · '),targetCustomer:text.match(/(?:타깃|대상|고객)[:：은는\s]+([^.!?\n]+)/)?.[1]?.slice(0,300)||base.campaign?.targetCustomer||''},priority:GOALS.find(g=>g.id===goal)!.priority,customWeights:undefined,input:{budgetKRW:amount&&Number.isSafeInteger(amount)?amount:base.input.budgetKRW,categories:categories.length?categories:[...base.input.categories],sizeTier:range??base.input.sizeTier}} as Brief,
    suggested:[...(!budget?['1명당 예산']:[]),...(!categories.length?['분야']:[]),...(!range?['팔로워 수']:[])]};
}
