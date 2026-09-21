import { validateInput } from './domain';
import type { Brief } from './experience';
import { PRIORITIES } from './policy';

export const briefSchema = {
  type:'object', additionalProperties:false,
  properties:{
    budgetKRW:{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER},
    categories:{type:'array',minItems:1,items:{type:'string',enum:['뷰티','식품','패션','피트니스','여행','아웃도어','라이프스타일','테크','게임','교육']}},
    sizeTier:{type:'string',enum:['nano','micro','macro']},
    priority:{type:'string',enum:PRIORITIES.map(p=>p.id)},
  }, required:['budgetKRW','categories','sizeTier','priority'],
};
export function parseToolBrief(value:unknown):Brief {
  if(!value || typeof value!=='object') throw new Error('캠페인 조건이 필요합니다.');
  const v=value as Record<string,unknown>;
  if(!Array.isArray(v.categories) || !PRIORITIES.some(p=>p.id===v.priority))throw new Error('카테고리와 추천 기준을 확인해 주세요.');
  const input={budgetKRW:v.budgetKRW,categories:v.categories,sizeTier:v.sizeTier} as Brief['input'];
  if(Object.keys(validateInput(input)).length)throw new Error('예산·분야·팔로워 조건을 확인해 주세요.');
  return {input:{...input,categories:[...new Set(input.categories)]},priority:v.priority as Brief['priority']};
}
export type ModelTool = {name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
export function modelContext():{registerTool:(tool:ModelTool,options:{signal:AbortSignal})=>void|Promise<void>}|undefined {
  return (document as unknown as {modelContext?:{registerTool:(tool:ModelTool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
}

