// 返回浏览器缓存页面时也要恢复时钟；离开期间的报价不补播。
export function bindMarketLifecycle({clock,page=globalThis.window,document=globalThis.document,onSuspend=()=>{},onResume=()=>{}}){
 let pageActive=true;
 const suspend=()=>{clock.stop();onSuspend();};
 const resume=()=>{if(!pageActive||document.hidden)return;if(onResume()!==false)clock.start();};
 const hide=()=>{pageActive=false;suspend();};
 const show=()=>{pageActive=true;resume();};
 const visibility=()=>{if(document.hidden)suspend();else resume();};
 page.addEventListener('pagehide',hide);
 page.addEventListener('pageshow',show);
 document.addEventListener('visibilitychange',visibility);
 return()=>{
  page.removeEventListener('pagehide',hide);
  page.removeEventListener('pageshow',show);
  document.removeEventListener('visibilitychange',visibility);
  pageActive=false;clock.stop();
 };
}
