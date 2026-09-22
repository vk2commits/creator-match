import {readContentProfiles,validContentPost} from './contentValidation';
import type {Creator} from './domain';
import type {Brief} from './experience';
import {campaignOf} from './campaign';
import {numberText} from './policy';

export type CommentEvidence={text:string;sentiment:'positive'|'neutral'|'negative'|'unreviewed';purchaseIntent:boolean;productQuestion:boolean};
export type CreatorPost={id:string;title:string;caption:string;date:string;kind:'organic'|'ad';brand?:string;url?:string;format:string;image?:string;visualTags:string[];views:number|null;likes:number|null;commentCount:number|null;comments:CommentEvidence[]};
export type CreatorContent={creatorId:string;bio:string;keywords:string[];style:string;avatar?:string;source:'illustrative'|'user';sourceLabel:string;checkedAt:string;audience?:{label:string;share:number}[];posts:CreatorPost[]};
const comment=(text:string,sentiment:CommentEvidence['sentiment'],purchaseIntent=false,productQuestion=false):CommentEvidence=>({text,sentiment,purchaseIntent,productQuestion});
const fashion='/media/creator-fashion.png',beauty='/media/creator-beauty.png';
const outfitComments=[comment('출근할 때 따라 입기 좋겠어요','positive'),comment('가방은 어디 제품인가요?','neutral',false,true),comment('이 조합 그대로 사고 싶어요','positive',true),comment('제 체형에는 기장이 너무 길 것 같아요','negative'),comment('재킷 소재가 뭔가요?','neutral',false,true),comment('색 조합이 차분해서 좋아요','positive')];
const beautyComments=[comment('자연광 발색까지 보여줘서 도움 됐어요','positive'),comment('마스크에 묻어나는 편인가요?','neutral',false,true),comment('가격 보고 구매해보고 싶어요','positive',true),comment('입술이 건조해 보이는 게 아쉬워요','negative'),comment('웜톤에 어떤 색 추천하시나요?','neutral',false,true),comment('지속력은 몇 시간 정도인가요?','neutral',false,true),comment('다음 할인 때 사려고요','positive',true),comment('색이 예쁘네요','positive')];
const p=(id:string,title:string,caption:string,kind:CreatorPost['kind'],views:number,image:string|undefined,extra:Partial<CreatorPost>={}):CreatorPost=>({id,title,caption,kind,views,image,date:'2026-09-10',format:'릴스',visualTags:[],likes:Math.round(views*.04),commentCount:80,comments:[],...extra});
// Explicit editorial fixtures. These are not collected social accounts or observations.
export const CONTENT_LIBRARY:CreatorContent[]=[
 {creatorId:'C0077',bio:'매일 입기 좋은 출근룩과 계절별 옷장 이야기',keywords:['출근룩','직장인','미니멀','데일리룩','가을','스타일링'],style:'일상 장면에서 제품을 자연스럽게 보여주는 스타일',avatar:fashion,source:'illustrative',sourceLabel:'별도 구성한 콘텐츠·댓글 예시 / AI 생성 이미지',checkedAt:'2026-09-22',audience:[{label:'18–24세',share:22},{label:'25–34세',share:56},{label:'35세 이상',share:22}],posts:[p('77-1','일주일 출근룩, 재킷 하나로 다르게','바쁜 아침에 고민을 줄이는 미니멀 출근룩. 셔츠와 재킷으로 가을 스타일링.', 'organic',42000,fashion,{visualTags:['차분한','미니멀','자연광','뉴트럴'],comments:outfitComments,date:'2026-09-15'}),p('77-2','출근부터 약속까지, 가을 가방','라운드데이 가방을 일주일 출근룩에 매치했어요. 수납과 무게도 확인해요. #광고','ad',31000,fashion,{brand:'라운드데이',visualTags:['미니멀','도시','뉴트럴'],comments:outfitComments,date:'2026-09-08'}),p('77-3','옷 색에 맞춰 고르는 립 컬러','모브노트 틴트와 베이지 룩. 스타일링 마지막에 얼굴에 색을 더해요. #광고','ad',28000,beauty,{brand:'모브노트',visualTags:['따뜻한','뉴트럴','자연광'],comments:[...outfitComments.slice(0,3),comment('실제 발색도 자세히 보고 싶어요','neutral',false,true)],date:'2026-08-26'})]},
 {creatorId:'C0180',bio:'매일 쓰는 화장품을 직접 발라보고 비교하는 뷰티 기록',keywords:['뷰티','립틴트','발색','지속력','비교 리뷰','출근 메이크업'],style:'사용 과정과 색상 차이를 가까이 보여주는 비교 리뷰',avatar:beauty,source:'illustrative',sourceLabel:'별도 구성한 콘텐츠·댓글 예시 / AI 생성 이미지',checkedAt:'2026-09-22',audience:[{label:'18–24세',share:31},{label:'25–34세',share:48},{label:'35세 이상',share:21}],posts:[p('180-1','출근 전 5분 메이크업','바쁜 아침, 립틴트 하나로 완성하는 출근 메이크업. 자연광 발색 비교.','organic',12000,beauty,{visualTags:['따뜻한','자연광','클로즈업'],comments:beautyComments,date:'2026-09-17'}),p('180-2','틴트 3색, 직접 발라봤어요','컬러룸 신제품의 발색과 묻어남을 확인했어요. #광고','ad',10500,beauty,{brand:'컬러룸',visualTags:['클로즈업','자연광','따뜻한'],comments:beautyComments,date:'2026-09-09'}),p('180-3','오후에도 촉촉한 립 조합','오브밀 립밤을 립틴트와 같이 써봤어요. 사용감과 보습감 리뷰. #광고','ad',8600,beauty,{brand:'오브밀',visualTags:['따뜻한','클로즈업'],comments:beautyComments.slice(0,5),date:'2026-08-21'})]},
 {creatorId:'C0066',bio:'가격과 소재를 비교하며 오래 입을 옷을 고릅니다',keywords:['패션','비교 리뷰','소재','가성비','미니멀','직장인'],style:'구매 전에 알아둘 장단점을 길게 설명하는 리뷰',source:'illustrative',sourceLabel:'별도 구성한 콘텐츠·댓글 예시',checkedAt:'2026-09-22',posts:[p('66-1','가을 재킷 세 벌 비교','재킷 소재와 핏, 관리 방법까지 비교 리뷰.','organic',18000,undefined,{format:'영상',visualTags:['차분한','미니멀'],comments:[comment('소재 차이를 이해했어요','positive')]}),p('66-2','매일 입는 셔츠의 조건','스틸데이 셔츠의 비침과 구김을 확인했어요. #광고','ad',7200,undefined,{brand:'스틸데이',format:'영상',comments:[comment('세탁 후에도 괜찮나요?','neutral',false,true),comment('가격이 조금 부담돼요','negative'),comment('설명이 자세하네요','positive')]})]},
 {creatorId:'C0155',bio:'신제품 메이크업을 화사하고 경쾌하게 소개합니다',keywords:['뷰티','메이크업','신제품','화려한','파티','발색'],style:'색감과 완성된 메이크업을 빠르게 보여주는 스타일',source:'illustrative',sourceLabel:'별도 구성한 콘텐츠·댓글 예시',checkedAt:'2026-09-22',audience:[{label:'18–24세',share:65},{label:'25–34세',share:25},{label:'35세 이상',share:10}],posts:[p('155-1','주말을 위한 글리터 메이크업','화려한 포인트와 선명한 색감의 주말 메이크업.','organic',26000,undefined,{format:'쇼츠',visualTags:['화려한','선명한','스튜디오'],comments:[comment('메이크업이 너무 예뻐요','positive'),comment('평소에는 부담스러울 것 같아요','negative')]}),p('155-2','이번 시즌 포인트 컬러','벨벳온 컬러 팔레트로 파티 메이크업. #광고','ad',9300,undefined,{brand:'벨벳온',format:'쇼츠',visualTags:['화려한','선명한'],comments:[comment('색이 예뻐요','positive'),comment('어디에 바르는 건가요?','neutral',false,true),comment('오늘 룩 멋져요','positive')]})]},
 {creatorId:'C0036',bio:'처음 시작하는 미니멀 옷장과 데일리 스타일 기록',keywords:['미니멀','데일리룩','옷장','가을'],style:'생활 속 착장을 담는 짧은 일상 콘텐츠',source:'illustrative',sourceLabel:'별도 구성한 콘텐츠·댓글 예시',checkedAt:'2026-09-22',posts:[p('36-1','가을 옷장 정리하기','출근할 때 자주 입는 옷만 남겨보는 미니멀 옷장.','organic',16000,undefined,{format:'쇼츠',visualTags:['미니멀','따뜻한'],comments:[comment('옷장 정리 팁 좋아요','positive')]})]},
];
export const contentFor=(id:string,library:CreatorContent[]=getContentLibrary())=>library.find(x=>x.creatorId===id);
export const normalizeKeyword=(text:string)=>text.normalize('NFKC').trim().replace(/^#+/,'').toLocaleLowerCase();
export const cleanKeywords=(values:string[])=>[...new Set(values.map(normalizeKeyword).filter(Boolean))].slice(0,20);
export function searchableText(c:Creator,library=getContentLibrary()){const d=contentFor(c.id,library);return [c.name,c.platform,c.category,d?.bio,...(d?.keywords??[]),...(d?.posts.flatMap(p=>[p.title,p.caption,p.brand??'',...p.visualTags])??[])].join(' ').normalize('NFKC').toLocaleLowerCase();}
export function keywordMatches(c:Creator,include:string[],exclude:string[],library=getContentLibrary()){const text=searchableText(c,library);return (!include.length||include.some(k=>text.includes(normalizeKeyword(k))))&&!exclude.some(k=>text.includes(normalizeKeyword(k)));}
export type KeywordEvidence={keyword:string;source:'콘텐츠'|'소개'|'채널 정보';excerpt:string;postId?:string};
export function matchEvidence(c:Creator,keywords:string[],library=getContentLibrary()):KeywordEvidence[]{
 const d=contentFor(c.id,library);
 return cleanKeywords(keywords).flatMap((keyword):KeywordEvidence[]=>{
  const post=d?.posts.find(p=>normalizeKeyword([p.title,p.caption,p.brand??'',...p.visualTags].join(' ')).includes(keyword));
  if(post)return [{keyword,source:'콘텐츠',excerpt:post.title,postId:post.id}];
  if(d&&normalizeKeyword([d.bio,d.style,...d.keywords].join(' ')).includes(keyword))return [{keyword,source:'소개',excerpt:d.bio||d.style}];
  const field=[c.name,c.platform,c.category].find(value=>normalizeKeyword(value).includes(keyword));
  return field?[{keyword,source:'채널 정보',excerpt:field}]:[];
 });
}
export function contentStats(posts:CreatorPost[]){
 const avg=(items:CreatorPost[])=>{const known=items.filter(p=>p.views!==null);return known.length?Math.round(known.reduce((s,p)=>s+p.views!,0)/known.length):null;};
 const ads=posts.filter(p=>p.kind==='ad'),organic=posts.filter(p=>p.kind==='organic'),comments=ads.flatMap(p=>p.comments).filter(c=>c.sentiment!=='unreviewed');
 return {adCount:ads.length,organicCount:organic.length,adViewCount:ads.filter(p=>p.views!==null).length,organicViewCount:organic.filter(p=>p.views!==null).length,adViews:avg(ads),organicViews:avg(organic),sampleCount:comments.length,positive:comments.filter(c=>c.sentiment==='positive').length,negative:comments.filter(c=>c.sentiment==='negative').length,neutral:comments.filter(c=>c.sentiment==='neutral').length,purchaseIntent:comments.filter(c=>c.purchaseIntent).length,productQuestions:comments.filter(c=>c.productQuestion).length};
}
export function contentNarrative(c:Creator,b:Brief,library=getContentLibrary()){
 const d=contentFor(c.id,library);if(!d)return null;
 const campaign=campaignOf(b),stats=contentStats(d.posts),target=campaign.targetCustomer?.trim();
 const office=/직장|출근/.test(target??''),lip=/틴트|립스틱/.test(campaign.product);
 const party=office&&d.keywords.includes('파티');
 const product=campaign.product.trim().slice(0,90);
 const intro=d.keywords.includes('발색')&&d.keywords.includes('비교 리뷰')?'색상과 사용감을 직접 비교해 보여주는 크리에이터입니다.':d.keywords.includes('파티')?'화려한 색감과 완성된 메이크업을 빠르게 보여주는 크리에이터입니다.':d.keywords.includes('출근룩')?'출근할 때 입을 옷과 일상적인 스타일링을 소개하는 크리에이터입니다.':`등록된 ‘${d.posts[0]?.title??c.category}’에서 콘텐츠의 표현 방식을 살펴볼 수 있습니다.`;
 let connection=d.source==='user'?`이번 ‘${campaign.name}’에서는 ‘${product}’의 사용법을 이와 같은 형식으로 소개할 수 있는지 검토할 만합니다.`:`이번 ‘${campaign.name}’에서 ‘${product}’를 소개한다면, ‘${d.style}’ 방식으로 제품의 사용 장면을 전달하는 방향을 검토할 수 있습니다.`;
 if(lip&&d.keywords.includes('비교 리뷰')&&d.keywords.includes('발색'))connection=`${target?`‘${target}’에게 `:''}‘${product}’를 설명할 때, 발색과 사용 후 변화를 나란히 보여주는 구성이 연결됩니다.`;
 else if(lip&&d.keywords.includes('출근룩'))connection=`${target?`‘${target}’을 위한 `:''}이번 립 제품은 옷차림을 완성하는 과정에 넣어 사용 장면을 보여줄 수 있습니다.`;
 else if(party)connection=`신제품의 색상을 눈에 띄게 보여줄 수 있지만, ${target?`‘${target}’을 위한 `:''}일상적인 표현 방향과는 조율이 필요합니다.`;
 const relevantComments=d.posts.filter(p=>p.kind==='ad').flatMap(p=>p.comments).filter(x=>x.sentiment!=='unreviewed'&&x.productQuestion);
 const proof=relevantComments.length?`광고 댓글에는 “${relevantComments[0].text}” 같은 제품 질문이 있어, 답을 보여주는 장면을 제작 제안에 담아볼 만합니다.`:stats.sampleCount?'검토한 댓글에서 제품 질문은 아직 확인되지 않아, 제품 설명 방식은 문의에서 구체화하는 것이 좋습니다.':'';
 const next=party?'일상적인 연출로도 제작할 수 있는지 먼저 확인해 보세요.':target?'실제 시청자가 목표 고객과 겹치는지는 최근 채널 인사이트로 확인해 보세요.':!d.posts.some(p=>p.kind==='ad')?'비슷한 제품을 소개한 작업과 제작 가능 범위를 문의해 보세요.':'';
 return [intro,connection,proof,next].filter(Boolean).join(' ');
}
export function creatorReport(c:Creator,brief:Brief,library=getContentLibrary()){
 const d=contentFor(c.id,library),s=contentStats(d?.posts??[]);
 return `# ${c.name} · 캠페인 검토 리포트\n\n캠페인: ${campaignOf(brief).name}\n\n## 적합성\n\n${contentNarrative(c,brief,library)??'콘텐츠 자료를 추가하면 제품·고객과의 연결을 검토할 수 있습니다.'}\n\n## 채널 참고 지표\n\n팔로워 ${numberText(c.followers)}명 / 평균 조회 ${numberText(c.views)}회 / 참여율 ${c.engagement}% / 협업 ${c.campaigns}건 / 평점 ${c.rating??'미평가'}\n\n## 광고 콘텐츠와 일반 콘텐츠\n\n조회수가 확인된 광고 ${s.adViewCount}개 평균 조회 ${s.adViews??'미확인'}회 / 일반 ${s.organicViewCount}개 평균 조회 ${s.organicViews??'미확인'}회. 서로 다른 게시물이며 효과 차이의 인과관계를 뜻하지 않습니다.\n\n광고 댓글 표본 ${s.sampleCount}개: 긍정 ${s.positive}, 중립 ${s.neutral}, 부정 ${s.negative}, 제품 질문 ${s.productQuestions}, 구매 의향 ${s.purchaseIntent}. 구매 의향은 실제 구매가 아닙니다.\n\n## 협업 브랜드\n\n${d?.posts.filter(p=>p.kind==='ad').map(p=>`- ${p.date} · ${p.brand??'미확인'} · ${p.title}`).join('\n')||'확인된 콘텐츠 자료 없음'}\n\n## 자료 출처\n\n${d?`${d.sourceLabel} / 확인일 ${d.checkedAt}`:'제공 CSV만 사용'}. 원본 채널 지표와 추가 콘텐츠 표본의 관측 범위는 다릅니다.\n`;
}

const CONTENT_KEY='creator-match-content-v1';
const contentStorage=()=>typeof location!=='undefined'&&new URLSearchParams(location.search).has('demo')?sessionStorage:localStorage;
let registered:CreatorContent[]=[];
try{if(typeof localStorage!=='undefined')registered=readContentProfiles(JSON.parse(contentStorage().getItem(CONTENT_KEY)??'[]'));}catch{/* Keep the provided CSV and editorial examples intact. */}
export function getContentLibrary():CreatorContent[]{return [...CONTENT_LIBRARY.filter(d=>!registered.some(u=>u.creatorId===d.creatorId)),...registered];}
export function registerPost(creator:Creator,post:CreatorPost){
 if(!validContentPost(post))throw new Error('등록할 콘텐츠 자료를 확인해 주세요.');
 const previous=registered.find(d=>d.creatorId===creator.id);
 const next:CreatorContent={creatorId:creator.id,bio:previous?.bio??`${creator.category} 콘텐츠`,keywords:previous?.keywords??[],style:previous?.style??'등록한 콘텐츠',source:'user',sourceLabel:'사용자가 등록한 게시물·댓글 자료',checkedAt:new Date().toISOString().slice(0,10),posts:[...(previous?.posts.filter(p=>p.id!==post.id)??[]),post]};
 if(next.posts.length>200)throw new Error('한 후보에 등록할 수 있는 콘텐츠는 최대 200개예요. 기존 자료는 유지됩니다.');
 const updated=[...registered.filter(d=>d.creatorId!==creator.id),next];
 contentStorage().setItem(CONTENT_KEY,JSON.stringify(updated));registered=updated;
 window.dispatchEvent(new Event('creator-content-changed'));
}

export function contentProposal(c:Creator,brief:Brief){
 const b=campaignOf(brief),d=contentFor(c.id);
 return `협업 콘텐츠 제안\n${b.targetCustomer?`소개하고 싶은 고객: ${b.targetCustomer}\n`:''}콘텐츠 방향: ${b.creatorStyle||d?.style||'제품 사용 과정을 보여주는 콘텐츠'}\n${b.requiredElements?`꼭 담고 싶은 내용: ${b.requiredElements}\n`:''}제작 가능한 형식과 일정, 위 구성에 대한 의견을 알려주세요.${d?.audience?'':' 타깃 고객과의 접점을 검토할 수 있도록 최근 채널 인사이트도 함께 부탁드립니다.'}`;
}
