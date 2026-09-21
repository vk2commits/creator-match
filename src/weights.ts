import type { Weights } from './policy';
export const WEIGHT_FIELDS = [
  {key:'engagement',label:'참여율'}, {key:'views',label:'평균 조회수'},
  {key:'rating',label:'광고주 평점'}, {key:'experience',label:'집행 경험'},
] as const;
const keys=WEIGHT_FIELDS.map(x=>x.key);
export function validWeights(value: unknown): value is Weights {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const w=value as Record<string,unknown>;
  return Object.keys(w).length===4&&keys.every(k=>typeof w[k]==='number'&&Number.isFinite(w[k])&&Number(w[k])>=0&&Number(w[k])<=1)&&Math.abs(keys.reduce((s,k)=>s+Number(w[k]),0)-1)<1e-9;
}
export function redistribute(weights: Weights, key: keyof Weights, percent: number): Weights {
  if(!validWeights(weights)||!Number.isInteger(percent)||percent<0||percent>100)throw new Error('비중은 0~100의 정수여야 합니다.');
  const others=keys.filter(k=>k!==key), remaining=100-percent;
  const sum=others.reduce((s,k)=>s+weights[k],0);
  const shares=others.map((k,index)=>({key:k,index,exact:remaining*(sum>0?weights[k]/sum:1/others.length)}));
  const parts=Object.fromEntries(shares.map(x=>[x.key,Math.floor(x.exact)])) as Record<keyof Weights,number>;
  let remainder=remaining-shares.reduce((s,x)=>s+parts[x.key],0);
  for(const share of [...shares].sort((a,b)=>(b.exact-Math.floor(b.exact))-(a.exact-Math.floor(a.exact))||a.index-b.index)){
    if(remainder-- > 0)parts[share.key]++;
  }
  parts[key]=percent;
  return Object.fromEntries(keys.map(k=>[k,parts[k]/100])) as Weights;
}
