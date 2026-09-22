import {useEffect,useRef} from 'react';
import type {ReactNode} from 'react';
import type {Creator} from './domain';
import {numberText} from './policy';
export function Icon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,ReactNode> = {
    send:<><path d="m3 3 18 9-18 9 4-9-4-9Z"/><path d="M7 12h14"/></>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    reaction:<><path d="M12 20S3 14.5 3 8.5a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1C21 14.5 12 20 12 20Z"/></>,
    views:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    history:<><rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 6V3h8v3M8 13l3 3 5-6"/></>,
    balance:<><path d="M4 5h16M4 12h16M4 19h16"/><circle cx="8" cy="5" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="19" r="2" fill="currentColor"/></>,
    bookmark:<path d="M6 3h12v18l-6-4-6 4V3Z"/>,
    arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,
    close:<path d="m6 6 12 12M6 18 18 6"/>,
    check:<path d="m5 12 4 4L19 6"/>,
    edit:<><path d="m4 16 12-12 4 4L8 20H4Z"/><path d="m13 7 4 4"/></>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    youtube:<><rect x="2" y="5" width="20" height="14" rx="5" fill="currentColor" stroke="none"/><path d="m10 9 5 3-5 3Z" fill="white" stroke="none"/></>,
    instagram:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.search}</svg>;
}
function PlatformBadge({platform}:{platform:Creator['platform']}) {return <span className={'platform-badge '+(platform==='유튜브'?'yt':'ig')} title={platform}><Icon name={platform==='유튜브'?'youtube':'instagram'} size={16}/><span className="sr-only">{platform}</span></span>;}
export function Identity({creator:c}:{creator:Creator}) {return <div className="creator-identity"><span className={'monogram tone-'+(Number(c.id.replace(/\D/g,''))%4)} aria-hidden="true">{c.name.slice(0,1)}</span><div><div className="creator-name"><strong>{c.name}</strong><PlatformBadge platform={c.platform}/></div><div className="creator-tags"><span className="category-tag">{c.category}</span><span>팔로워 {numberText(c.followers)}명</span></div></div></div>;}
export function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className={'modal '+(wide?'wide':'')} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}} aria-labelledby="modal-title"><div className="modal-header"><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}

export function RequiredMark(){return <span className="required-mark" aria-hidden="true"> *</span>;}
export function RequiredHint(){return <p className="required-hint"><RequiredMark/> 필수 입력</p>;}
