import type {Brief} from './experience';
import type {CreatorContent} from './creatorContent';
export function AudiencePanel({data,brief,onInquiry}:{data:CreatorContent;brief:Brief;onInquiry:(text:string)=>void}){
 return <><h3 className="dossier-title">우리 고객과 시청자가 겹치나요?</h3><div className="audience-target"><span>이번 캠페인의 고객</span><strong>{brief.campaign?.targetCustomer||'아직 정하지 않았어요'}</strong></div>{data.audience?<div className="audience-bars">{data.audience.map(a=><div key={a.label}><span>{a.label}</span><div><i style={{width:a.share+'%'}}/></div><strong>{a.share}%</strong></div>)}<p>나이 구성만으로 직업·관심사·구매 가능성을 알 수는 없어요. 실제 타깃과의 접점은 최신 채널 인사이트로 확인하세요.</p></div>:<div className="dossier-empty"><p>등록된 오디언스 자료가 없어요. 문의할 때 연령·관심사 정보를 요청해 보세요.</p></div>}<button className="secondary-button" onClick={()=>onInquiry('타깃 고객과의 접점을 확인할 수 있도록 최근 오디언스 인사이트를 공유해 주실 수 있을까요?')}>확인 질문을 담아 문의 준비</button></>;
}
