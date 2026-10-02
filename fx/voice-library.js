// Native controls provide keyboard-accessible play, pause, seeking and volume.
export function coordinateAuditions(players,{beforePlay=()=>{},onPlay=()=>{}}={}){
  const listeners=players.map(player=>{
    const play=()=>{for(const other of players)if(other!==player)other.pause();beforePlay();onPlay(player);};
    player.addEventListener('play',play);return [player,play];
  });
  return ()=>{for(const [player,play] of listeners){player.removeEventListener('play',play);player.pause();}};
}

export function mountVoiceLibrary(container,lines,{beforePlay,onPlay,onError}={}){
  const players=[];container.replaceChildren();
  for(const line of lines){
    const row=document.createElement('article');row.className='voice-audition';
    const heading=document.createElement('div');heading.className='voice-audition-heading';
    const title=document.createElement('strong');title.textContent=line.speaker+' · '+line.zh;
    const duration=document.createElement('span');duration.textContent=(line.end-line.start+(line.leadInSeconds||0)).toFixed(1)+' 秒';
    heading.append(title,duration);
    const caption=document.createElement('p');caption.lang='ja';caption.textContent=line.ja;
    const player=document.createElement('audio');player.controls=true;player.preload='metadata';player.src=line.file;player.volume=.65;player.dataset.voiceId=line.id;player.setAttribute('aria-label','试听：'+line.speaker+' · '+line.zh);
    player.addEventListener('loadedmetadata',()=>{if(Number.isFinite(player.duration))duration.textContent=player.duration.toFixed(1)+' 秒';});
    player.addEventListener('error',()=>{row.classList.add('voice-unavailable');duration.textContent='暂不可播放';onError?.(line);});
    players.push(player);row.append(heading,caption,player);container.append(row);
  }
  const stop=coordinateAuditions(players,{beforePlay,onPlay:player=>onPlay?.(lines.find(line=>line.id===player.dataset.voiceId))});
  return ()=>{stop();for(const player of players){player.removeAttribute('src');player.load();}container.replaceChildren();};
}
