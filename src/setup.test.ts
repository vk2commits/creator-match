import {describe,it,expect} from 'vitest';
import {extractBrief} from './briefIntake';
import {BRIEF_EXAMPLE} from './briefDemo';
import {newSetup,setupFromText,setupErrors,finishSetup,withSetupGoal} from './setup';
import {DEFAULT_INPUT} from './policy';
import type {Brief} from './experience';
const existing:Brief={input:DEFAULT_INPUT,priority:'history',customWeights:{engagement:0,views:.4,rating:.3,experience:.3},campaign:{name:'이미 운영 중인 캠페인',product:'기존 제품',goal:'awareness',targetCustomer:'직접 정한 고객',customerNeed:'proof',requiredElements:'필수 장면',includeKeywords:['미니멀'],excludeKeywords:['파티']}};
describe('설명 한 번으로 검토하는 온보딩',()=>{
 it('입력하지 않은 필수 조건을 기본값으로 확정하지 않는다',()=>{
  const value=setupFromText('새 수분크림을 소개하고 싶어요.',newSetup());
  expect(value.budget).toBe('');expect(value.categories).toEqual([]);expect(value.tier).toBe('');
  expect(setupErrors(value)).toHaveProperty('budget');expect(setupErrors(value)).toHaveProperty('categories');expect(setupErrors(value)).toHaveProperty('tier');expect(()=>finishSetup(value)).toThrow();
 });
 it('예시의 제품·대상·표현·필수 요소·조건을 다음 화면에 모두 전달한다',()=>{
  const value=setupFromText(BRIEF_EXAMPLE,newSetup()),brief=finishSetup(value);
  expect(brief.input).toEqual(DEFAULT_INPUT);expect(brief.campaign?.targetCustomer).toBe('출근 준비가 바쁜 직장인');expect(brief.campaign?.creatorStyle).toBe('자연스러운 일상');expect(brief.campaign?.requiredElements).toBe('자연광 발색과 식사 후 지속력');expect(brief.campaign?.product).not.toContain('1명당');
 });
 it('총예산을 1인당 예산으로 쓰지 않는다',()=>{
  const value=setupFromText('전체 예산은 900만원입니다. 판매가 목표예요.',newSetup());expect(value.budget).toBe('');expect(value.priority).toBe('balanced');
 });
 it('0원·음수·소수 원화·과대 금액을 조용히 정상 예산으로 대체하지 않는다',()=>{
  for(const amount of ['0원','-10원','0.5원','9007199254740992원']){const value=setupFromText('립틴트를 소개합니다. 1명당 '+amount,newSetup());expect(setupErrors(value).budget).toBeDefined();}
 });
 it('원화 쉼표·만원 단위 소수는 정확한 원 단위로 읽는다',()=>{
  expect(extractBrief('1명당 1,500,000원').budget).toBe(1500000);expect(extractBrief('한 명당 150.5만원').budget).toBe(1505000);
 });
 it('명시한 고객만 사용하며 타깃 미정으로도 완료할 수 있다',()=>{
  const blank={...newSetup(),campaign:{name:'제품 소개',product:'수분크림',goal:'awareness' as const},budget:'2,000,000',categories:[...DEFAULT_INPUT.categories],tier:DEFAULT_INPUT.sizeTier};
  expect(finishSetup(blank).campaign?.targetCustomer).toBeUndefined();expect(extractBrief('뷰티 제품을 소개해요.').targetCustomer).toBeUndefined();
  expect(extractBrief('타깃 고객: 운동을 즐기는 대학생. 제품: 텀블러.').targetCustomer).toBe('운동을 즐기는 대학생');
 });
 it('제품을 보고 임의 스타일을 채우지 않고 제외한 분야도 선택하지 않는다',()=>{
  expect(extractBrief('립틴트를 소개합니다.').creatorStyle).toBeUndefined();expect(extractBrief('뷰티는 제외, 패션 크리에이터를 찾습니다.').categories).toEqual(['패션']);
 });
 it('재정리할 때 언급하지 않은 고객·필수 요소·검색 조건을 보존한다',()=>{
  const before=newSetup(existing),value=setupFromText('새 립틴트의 판매를 늘리고 싶어요. 한 명당 150만원.',before);
  expect(value.campaign.name).toBe(existing.campaign?.name);expect(value.campaign.targetCustomer).toBe('직접 정한 고객');expect(value.campaign.requiredElements).toBe('필수 장면');expect(value.campaign.includeKeywords).toEqual(['미니멀']);expect(value.campaign.excludeKeywords).toEqual(['파티']);expect(value.campaign.customerNeed).toBe('proof');expect(value.categories).toEqual(DEFAULT_INPUT.categories);expect(value.tier).toBe('micro');
 });
 it('목표를 바꾸거나 다시 정리해도 직접 선택한 추천 기준은 덮지 않는다',()=>{
  const before=newSetup(existing),value=setupFromText('반응을 얻고 싶어요.',before),changed=withSetupGoal(value,'sales');
  expect(changed.priority).toBe('history');expect(changed.customWeights).toEqual(existing.customWeights);expect(existing.campaign?.goal).toBe('awareness');
 });
 it('직접 정하기 전에는 목표에 맞는 시작 기준을 보여준다',()=>{
  expect(withSetupGoal(newSetup(),'engagement').priority).toBe('response');expect(withSetupGoal(newSetup(),'sales').priority).toBe('balanced');
 });
 it('확정된 초안은 별도 객체로 반환해 기존 캠페인 조건을 변형하지 않는다',()=>{
  const value=newSetup(existing),finished=finishSetup(value);finished.input.categories.pop();expect(existing.input.categories).toEqual(DEFAULT_INPUT.categories);expect(value.categories).toHaveLength(2);
 });
 it('조건만 입력하면 제품을 지어내지 않고 기존 제품은 보존한다',()=>{
  const text='타깃: 직장인. 1명당 200만원. 분야: 뷰티. 팔로워 1만~10만.';
  expect(extractBrief(text).product).toBe('');expect(setupErrors(setupFromText(text,newSetup())).product).toBeDefined();expect(setupFromText(text,newSetup(existing)).campaign.product).toBe('기존 제품');
 });
 it('자동으로 붙인 이름은 제품 변경을 따르되 직접 쓴 이름은 유지한다',()=>{
  const first=setupFromText('수분크림을 알리고 싶어요.',newSetup());const next=setupFromText('틴트를 알리고 싶어요.',first);expect(next.campaign.name).toBe('틴트 캠페인');expect(setupFromText('틴트를 알리고 싶어요.',{...first,nameChosen:true,campaign:{...first.campaign,name:'직접 쓴 제목'}}).campaign.name).toBe('직접 쓴 제목');
 });
 it('잘못된 직접 비중으로 진행할 수 없다',()=>{
  const value=newSetup(existing);value.customWeights={engagement:.5,views:.5,rating:.5,experience:.5};expect(setupErrors(value).weights).toBeDefined();
 });
});
