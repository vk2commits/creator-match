export type VisualReference={name:string;preview:string;tags:string[];description:string};
export function paletteTags(pixels:Uint8ClampedArray){
 let brightness=0,saturation=0,warmth=0,count=0;
 for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const r=pixels[i]/255,g=pixels[i+1]/255,b=pixels[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b);brightness+=(r+g+b)/3;saturation+=max===0?0:(max-min)/max;warmth+=r-b;count++;}
 if(!count)throw new Error('이미지의 색을 읽을 수 없어요. 다른 이미지를 선택해 주세요.');
 brightness/=count;saturation/=count;warmth/=count;
 const tags=[saturation<.32?'뉴트럴':'선명한',warmth>.035?'따뜻한':'차분한'];
 return {tags,description:`${saturation<.32?'채도가 낮은':'채도가 있는'} ${warmth>.035?'따뜻한':'차분한'} 색감${brightness>.7?' · 밝은 이미지':brightness<.3?' · 어두운 이미지':''}`};
}
export async function readVisualReference(file:File):Promise<VisualReference>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('JPG, PNG, WebP 이미지를 선택해 주세요.');
 if(file.size>2*1024*1024)throw new Error('이미지는 2MB 이하로 넣어주세요.');
 const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>16000000){bitmap.close();throw new Error('가로·세로 크기를 줄인 이미지를 선택해 주세요.');}
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
 const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('이미지를 읽지 못했어요. 다시 선택해 주세요.');}
 ctx.drawImage(bitmap,0,0,32,32);bitmap.close();const palette=paletteTags(ctx.getImageData(0,0,32,32).data);
 const preview=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('이미지를 열 수 없어요.'));r.readAsDataURL(file);});
 return {name:file.name,preview,...palette};
}
