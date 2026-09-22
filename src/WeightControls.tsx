import {useRef} from 'react';
import type {CSSProperties} from 'react';
import type {Weights} from './policy';
import {WEIGHT_FIELDS,redistribute} from './weights';

export function WeightControls({weights,onChange}:{weights:Weights;onChange:(weights:Weights)=>void}) {
  const anchor=useRef<{key:keyof Weights;weights:Weights}|null>(null);
  const begin=(key:keyof Weights)=>{anchor.current={key,weights};};
  const change=(key:keyof Weights,value:number)=>onChange(redistribute(anchor.current?.key===key?anchor.current.weights:weights,key,value));
  return <fieldset className="weight-controls"><legend>지표별 비중 <span>합계 100%</span></legend><p id="weight-help">하나를 바꾸면 나머지는 기존 비율에 맞춰 조정됩니다.</p>{WEIGHT_FIELDS.map(({key,label})=><div className="weight-control" data-metric={key} key={key} style={{'--weight-color':({engagement:'#24584a',views:'#6d57a2',rating:'#a2772e',experience:'#467496'} as const)[key],'--weight-fill':Math.round(weights[key]*100)+'%'} as CSSProperties}><label htmlFor={'weight-'+key}>{label}</label><input id={'weight-'+key} type="range" min={0} max={100} step={1} value={Math.round(weights[key]*100)} aria-describedby="weight-help" aria-valuetext={Math.round(weights[key]*100)+'%'} onFocus={()=>begin(key)} onPointerDown={()=>begin(key)} onBlur={()=>{anchor.current=null;}} onChange={e=>change(key,Number(e.target.value))}/><div><input type="number" min={0} max={100} step={1} aria-label={label+' 비중 숫자'} value={Math.round(weights[key]*100)} onFocus={()=>begin(key)} onBlur={()=>{anchor.current=null;}} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isInteger(n)&&n>=0&&n<=100)change(key,n);}}/><span>%</span></div></div>)}</fieldset>;
}
