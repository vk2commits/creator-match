export function outreachDemo(context:string,tone:string){
  // Preserve user-written facts and extra paragraphs. Only the known template's
  // closing sentence and whitespace change in the demonstration.
  const closing='해당 조건에서 진행 가능한 일정과 견적(부가세 포함 여부), 수정 범위, 콘텐츠 사용권을 알려주시면 검토 후 회신드리겠습니다. 감사합니다.';
  const replacement=tone==='짧게'?'위 조건으로 가능한 일정과 견적을 알려주세요. 부가세, 수정 범위와 사용권도 함께 확인 부탁드립니다. 감사합니다.':'위 조건으로 협업이 가능하실까요? 가능한 일정과 견적을 안내해 주시면 감사하겠습니다. 부가세 포함 여부, 수정 횟수와 콘텐츠 사용 범위도 함께 부탁드립니다.\n\n감사합니다.';
  return context.replace(closing,replacement).replace(/\n{3,}/g,'\n\n');
}
