import type {Brief} from './experience';
import {EMPTY_CAMPAIGN,GOALS} from './campaign';
import type {Campaign,Goal} from './campaign';
import {numberText} from './policy';
import type {Category,Tier,Priority,Weights} from './policy';
import {parseBudget,validateInput} from './domain';
import {validWeights} from './weights';
import {extractBrief} from './briefIntake';
export type SetupValues={campaign:Campaign;budget:string;categories:Category[];tier:Tier|'';priority:Priority;customWeights?:Weights;priorityChosen:boolean;nameChosen:boolean;goalConfirmed:boolean;extracted:string[]};
export type SetupErrors=Partial<Record<'name'|'product'|'budget'|'categories'|'tier'|'weights',string>>;
export function newSetup(initial?:Brief):SetupValues{
 return {campaign:{...EMPTY_CAMPAIGN,...initial?.campaign},budget:initial?numberText(initial.input.budgetKRW):'',categories:[...(initial?.input.categories??[])],tier:initial?.input.sizeTier??'',priority:initial?.priority??'reach',customWeights:initial?.customWeights?{...initial.customWeights}:undefined,priorityChosen:!!initial,nameChosen:!!initial,goalConfirmed:!!initial,extracted:[]};
}
export function setupFromText(text:string,current:SetupValues):SetupValues{
 const x=extractBrief(text),goal=x.goal??current.campaign.goal;
 const campaign={...current.campaign,product:x.product||current.campaign.product,goal,targetCustomer:x.targetCustomer??current.campaign.targetCustomer,creatorStyle:x.creatorStyle??current.campaign.creatorStyle,requiredElements:x.requiredElements??current.campaign.requiredElements};
 if(!current.nameChosen&&x.product)campaign.name=x.product.replace(/(?:을|를)?\s*(?:알리고|소개하고)\s*싶(?:어요|습니다).*$/,'').trim().slice(0,26)+' 캠페인';
 const extracted=[['제품',x.product],['고객',x.targetCustomer],['목표',x.goal],['예산',x.budget],['분야',x.categories],['팔로워 수',x.tier],['표현 방향',x.creatorStyle],['필수 요소',x.requiredElements]].filter(([,v])=>v!==undefined&&v!=='').map(([label])=>String(label));
 return {...current,campaign,budget:x.budget===undefined?current.budget:numberText(x.budget),categories:x.categories??current.categories,tier:x.tier??current.tier,priority:current.priorityChosen?current.priority:GOALS.find(g=>g.id===goal)!.priority,goalConfirmed:current.goalConfirmed||!!x.goal,extracted};
}
export function withSetupGoal(current:SetupValues,goal:Goal):SetupValues{
 return {...current,campaign:{...current.campaign,goal},goalConfirmed:true,priority:current.priorityChosen?current.priority:GOALS.find(g=>g.id===goal)!.priority};
}
export function setupErrors(value:SetupValues):SetupErrors{
 const errors:SetupErrors=validateInput({budgetKRW:parseBudget(value.budget),categories:value.categories,sizeTier:value.tier as Tier});
 if(!value.campaign.name.trim())errors.name='캠페인 이름을 입력해 주세요.';
 if(!value.campaign.product.trim())errors.product='소개할 제품과 알리고 싶은 점을 입력해 주세요.';
 if(value.customWeights&&!validWeights(value.customWeights))errors.weights='네 지표의 비중 합계를 100%로 맞춰 주세요.';
 return errors;
}
export function finishSetup(value:SetupValues):Brief{
 if(Object.keys(setupErrors(value)).length)throw new Error('캠페인 입력을 확인해 주세요.');
 return {campaign:{...value.campaign,name:value.campaign.name.trim(),product:value.campaign.product.trim(),targetCustomer:value.campaign.targetCustomer?.trim()},input:{budgetKRW:parseBudget(value.budget),categories:[...value.categories],sizeTier:value.tier as Tier},priority:value.priority,customWeights:value.customWeights?{...value.customWeights}:undefined};
}
