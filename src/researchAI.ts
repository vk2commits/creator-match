export type ResearchTask='search'|'creator';
export type ResearchResult={summary:string;keywords:string[];excludeKeywords:string[];questions:string[];evidenceIds?:string[]};
export function parseResearchResult(value:unknown):ResearchResult{
 if(!value||typeof value!=='object')throw new Error('분석 형식을 확인하지 못했어요. 다시 시도해 주세요.');
 const v=value as ResearchResult;
 if(typeof v.summary!=='string'||!v.summary.trim()||v.summary.length>10000||!['keywords','excludeKeywords','questions'].every(k=>Array.isArray(v[k as keyof ResearchResult])&&(v[k as 'keywords'] as string[]).length<=20&&(v[k as 'keywords'] as string[]).every(x=>typeof x==='string'&&x.length<=500)))throw new Error('분석 형식을 확인하지 못했어요. 다시 시도해 주세요.');
 if(v.evidenceIds!==undefined&&(!Array.isArray(v.evidenceIds)||v.evidenceIds.length>20||v.evidenceIds.some(x=>typeof x!=='string'||x.length>150)))throw new Error('분석 근거 형식을 확인해 주세요.');
 return v;
}
export async function requestResearch(input:{task:ResearchTask;text:string;context:string;image?:string},signal?:AbortSignal):Promise<ResearchResult|null>{
 let configured=false;
 try{const status=await fetch(import.meta.env.BASE_URL+'api/assistant/status',{signal});if(status.ok)configured=!!(await status.json()).configured;}catch(err){if(signal?.aborted)throw err;return null;}
 if(!configured)return null;
 const response=await fetch(import.meta.env.BASE_URL+'api/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal});
 const result=await response.json();if(!response.ok)throw new Error(result.error??'분석을 완료하지 못했어요. 다시 시도해 주세요.');return parseResearchResult(result);
}
