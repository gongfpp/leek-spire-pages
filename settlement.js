const yen=n=>(n<0?'−':'')+'¥'+Math.abs(Math.round(n)).toLocaleString('zh-CN');
export function showSettlement(report,{audio,motion,onDone,onSkip}){
 const d=document.createElement('dialog');d.className='settlement-dialog';d.setAttribute('aria-label','收盘结算');
 d.innerHTML='<div class="settlement-head"><span>15:00 / CLOSING BELL</span><h2>今天，赚明白了吗？</h2><p>从开盘资产开始，逐笔回放实际入账。不会重复加钱。</p></div><div class="settlement-ledger"></div><div class="settlement-total"><span>账户总资产</span><strong></strong><small></small></div><button class="primary settlement-next">快进结算 →</button>';
 if(report.closingLabel)d.querySelector('.settlement-head span').textContent=report.closingLabel;
 document.body.append(d);d.showModal();
 const list=d.querySelector('.settlement-ledger'),total=d.querySelector('.settlement-total strong'),note=d.querySelector('.settlement-total small'),button=d.querySelector('button');
 let timers=[],frames=[],index=0,value=report.opening,finished=false,closed=false;
 const rows=[{label:'开盘资产',amount:report.opening,opening:true},...report.rows];total.textContent=yen(value);
 const clear=()=>{timers.forEach(clearTimeout);frames.forEach(cancelAnimationFrame);timers=[];frames=[];};
 const number=(from,to)=>{if(!motion.enabled){total.textContent=yen(to);return;}const start=performance.now();const update=t=>{const p=Math.min(1,(t-start)/180);total.textContent=yen(from+(to-from)*(1-(1-p)**3));if(p<1)frames.push(requestAnimationFrame(update));};frames.push(requestAnimationFrame(update));};
 const row=(r,i)=>{const el=document.createElement('div');el.className='settlement-row '+(r.amount<0?'loss-row':'gain-row');const label=document.createElement('span'),amount=document.createElement('b'),formula=document.createElement('small');label.textContent=r.label;amount.textContent=(r.amount>0&&!r.opening?'+':'')+yen(r.amount);formula.textContent=r.formula||'';el.append(label,amount,formula);list.append(el);el.scrollIntoView({block:'nearest'});
  const old=value;if(!r.opening)value+=r.amount;number(old,value);
  motion.animate(el,[{transform:'rotate(-2deg) scale(.94)',opacity:.5},{transform:'rotate(1deg) scale(1.03)',opacity:1},{transform:'none',opacity:1}],{duration:280});
  motion.animate(total,[{transform:'scale(1)'},{transform:`scale(${Math.min(1.16,1.04+i*.012)})`},{transform:'scale(1)'}],{duration:240});
  if(!r.opening){audio.effect('rattle',{rate:Math.min(1.6,.78+i*.08),level:.5});audio.effect(r.amount<0?'loss':/股息|分红|派息|阶梯|溢价|利息/.test(r.label)?'dividend':'gain',{rate:Math.min(1.7,.9+i*.09),level:.75});if(motion.enabled)motion.animate(d,[{transform:'translate(0)'},{transform:'translate(-3px,1px)'},{transform:'translate(3px,-1px)'},{transform:'none'}],{duration:180});}
 };
 const finish=()=>{finished=true;total.textContent=yen(report.closing);const net=report.tradingNet??(report.closing-report.opening);note.textContent=Number.isFinite(report.tradingNet)?`今日交易 ${net>=0?'+':''}${yen(net)} · 家庭注资 ${yen(report.funding||0)}`:`今日净变化 ${net>=0?'+':''}${yen(net)} · ${net>=0?'今天，又相信了。':'明天还得开盘。'}`;button.textContent='看清楚了，继续 →';audio.effect(net>=0?'win':'loss',{rate:net>=0?1.25:.65,stretch:net<0});};
 const next=()=>{if(closed)return;if(index<rows.length){row(rows[index],index);index++;timers.push(setTimeout(next,Math.max(150,360-index*15)));}else finish();};next();
 button.addEventListener('click',()=>{if(!finished){clear();while(index<rows.length){row(rows[index],index);index++;}clear();finish();onSkip?.();return;}closed=true;clear();d.close();d.remove();onDone();});
 d.addEventListener('cancel',e=>{e.preventDefault();button.click();});
 return ()=>{closed=true;clear();d.remove();};
}
