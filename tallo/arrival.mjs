
const markup = `<div class="arrival-world" aria-hidden="true"><div class="arrival-cloud"></div><div class="arrival-cloud second"></div><div class="arrival-sea"><span>湘南海岸 · SHONAN COAST</span></div><div class="arrival-crossing"><i></i><i></i><b></b></div><div class="arrival-track"></div><img class="arrival-train" src="assets/enoden-train.svg" alt=""></div><button class="arrival-dismiss" data-arrival-close>略過動畫 →</button><div class="arrival-content"><div class="arrival-brand"><img src="assets/tallo-icon.png" width="72" height="72" alt=""><strong>Tallo</strong><span>日常的每一站</span></div><section class="arrival-ticket"><span class="arrival-ticket-label">江ノ電 · DAILY JOURNAL</span><h1 id="arrivalTitle">下一站，是你的日常。</h1><p>讓電車慢慢經過，<br>也替今天的生活，留下一筆。</p><button class="arrival-enter" data-arrival-close>進站，開始記帳 <span aria-hidden="true">→</span></button><small>稍候將自動進入 · 隨時可以略過</small></section></div>`;

export function createArrivalController({doc=globalThis.document,win=globalThis.window,setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout,now=()=>Date.now()}={}){
 let overlay,root,active=false,initialized=false,autoTimer=null,closeTimer=null,lastFocus=null,previousInert=false,hiddenAt=null,pendingLaunch=false;
 const reduced=()=>!!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function clearTimers(){if(autoTimer!==null)clearTimer(autoTimer);if(closeTimer!==null)clearTimer(closeTimer);autoTimer=null;closeTimer=null;}
 function finish(){
  overlay.hidden=true;overlay.classList.remove('is-closing');if(root)root.inert=previousInert;
  if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
 }
 function close(){
  if(!active)return;active=false;clearTimers();overlay.classList.add('is-closing');
  closeTimer=setTimer(finish,reduced()?100:280);
 }
 function open(){
  if(!initialized)init(false);
  clearTimers();
  if(overlay.hidden){lastFocus=doc.activeElement;previousInert=!!root?.inert;}
  if(root)root.inert=true;
  overlay.hidden=false;overlay.classList.remove('is-closing');overlay.classList.toggle('motion-reduced',reduced());
  // Restart the CSS train only through a fresh animation class.
  overlay.classList.remove('is-playing');void overlay.offsetWidth;overlay.classList.add('is-playing');
  active=true;overlay.querySelector('[data-arrival-close]')?.focus({preventScroll:true});
  if(doc.visibilityState!=='hidden')autoTimer=setTimer(close,reduced()?600:3400);
 }
 function onClick(event){if(event.target.closest('[data-arrival-close]'))close();}
 function onKey(event){if(active&&event.key==='Escape'){event.preventDefault();close();}}
 function onVisibility(){
  if(doc.visibilityState==='hidden'){hiddenAt=now();if(autoTimer!==null)clearTimer(autoTimer);autoTimer=null;return;}
  if(pendingLaunch||active||(hiddenAt!==null&&now()-hiddenAt>=60000)){pendingLaunch=false;open();}
  hiddenAt=null;
 }
 function onPageShow(event){if(event.persisted)open();}
 function init(show=true){
  if(initialized)return;initialized=true;root=doc.getElementById('siteRoot');previousInert=!!root?.inert;
  overlay=doc.createElement('div');overlay.id='arrivalOverlay';overlay.className='arrival-screen';overlay.hidden=true;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','arrivalTitle');
  overlay.innerHTML=markup;doc.body.append(overlay);
  overlay.addEventListener('click',onClick);doc.addEventListener('keydown',onKey);doc.addEventListener('visibilitychange',onVisibility);win.addEventListener('pageshow',onPageShow);
  if(show){if(doc.visibilityState==='hidden')pendingLaunch=true;else open();}
 }
 function destroy(){
  clearTimers();if(overlay){overlay.removeEventListener('click',onClick);overlay.remove();}if(root)root.inert=previousInert;
  doc.removeEventListener('keydown',onKey);doc.removeEventListener('visibilitychange',onVisibility);win.removeEventListener('pageshow',onPageShow);active=false;initialized=false;
 }
 return {init,open,close,destroy};
}
let arrival;
export function initArrival(){if(!arrival){arrival=createArrivalController();arrival.init();}return arrival;}
export function showArrival(){initArrival().open();}
