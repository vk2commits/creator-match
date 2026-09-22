import type {Creator} from './domain';
import {channelExample} from './channelAnalysis';
import {Identity,Icon} from './ui';
import {numberText} from './policy';
export const channelHref=(id:string,demo:boolean)=>`?${demo?'demo&':''}channel=${encodeURIComponent(id)}`;
export function ChannelPage({creator,demo}:{creator:Creator;demo:boolean}){
  const channel=channelExample(creator);
  return <div className="channel-page"><header><a className="wordmark" href={demo?'?demo':'./'}>creator match</a><span className="demo-label">예시 채널</span></header><main><section className="channel-page-cover"><Icon name={creator.platform==='유튜브'?'youtube':'instagram'} size={44}/><div><Identity creator={creator}/><p>{creator.category} · {channel.label}</p></div></section><div className="channel-page-stats"><span>평균 조회수 <strong>{numberText(creator.views)}회</strong></span><span>참여율 <strong>{creator.engagement}%</strong></span><span>광고 협업 <strong>{creator.campaigns}건</strong></span></div><div className="section-heading"><h1>콘텐츠 살펴보기</h1><span className="ai-state">아래 콘텐츠는 시연용 예시입니다.</span></div><div className="channel-posts">{channel.titles.map((title,i)=><article key={title}><div className={'channel-tile tile-'+i}><span className="tile-art" aria-hidden="true"><span/><span/><span/></span></div><span className="category-tag">{creator.category}</span><h2>{title}</h2><p>{channel.evidence}입니다. {channel.format}으로 소개합니다.</p></article>)}</div><a className="text-button" href={demo?'?demo':'./'}>크리에이터 탐색으로 이동 →</a></main></div>;
}
