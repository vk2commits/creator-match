import {useEffect,useState} from 'react';
import {recommend} from './domain';
import type {Creator} from './domain';
import type {Brief} from './experience';
import {criteriaOf} from './experience';
type Result=ReturnType<typeof recommend>;
export function useRecommendation(data:Creator[]|null,brief:Brief|null,retry:number){
  const [state,setState]=useState<{data:Creator[];brief:Brief;retry:number;result:Result|null;error:string}|null>(null);
  useEffect(()=>{
    if(!data||!brief)return;
    let worker:Worker;
    try{worker=new Worker(new URL('./recommend.worker.ts',import.meta.url),{type:'module'});}
    catch{setState({data,brief,retry,result:null,error:'후보 계산을 시작하지 못했어요. 다시 시도해 주세요.'});return;}
    worker.onmessage=e=>setState({data,brief,retry,result:e.data.result??null,error:e.data.error??''});
    worker.onerror=()=>setState({data,brief,retry,result:null,error:'후보를 정리하지 못했어요. 다시 시도해 주세요.'});
    worker.postMessage({data,input:brief.input,weights:criteriaOf(brief).weights});
    return()=>worker.terminate();
  },[data,brief,retry]);
  const current=state?.data===data&&state?.brief===brief&&state?.retry===retry;
  return {result:current?state!.result:null,error:current?state!.error:'',pending:!!data&&!!brief&&!current};
}
