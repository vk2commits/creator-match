import type {Creator} from './domain';
import type {Campaign,CustomerNeed} from './campaign';

export const CUSTOMER_NEEDS = [
  {id:'proof',label:'꼼꼼히 비교해요',detail:'사용 과정과 장단점을 보고 결정해요'},
  {id:'routine',label:'내 일상에 대입해요',detail:'언제, 어떻게 쓸 수 있는지가 중요해요'},
  {id:'discovery',label:'새로운 취향을 찾아요',detail:'새로운 제품과 스타일을 먼저 발견하고 싶어요'},
] as const;

// Synthetic content fixtures, separate from the source CSV and ranking engine.
// These describe a demonstration scenario, not an observed creator audience.
const STYLES = {
  proof:{label:'비교·사용기 중심',titles:['직접 써보고 비교하기','사용 전 궁금했던 세 가지','좋았던 점과 아쉬운 점'],evidence:'사용 순서와 장단점을 차례로 보여주는 콘텐츠',strength:'제품을 고를 근거를 찾는 고객에게 사용 장면과 차이를 설명하기 좋습니다.'},
  routine:{label:'일상·루틴 중심',titles:['하루에 자연스럽게 쓰는 법','외출 준비에 더한 한 가지','내가 계속 사용하는 이유'],evidence:'하루 일과 안에서 제품을 사용하는 콘텐츠',strength:'고객이 자신의 생활에 제품을 대입해 보고, 언제 쓸지 떠올리기 좋습니다.'},
  discovery:{label:'신제품·스타일 제안 중심',titles:['이번에 발견한 새 아이템','한 제품, 세 가지 스타일','눈여겨볼 새로운 조합'],evidence:'새로운 제품을 여러 스타일로 제안하는 콘텐츠',strength:'새로운 선택지를 찾는 고객에게 제품을 처음 소개하고 관심을 끌기 좋습니다.'},
} as const;
const FIXTURES:Record<string,CustomerNeed>={C0066:'proof',C0077:'discovery',C0155:'routine'};
export function channelExample(c:Creator){
  const style=FIXTURES[c.id]??(['proof','routine','discovery'] as const)[Number(c.id.slice(1))%3];
  return {style,...STYLES[style],format:c.platform==='유튜브'?'영상 안에서 사용 과정과 설명을 함께 보여주는 구성':'짧은 영상과 이미지로 제품이 쓰이는 순간을 보여주는 구성'};
}
export function analyzeChannelExample(c:Creator,campaign:Campaign){
  if(!campaign.customerNeed)return null;
  const channel=channelExample(c),need=CUSTOMER_NEEDS.find(n=>n.id===campaign.customerNeed)!;
  const aligned=channel.style===campaign.customerNeed;
  const requests:Record<CustomerNeed,string>={proof:'장점만 소개하기보다 사용 과정, 비교 기준, 아쉬운 점도 함께 담아달라고 요청하세요.',routine:'어떤 상황에서 왜 이 제품을 사용하는지, 실제 생활 장면을 넣어달라고 요청하세요.',discovery:'익숙한 제품과 무엇이 다른지, 새로운 조합이나 활용법을 첫 장면에서 보여달라고 요청하세요.'};
  const needs:Record<CustomerNeed,string>={proof:'선택 전에 제품의 차이와 사용 근거를 확인하려는 고객',routine:'내 생활에 유용한지부터 판단하는 고객',discovery:'새로운 제품과 스타일에서 관심이 시작되는 고객'};
  return {
    channel,need,aligned,
    target:campaign.targetCustomer?.trim()||needs[campaign.customerNeed],
    title:aligned?'고객의 선택 방식과 콘텐츠 구성이 맞아요':'콘텐츠 방향을 조율하면 검토할 만해요',
    reasoning:aligned?`${needs[campaign.customerNeed]}에게, ${channel.evidence}를 보여주는 조합입니다. ${channel.strength}`:`이번 고객은 “${need.detail}”라는 기준으로 고르지만, 이 예시 채널은 ${channel.label}입니다. 그대로 집행하기보다 고객이 궁금해하는 내용을 제작 요청에 넣는 편이 좋겠습니다.`,
    request:requests[campaign.customerNeed],
    caution:aligned?'콘텐츠 방식은 맞아도 실제 시청자가 우리 고객인지는 별도 확인해야 합니다. 협업 전 최근 콘텐츠와 시청자 정보를 요청하세요.':`${channel.label}의 자연스러움을 해치지 않고 요청한 설명을 담을 수 있는지, 크리에이터와 먼저 조율하세요.`,
  };
}

// Goal-specific copy uses synthetic content fixtures, never ranking input.
export function campaignFit(c:Creator,campaign:Campaign){
  const channel=channelExample(c),customer=analyzeChannelExample(c,campaign);
  const subject:Record<Creator['category'],string>={뷰티:'발색과 사용감',식품:'맛과 먹는 방법',패션:'핏과 스타일링',피트니스:'운동 루틴과 사용 동작',여행:'여행 동선과 현지 사용 장면',아웃도어:'야외 활동에서의 쓰임',라이프스타일:'생활 속 사용 장면',테크:'주요 기능과 사용 편의',게임:'플레이 방식과 재미',교육:'학습 과정과 활용 방법'};
  const goalReasons={
    awareness:{proof:'처음 보는 제품의 특징을 비교와 설명으로 전달하는 구성입니다.',routine:'일상에서 제품이 등장하는 순간을 보여주며 처음 관심을 끄는 구성입니다.',discovery:'새로운 아이템을 여러 스타일로 제안해 신제품의 첫인상을 만드는 구성입니다.'},
    engagement:{proof:'사용 전 궁금한 점을 다루어 질문과 의견을 나누기 좋은 구성입니다.',routine:'익숙한 생활 장면으로 공감을 만들고 각자의 활용법을 묻기 좋은 구성입니다.',discovery:'여러 활용안 중 마음에 드는 것을 고르게 해 반응을 모으기 좋은 구성입니다.'},
    sales:{proof:'사용 과정과 장단점을 비교해 구매 전에 필요한 정보를 전하는 구성입니다.',routine:'내 생활에서 언제 필요한지 보여주어 구매를 검토할 이유를 전하는 구성입니다.',discovery:'관심을 끄는 데서 끝나지 않도록 제품 정보와 선택 기준을 함께 넣어야 하는 구성입니다.'},
  } as const;
  const headline={proof:'제품의 차이를 설명하는 협업에 어울려요',routine:'일상 속 쓰임을 보여주는 협업에 어울려요',discovery:'새 제품과 스타일을 소개하는 협업에 어울려요'}[channel.style];
  const request=customer?.request??({proof:'사용 순서와 장단점을 비교해 제품을 고를 근거를 보여주세요.',routine:'어떤 상황에서 제품이 필요한지 일상 속 사용 장면으로 보여주세요.',discovery:'제품의 새로운 특징과 활용 조합을 첫 장면에서 보여주세요.'}[channel.style]);
  return {channel,customer,headline,summary:goalReasons[campaign.goal][channel.style],
    evidence:`${c.category} 분야의 ${subject[c.category]}에 관한 내용을 ${channel.style==='proof'?'차례로 비교':channel.style==='routine'?'하루의 흐름 안에서 소개':'새로운 조합으로 제안'}하는 예시 콘텐츠를 기준으로 봤어요.`,request,
    tradeoff:customer&&!customer.aligned?customer.reasoning:campaign.goal==='sales'&&channel.style==='discovery'?'신제품 소개만으로 구매 판단에 필요한 정보가 충분하지 않을 수 있어요. 사용 조건·차이점·구매 경로를 제작 요청에 함께 담으세요.':null,
  };
}
