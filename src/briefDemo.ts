import {DEFAULT_INPUT} from './policy';
import {EMPTY_CAMPAIGN,GOALS} from './campaign';
import type {Brief} from './experience';
import {extractBrief} from './briefIntake';

export const BRIEF_EXAMPLE='출근 준비가 바쁜 직장인에게 오래가는 립틴트를 알리고 싶어요. 뷰티·패션 크리에이터를 찾고, 1명당 200만원까지 생각하고 있어요. 팔로워는 1만~10만명 정도요. 스타일: 자연스러운 일상. 꼭 담을 내용: 자연광 발색과 식사 후 지속력.';
/** Legacy proposal format; the setup form leaves unspecified required fields empty. */
export function briefDemo(text:string,initial?:Brief){
 const base:Brief=initial??{campaign:{...EMPTY_CAMPAIGN},input:{...DEFAULT_INPUT,categories:[...DEFAULT_INPUT.categories]},priority:'reach'};
 const x=extractBrief(text),goal=x.goal??base.campaign?.goal??'awareness';
 return {brief:{...base,campaign:{...base.campaign,name:base.campaign?.name||'새 제품 크리에이터 협업',product:x.product,goal,targetCustomer:x.targetCustomer??base.campaign?.targetCustomer??'',creatorStyle:x.creatorStyle??base.campaign?.creatorStyle,requiredElements:x.requiredElements??base.campaign?.requiredElements},priority:GOALS.find(g=>g.id===goal)!.priority,customWeights:undefined,input:{budgetKRW:x.budget??base.input.budgetKRW,categories:x.categories??[...base.input.categories],sizeTier:x.tier??base.input.sizeTier}} as Brief,
 suggested:[...(x.budget===undefined?['1명당 예산']:[]),...(!x.categories?['분야']:[]),...(!x.tier?['팔로워 수']:[])]};
}
