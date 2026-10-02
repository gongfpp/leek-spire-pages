// Prepare the File before the click, so share() keeps its user activation.
export function buildShareFile(card,FileClass=globalThis.File) {
  if(!card?.blob||typeof FileClass!=='function')return null;
  return new FileClass([card.blob],card.filename||'FX韭留美-战报.png',{type:'image/png'});
}
export function canShareFile(file,navigator=globalThis.navigator) {
  try{return !!file&&typeof navigator?.share==='function'&&navigator.canShare?.({files:[file]})===true;}catch{return false;}
}
export async function shareReportFile(file,navigator=globalThis.navigator) {
  if(!canShareFile(file,navigator))return 'unavailable';
  try{await navigator.share({files:[file],title:'FX韭留美 / TRADING REPORT'});return 'shared';}
  catch(error){return error?.name==='AbortError'?'cancelled':'failed';}
}
