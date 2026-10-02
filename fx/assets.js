// Resolve against the module, so /fx.html, /fx and Pages subdirectories agree.
export function assetURL(path,base=import.meta.url){
  const source=new URL(base),url=new URL(path,source);
  const version=source.searchParams.get('v');if(version)url.searchParams.set('v',version);
  return url.href;
}
export function setImage(image,path){
  const url=assetURL(path);if(image.dataset.asset===url)return;
  image.dataset.asset=url;image.dataset.imageRetry='0';image.classList.remove('image-unavailable');
  image.onerror=()=>{
    if(image.dataset.imageRetry==='0'){
      image.dataset.imageRetry='1';const retry=new URL(image.dataset.asset);retry.searchParams.set('retry','1');image.src=retry.href;
    }else image.classList.add('image-unavailable');
  };
  image.onload=()=>image.classList.remove('image-unavailable');image.src=url;
}
