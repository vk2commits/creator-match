import {CATEGORIES} from './policy';
import type {Category,Tier} from './policy';
import type {Goal} from './campaign';

export type BriefExtraction={
 product:string;targetCustomer?:string;creatorStyle?:string;requiredElements?:string;
 goal?:Goal;budget?:number;categories?:Category[];tier?:Tier;
};
/** Conservative local extraction. Only stated constraints become confirmed inputs. */
export function extractBrief(text:string):BriefExtraction{
 const lines=text.trim().split(/(?:[!?]\s*|\.(?=\s|$)|\n+)/).map(x=>x.trim()).filter(Boolean);
 const named=(labels:string)=>lines.map(line=>line.match(new RegExp(`^(?:${labels})\\s*(?:[:：]|은|는)\\s*(.+)$`))?.[1]?.trim()).find(Boolean);
 const target=named('타깃(?: 고객)?|대상(?: 고객)?|고객')??lines.map(line=>line.match(/^(.{2,100}?)(?:에게|을 대상으로|를 대상으로)\s/)?.[1]).find(Boolean);
 const budgetMatch=text.match(/(?:1명당|인당|한\s*명당)\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(만|천)?\s*원/);
 const budget=budgetMatch?Number(budgetMatch[1].replaceAll(',',''))*(budgetMatch[2]==='만'?10000:budgetMatch[2]==='천'?1000:1):undefined;
 const negated=(term:string)=>new RegExp(`${term}(?:\\s*(?:분야|크리에이터|스타일))?(?:은|는|을|를)?\\s*(?:제외|빼고|말고|원하지)`,'u').test(text);
 const categories=CATEGORIES.filter(c=>text.includes(c)&&!negated(c));
 const tier=/1만\s*[~–-]\s*10만/.test(text)?'micro':/10만\s*(?:명\s*)?(?:이상|넘)/.test(text)?'macro':/1만\s*(?:명\s*)?미만/.test(text)?'nano':undefined;
 const goal=named('목표');
 const goalText=goal??text;
 const detectedGoal=/구매|매출|판매/.test(goalText)?'sales':/댓글|반응|참여/.test(goalText)?'engagement':/알리|인지|소개|출시/.test(goalText)?'awareness':undefined;
 const explicitStyles=['자연스러운 일상','자연스러운','비교 리뷰','미니멀','화려한','차분한'].filter(k=>text.includes(k)&&!negated(k));
 const style=named('스타일|표현 방향|원하는 표현')??explicitStyles.filter(k=>!explicitStyles.some(other=>other!==k&&other.includes(k))).join(' · ');
 const required=named('필수(?: 노출)?(?: 요소)?|꼭 담을 내용|필수 내용');
 let product=named('제품|제품과 알리고 싶은 점')??lines.filter(line=>!/(?:^(?:타깃|대상|고객|목표|스타일|표현 방향|원하는 표현|필수|꼭 담을 내용|분야|카테고리|예산)\s*[:：은는]|1명당|인당|한\s*명당|총예산|전체 예산|팔로워|크리에이터를 찾|스타일이면)/.test(line)).join('. ');
 if(target&&product.startsWith(target))product=product.slice(target.length).replace(/^(?:에게|을 대상으로|를 대상으로)\s*/,'');
 if(!product){const first=lines[0]?.split(/[,，]\s*(?=1명당|인당|한\s*명당|예산|팔로워)/)[0]??'';if(/(?:소개|알리|출시)/.test(first)&&!/(?:예산|팔로워|크리에이터)/.test(first))product=first;}
 if(target&&product.startsWith(target))product=product.slice(target.length).replace(/^(?:에게|을 대상으로|를 대상으로)\s*/,'');
 return {product:product.slice(0,1500),targetCustomer:target?.slice(0,300),creatorStyle:style||undefined,requiredElements:required?.slice(0,500),goal:detectedGoal,budget,categories:categories.length?categories:undefined,tier};
}
