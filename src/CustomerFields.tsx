import type {Campaign,CustomerNeed} from './campaign';
import {CUSTOMER_NEEDS} from './channelAnalysis';

export function CustomerFields({value,onChange}:{value:Campaign;onChange:(value:Campaign)=>void}){
  return <fieldset className="customer-fields"><legend>어떤 고객에게 소개하나요? <span>선택 입력</span></legend>
    <label className="field-label">타깃 고객<input maxLength={300} value={value.targetCustomer??''} placeholder="예: 출근 전에 빠르게 메이크업하는 20~30대 직장인" onChange={e=>onChange({...value,targetCustomer:e.target.value})}/></label>
    <label className="field-label">고객이 제품을 고를 때 중요하게 보는 것<select value={value.customerNeed??''} onChange={e=>onChange({...value,customerNeed:(e.target.value||undefined) as CustomerNeed|undefined})}><option value="">아직 정하지 않았어요</option>{CUSTOMER_NEEDS.map(n=><option key={n.id} value={n.id}>{n.label} · {n.detail}</option>)}</select></label>
    <p>후보 상세에서 우리 고객에게 맞는 콘텐츠 방향을 함께 검토할 수 있어요.</p>
  </fieldset>;
}
