export function clampOrderAmount(value,cap){
  if(!Number.isFinite(cap)||cap<100)return 0;
  if(!Number.isFinite(value))return NaN;
  return Math.max(100,Math.min(cap,Math.round(value*100)/100));
}
export function sliderOrderAmount(value,cap){
  return clampOrderAmount(value>=cap?cap:Math.round(value/100)*100,cap);
}
// Whole hundreds are easy to read; fees and psychological limits are in cap.
export function randomOrderAmount(cap,random=Math.random){
  if(!Number.isFinite(cap)||cap<100)return 0;
  const count=Math.floor(cap/100),roll=Math.max(0,Math.min(1-Number.EPSILON,random()));
  return (1+Math.floor(roll*count))*100;
}
