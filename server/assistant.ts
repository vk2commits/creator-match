import type {Plugin,Connect} from 'vite';
import {loadEnv} from 'vite';
import {ASSISTANT_INSTRUCTIONS,assistantPrompt,parseAssistantResult} from '../src/assistant';
import type {AssistantMode} from '../src/assistant';

export function responseText(raw:unknown):string {
  const r=raw as {status?:string;output?:{content?:{type:string;text?:string}[]}[]};
  if(r?.status!=='completed')throw new Error('응답이 끝나지 않았습니다. 요청을 줄여 다시 시도해 주세요.');
  const contents=r.output?.flatMap(x=>x.content??[])??[];
  if(contents.some(c=>c.type==='refusal'))throw new Error('이 요청은 생성되지 않았습니다. 입력 내용을 수정해 주세요.');
  const text=contents.filter(c=>c.type==='output_text').map(c=>c.text??'').join('');
  if(!text)throw new Error('생성된 문안이 없습니다. 다시 시도해 주세요.');
  return text;
}
export function validAssistantInput(raw:unknown):raw is {mode:AssistantMode;context:string;request:string} {
  if(!raw||typeof raw!=='object')return false;
  const d=raw as Record<string,unknown>;
  return ['brief','outreach','analysis'].includes(d.mode as string)&&typeof d.context==='string'&&d.context.length<=16000&&typeof d.request==='string'&&d.request.trim().length>0&&d.request.length<=3000;
}
export function assistantPlugin():Plugin {
  let apiKey='';let model='gpt-4.1-mini';let busy=false;
  const middleware:Connect.NextHandleFunction=async(req,res,next)=>{
    const path=req.url?.split('?')[0];if(path!=='/api/assistant'&&path!=='/api/assistant/status')return next();
    const send=(status:number,body:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));};
    // This optional endpoint is for local review. No public, unauthenticated model proxy.
    if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host??''))return send(403,{error:'AI 연결은 로컬 실행에서 사용할 수 있습니다.'});
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,{error:'같은 작업실에서 다시 요청해 주세요.'});
    if(path==='/api/assistant/status'&&req.method==='GET')return send(200,{configured:!!apiKey});
    if(req.method!=='POST')return send(405,{error:'지원하지 않는 요청입니다.'});
    if(!apiKey)return send(503,{error:'AI가 아직 연결되지 않았습니다. 연결 안내를 확인해 주세요.'});
    if(busy)return send(429,{error:'이전 요청이 끝난 뒤 다시 생성해 주세요.'});
    if(!req.headers['content-type']?.includes('application/json'))return send(415,{error:'요청 형식을 확인해 주세요.'});
    let body='';
    try{
      for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>70000)return send(413,{error:'내용을 줄여 다시 시도해 주세요.'});}
      const input:unknown=JSON.parse(body);if(!validAssistantInput(input))return send(400,{error:'요청 내용을 확인해 주세요.'});
      busy=true;
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),45000);
      const disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
      try {
        const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model,store:false,max_output_tokens:2200,instructions:ASSISTANT_INSTRUCTIONS,input:assistantPrompt(input.mode,input.context,input.request),text:{format:{type:'json_schema',name:'marketer_assistant',strict:true,schema:{type:'object',properties:{text:{type:'string'},questions:{type:'array',items:{type:'string'}}},required:['text','questions'],additionalProperties:false}}}})});
        if(!response.ok)return send(response.status===429?429:502,{error:response.status===429?'AI 사용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.':'AI 연결에 실패했습니다. 키·사용 권한·모델 설정을 확인해 주세요.'});
        const result=parseAssistantResult(JSON.parse(responseText(await response.json())));send(200,result);
      }finally{clearTimeout(timer);res.off('close',disconnect);busy=false;}
    }catch(error){send(502,{error:error instanceof Error&&error.name==='AbortError'?'AI 응답이 지연되어 중단했습니다. 요청을 줄여 다시 시도해 주세요.':'응답을 확인하지 못했습니다. 다시 시도해 주세요.'});}
  };
  return {name:'local-marketer-assistant',configResolved(config){const env=loadEnv(config.mode,config.root,'');apiKey=process.env.OPENAI_API_KEY||env.OPENAI_API_KEY||'';model=process.env.OPENAI_MODEL||env.OPENAI_MODEL||model;},configureServer(server){server.middlewares.use(middleware);},configurePreviewServer(server){server.middlewares.use(middleware);}};
}
