import {cleanKeywords,CONTENT_LIBRARY} from './creatorContent';
import type {Campaign} from './campaign';
const vocabulary=[...new Set(CONTENT_LIBRARY.flatMap(d=>[...d.keywords,...d.posts.flatMap(p=>p.visualTags)]))];
export function suggestKeywords(text:string){
 const t=text.normalize('NFKC').toLowerCase();
 const found=vocabulary.filter(k=>t.includes(k));
 const related=[...(t.match(/틴트|메이크업|화장품/)?['발색','지속력','비교 리뷰']:[]),...(t.match(/직장|출근/)?['출근룩','출근 메이크업']:[]),...(t.match(/옷|패션|재킷/)?['스타일링','소재']:[])];
 return cleanKeywords([...found,...related]).slice(0,8);
}
export function searchDraft(text:string,campaign:Campaign):Campaign{
 const excludedTerms=vocabulary.filter(k=>new RegExp(k+'(?:\\s*(?:스타일|콘텐츠|분위기|크리에이터|건|것))?(?:은|는|을|를)?\\s*(?:제외|빼고)').test(text));
 const excluded=[...excludedTerms,...[...text.matchAll(/([\p{L}\p{N}#]+)(?:은|는|을|를)?\s*(?:제외|빼고)/gu)].map(m=>m[1].replace(/(?:은|는|을|를)$/,'')).filter(k=>!['스타일','콘텐츠','분위기','크리에이터','건','것'].includes(k))];
 const quoted=[...text.matchAll(/["“‘']([^"”’']+)["”’']/g)].map(m=>m[1]);
 const found=vocabulary.filter(k=>text.toLowerCase().includes(k)&&!excluded.some(x=>x.includes(k)));
 const include=cleanKeywords([...found,...quoted]).filter(k=>!cleanKeywords(excluded).includes(k));
 const platform=/인스타|instagram/i.test(text)?'인스타그램':/유튜브|youtube/i.test(text)?'유튜브':campaign.searchPlatform??'';
 const fallback=text.split(/[,\n.!?]/).filter(x=>!/(?:제외|빼고)/.test(x)).map(x=>x.replace(/(?:인스타그램|인스타|유튜브|instagram|youtube)/gi,'').replace(/(?:크리에이터|인플루언서)(?:를|가|는)?\s*(?:찾아줘|찾고 싶어요|찾아요)?/g,'').trim()).filter(Boolean);
 return {...campaign,searchText:text,searchPlatform:platform,includeKeywords:include.length?include:cleanKeywords(fallback),excludeKeywords:cleanKeywords(excluded)};
}
