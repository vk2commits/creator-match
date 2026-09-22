import {readSession} from './experience';
import type {SavedSession} from './experience';

export const WORKSPACES_KEY='creator-match-campaigns-v1';
export type CampaignSpace={id:string;createdAt:string;session:SavedSession|null};
export type CampaignBook={version:1;activeId:string;campaigns:CampaignSpace[]};
export function newSpace(id=crypto.randomUUID()):CampaignSpace{return {id,createdAt:new Date().toISOString(),session:null};}
export function readBook(raw:string|null,legacy:string|null=null):CampaignBook{
  try{
    const value=JSON.parse(raw??'null');
    if(value?.version===1&&Array.isArray(value.campaigns)){
      const ids=new Set<string>();
      const campaigns=value.campaigns.flatMap((x:CampaignSpace)=>{
        if(!x||typeof x.id!=='string'||ids.has(x.id)||typeof x.createdAt!=='string')return [];
        const session=x.session===null?null:readSession(JSON.stringify(x.session));
        if(x.session!==null&&!session)return [];
        ids.add(x.id);return [{id:x.id,createdAt:x.createdAt,session}];
      });
      if(campaigns.length)return {version:1,activeId:ids.has(value.activeId)?value.activeId:campaigns[0].id,campaigns};
    }
  }catch{/* Fall back to the original single campaign without deleting it. */}
  const first=newSpace();first.session=readSession(legacy);
  return {version:1,activeId:first.id,campaigns:[first]};
}
export function saveCampaign(book:CampaignBook,id:string,session:SavedSession):CampaignBook{
  return {...book,campaigns:book.campaigns.map(c=>c.id===id?{...c,session}:c)};
}
