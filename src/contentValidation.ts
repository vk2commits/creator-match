import type {CommentEvidence,CreatorContent,CreatorPost} from './creatorContent';
import {normalizeWebUrl,validDate,validNumber} from './campaign';
const text=(v:unknown,max=5000):v is string=>typeof v==='string'&&v.length<=max;
const list=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=30&&v.every(x=>text(x,150));
function validComment(v:unknown):v is CommentEvidence{
 if(!v||typeof v!=='object')return false;const c=v as CommentEvidence;
 return text(c.text,8000)&&['positive','neutral','negative','unreviewed'].includes(c.sentiment)&&typeof c.productQuestion==='boolean'&&typeof c.purchaseIntent==='boolean';
}
export function validContentPost(v:unknown):v is CreatorPost{
 if(!v||typeof v!=='object')return false;const p=v as CreatorPost;
 return text(p.id,150)&&!!p.id&&text(p.title,180)&&!!p.title.trim()&&text(p.caption)&&text(p.date,10)&&validDate(p.date)&&['organic','ad'].includes(p.kind)&&text(p.format,80)&&list(p.visualTags)&&[p.views,p.likes,p.commentCount].every(x=>x===null||validNumber(x))&&(p.brand===undefined||text(p.brand,180))&&(p.url===undefined||(text(p.url,3000)&&!!normalizeWebUrl(p.url)))&&(p.image===undefined)&&Array.isArray(p.comments)&&p.comments.length<=50&&p.comments.every(validComment);
}
/** Only registered data uses this path; editorial fixtures are explicitly separate. */
export function readContentProfiles(value:unknown):CreatorContent[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();
 return value.flatMap(v=>{
  if(!v||typeof v!=='object'||v.source!=='user'||!/^C\d{4}$/.test(v.creatorId)||seen.has(v.creatorId)||!text(v.bio)||!text(v.style)||!list(v.keywords)||!text(v.sourceLabel)||!text(v.checkedAt,10)||!validDate(v.checkedAt)||!Array.isArray(v.posts)||v.posts.length>200||!v.posts.every(validContentPost)||new Set(v.posts.map((p:CreatorPost)=>p.id)).size!==v.posts.length)return [];
  seen.add(v.creatorId);
  return [{creatorId:v.creatorId,bio:v.bio,style:v.style,keywords:v.keywords,source:'user' as const,sourceLabel:v.sourceLabel,checkedAt:v.checkedAt,posts:v.posts.map((p:CreatorPost)=>({...p,url:p.url?normalizeWebUrl(p.url)!:undefined}))}];
 });
}
/** Keep edits and unreviewed text when the pasted list changes; never drop new comments. */
export function reconcileComments(raw:string,previous:CommentEvidence[]):CommentEvidence[]{
 return raw.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,50).map(text=>previous.find(c=>c.text===text)??{text,sentiment:'unreviewed',purchaseIntent:false,productQuestion:false});
}
