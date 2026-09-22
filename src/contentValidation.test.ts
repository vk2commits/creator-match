import {describe,it,expect} from 'vitest';
import {contentFor} from './creatorContent';
import {readContentProfiles,reconcileComments,validContentPost} from './contentValidation';
const profile=()=>{
 const d=structuredClone(contentFor('C0180')!);d.source='user';d.posts.forEach(p=>delete p.image);return d;
};
describe('등록 자료의 결측·수정·저장 경계',()=>{
 it('정상 자료의 누락 수치는 보존하고 주소 접두사를 보완한다',()=>{
  const d=profile();d.posts[0].views=null;d.posts[0].url='instagram.com/p/example';
  const parsed=readContentProfiles([d]);expect(parsed).toHaveLength(1);expect(parsed[0].posts[0].views).toBeNull();expect(parsed[0].posts[0].url).toBe('https://instagram.com/p/example');expect(parsed[0].audience).toBeUndefined();
 });
 it('깨진 자료와 실행 가능한 주소를 화면에 올리지 않는다',()=>{
  const d=profile();d.posts[0].url='javascript:alert(1)';expect(readContentProfiles([d])).toEqual([]);
  const broken=profile();broken.posts[0].comments[0].sentiment='invalid' as never;expect(readContentProfiles([broken])).toEqual([]);
  const negative=profile();negative.posts[0].views=-1;expect(validContentPost(negative.posts[0])).toBe(false);
 });
 it('중복 프로필을 한 번만 읽고 날짜 오류를 제외한다',()=>{
  const d=profile();expect(readContentProfiles([d,d])).toHaveLength(1);d.posts[0].date='2026-02-30';expect(readContentProfiles([d])).toEqual([]);
 });
 it('댓글 내용을 바꾸면 기존 분류를 보존하고 새 댓글은 미확인으로 저장한다',()=>{
  const previous=[{text:'가격이 궁금해요',sentiment:'neutral' as const,productQuestion:true,purchaseIntent:false}];
  const next=reconcileComments('가격이 궁금해요\n새로운 댓글',previous);
  expect(next[0]).toEqual(previous[0]);expect(next[1].sentiment).toBe('unreviewed');expect(reconcileComments('새로운 댓글',previous)).toHaveLength(1);
 });
});
