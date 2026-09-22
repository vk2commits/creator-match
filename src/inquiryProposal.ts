/** Append only after explicit review; never rewrite the marketer's existing message. */
export function appendInquiryProposal(message:string,proposal:string){
  const addition=proposal.trim();
  if(!addition||message.includes(addition))return message;
  return message+(message?'\n\n':'')+addition;
}
