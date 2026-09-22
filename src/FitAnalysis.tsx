import type {Creator} from './domain';
import type {Brief} from './experience';
import {ContentDossier} from './ContentDossier';
export function FitAnalysis({creator,all,brief,onClose,onInquiry,hasWork}:{creator:Creator;all:Creator[];brief:Brief;onClose:()=>void;onInquiry:(proposal:string)=>void;hasWork:boolean}){
 return <ContentDossier creator={creator} all={all} brief={brief} onClose={onClose} onInquiry={onInquiry} hasWork={hasWork}/>;
}
