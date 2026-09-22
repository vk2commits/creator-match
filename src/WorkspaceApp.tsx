import {useCallback,useEffect,useState} from 'react';
import App from './App';
import {STORAGE_KEY} from './experience';
import type {SavedSession} from './experience';
import {WORKSPACES_KEY,newSpace,readBook,saveCampaign} from './workspaces';

export default function WorkspaceApp(){
  const ephemeral=new URLSearchParams(location.search).has('demo');
  const [book,setBook]=useState(()=>{try{return readBook((ephemeral?sessionStorage:localStorage).getItem(WORKSPACES_KEY),ephemeral?null:localStorage.getItem(STORAGE_KEY));}catch{return readBook(null);}});
  const [error,setError]=useState(false);
  useEffect(()=>{try{(ephemeral?sessionStorage:localStorage).setItem(WORKSPACES_KEY,JSON.stringify(book));setError(false);}catch{setError(true);}},[book,ephemeral]);
  const id=book.activeId,active=book.campaigns.find(c=>c.id===id)!;
  const update=useCallback((session:SavedSession)=>setBook(b=>{
    const before=b.campaigns.find(c=>c.id===id)?.session;
    return JSON.stringify(before)===JSON.stringify(session)?b:saveCampaign(b,id,session);
  }),[id]);
  const add=()=>{const c=newSpace();history.replaceState(null,'',location.pathname+location.search);setBook(b=>({...b,activeId:c.id,campaigns:[...b.campaigns,c]}));};
  const nav=<div className="campaign-switcher"><label htmlFor="active-campaign">내 캠페인 <span>{book.campaigns.length}</span></label><select aria-label="내 캠페인" id="active-campaign" value={id} onChange={e=>{history.replaceState(null,'',location.pathname+location.search);setBook(b=>({...b,activeId:e.target.value}));}}>{book.campaigns.map((c,i)=><option key={c.id} value={c.id}>{c.session?.brief.campaign?.name||`새 캠페인 ${i+1}`}</option>)}</select><button onClick={add} className="new-campaign-button">+ 새 캠페인</button>{error&&<p role="alert">브라우저 저장 공간을 확인해 주세요. 현재 작업은 이 화면에 유지됩니다.</p>}</div>;
  return <App key={id} initialSession={active.session} onSessionChange={update} campaignNav={nav}/>;
}
