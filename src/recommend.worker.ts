import {recommend} from './domain';
import type {Creator,MatchInput} from './domain';
import type {Weights} from './policy';
self.onmessage=(event:MessageEvent<{data:Creator[];input:MatchInput;weights:Weights}>)=>{
  try{self.postMessage({result:recommend(event.data.data,event.data.input,'cohort',event.data.weights)});}
  catch{self.postMessage({error:'후보를 정리하지 못했어요. 다시 시도해 주세요.'});}
};
