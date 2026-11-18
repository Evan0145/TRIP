
import {CATEGORIES,money,summarize,validateRecord,parseAmount,chartDays,sharedRecordRows} from "./daily-model.mjs";
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const currentMonth=today().slice(0,7),monthTitle=m=>Number(m.slice(0,4))+' 年 '+Number(m.slice(5))+' 月';
const ACCOUNT={cash:{label:'現金',icon:'👛'},card:{label:'信用卡',icon:'💳'},bank:{label:'銀行帳戶',icon:'🏦'},shared:{label:'共用分帳',icon:'👥'}};
const ICON={
 home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
 list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 stats:'<path d="M4 20h16M7 16v-5M12 16V5M17 16V8"/>',
 split:'<path d="M4 7h15l-3-3M20 17H5l3 3M18 7v4M6 17v-4"/>',
 me:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'
};
const TABS=[['home','首頁'],['list','明細'],['stats','統計'],['split','分帳'],['me','我的']];
const TRAIN='<svg class="coast-train" viewBox="0 0 210 55" aria-hidden="true"><rect x="3" y="7" width="204" height="34" rx="9" fill="#1F7A52"/><rect x="3" y="24" width="204" height="9" fill="#FFF3C4"/>'+Array.from({length:7},(_,i)=>'<rect x="'+(12+i*27)+'" y="12" width="20" height="9" rx="2" fill="#DFF6FF"/>').join('')+'<circle cx="25" cy="45" r="5" fill="#26372c"/><circle cx="185" cy="45" r="5" fill="#26372c"/><text x="108" y="39" text-anchor="middle" font-size="5" fill="#FFF3C4" letter-spacing="2">ENODEN</text></svg>';
let state={view:'home',month:currentMonth,budget:18000,filter:'all',kind:'all',returnView:'home',records:[],groups:[],draft:null,modal:null,error:'',toast:'',syncError:''};
let toastTimer;
const own=t=>t.amount;
const cat=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES.at(-1);
const monthRows=()=>summarize(state.records,state.month,state.budget);
function notify(text){state.toast=text;render(true);clearTimeout(toastTimer);toastTimer=setTimeout(()=>{state.toast='';render(true)},2200);}
function navigate(view){state.view=view;state.error='';state.modal=null;render();document.getElementById('phoneScroll').scrollTo(0,0);}
function monthNav(){return '<div class="month-control"><button data-action="month" data-step="-1" aria-label="上個月">‹</button><strong>'+esc(monthTitle(state.month))+'</strong><button data-action="month" data-step="1" aria-label="下個月">›</button></div>';}
function header(title,subtitle,add=true){return '<header class="daily-header"><div class="heading-line"><div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+(add?'<button class="small-add" data-action="add" aria-label="新增一筆">＋</button>':'<span class="group-pill">雲端帳本</span>')+'</div></header>';}
function nav(){return '<nav class="daily-nav" aria-label="主要導覽">'+TABS.map(([id,label])=>'<button data-action="nav" data-view="'+id+'" class="'+(state.view===id?'active':'')+'" aria-current="'+(state.view===id?'page':'false')+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[id]+'</svg>'+label+'</button>').join('')+'</nav>';}
function row(t){
 const c=cat(t.category);
 return '<div class="record-item"><div class="record-emoji">'+(t.type==='income'?'↙':c.icon)+'</div><div class="record-text"><strong>'+esc(t.note||c.label)+((t.split||t.shared)?'<span class="shared-mark">分帳</span>':'')+'</strong><small>'+esc(t.date.slice(5).replace('-','/'))+' · '+esc(ACCOUNT[t.account].label)+(t.split?' · 我負擔 '+money(own(t)):'')+'</small></div><div class="record-value '+(t.type==='income'?'income':'')+'">'+(t.type==='income'?'+':'−')+money(own(t))+'</div></div>';
}
function recent(rows,max){const sorted=[...rows].reverse().sort((a,b)=>b.date.localeCompare(a.date));return sorted.slice(0,max).map(row).join('');}
function home(){
 const s=monthRows(),todayExpense=state.records.filter(t=>t.date===today()&&t.type==='expense').reduce((a,t)=>a+own(t),0);
 return '<header class="daily-hero"><div class="daily-brand">Tallo</div><div class="daily-kicker">日常的每一站 ・ DAILY JOURNAL</div><button class="daily-preview-badge" data-action="arrival" aria-label="重播江之電進場畫面">🚃 江之電</button><div class="daily-greeting">把日子，慢慢記下來。</div><div class="daily-subtitle">一杯咖啡、一趟通勤，都是生活的軌跡。</div>'+TRAIN+'</header><main class="daily-body home-body"><section class="station-card month-ticket"><div class="ticket-eyebrow"><span>生活乘車券 / THIS MONTH</span>'+monthNav()+'</div><div class="ticket-caption">本月支出</div><div class="ticket-main"><small>NT$</small>'+money(s.expense)+'</div><div class="ticket-divider"></div><div class="ticket-bottom"><div><div class="mini-label">預算'+(s.remaining<0?'已超出':'還可以用')+'</div><div class="value" '+(s.remaining<0?'style="color:#D63A22"':'')+'>NT$ '+money(Math.abs(s.remaining))+'</div></div><div style="text-align:right"><div class="mini-label">今天花了</div><div class="value" style="color:#17251F">NT$ '+money(todayExpense)+'</div></div></div><div class="budget-track"><i style="width:'+Math.min(100,s.ratio*100)+'%;'+(s.ratio>1?'background:#D63A22':'')+'"></i></div><div class="budget-line"><span>每月預算 NT$ '+money(state.budget)+'</span><b>'+Math.round(s.ratio*100)+'%</b></div></section><button class="quick-add" data-action="add"><span>＋</span> 記一筆日常</button><p class="daily-caption">自己的帳，打開就能記。</p><div class="section-row"><h2>快速記帳</h2><span class="mini-label">從生活的小事開始</span></div><div class="daily-category-row">'+CATEGORIES.slice(0,4).map(c=>'<button class="daily-shortcut" data-action="add" data-category="'+c.id+'"><span>'+c.icon+'</span>'+c.label+'</button>').join('')+'</div><div class="section-row"><h2>最近的日常</h2><button data-action="nav" data-view="list">全部明細 ›</button></div><section class="record-list">'+(recent(s.rows,3)||'<div class="daily-empty">這個月還沒記帳，從第一筆開始吧。</div>')+'</section><p class="daily-footer-note">江之電陪你，記下每一站生活。<br>個人帳目與共用負擔分開儲存 · 金額合併統計</p></main>';
}
function ledger(){
 const s=monthRows(),filtered=s.rows.filter(t=>(state.filter==='all'||t.category===state.filter)&&(state.kind==='all'||t.type===state.kind));
 const days=[...new Set(filtered.map(t=>t.date))].sort().reverse();
 return header('日常明細','每一筆，都有生活的樣子。')+'<main class="daily-body"><div class="month-strip">'+monthNav()+'<span class="mini-label">'+filtered.length+' 筆</span></div><div class="station-card two-numbers"><div><span class="mini-label">本月支出</span><strong>−'+money(s.expense)+'</strong></div><div><span class="mini-label">本月收入</span><strong style="color:#1F7A52">＋'+money(s.income)+'</strong></div></div><div class="filter-row" aria-label="收支篩選">'+[['all','全部'],['expense','支出'],['income','收入']].map(([id,label])=>'<button class="'+(state.kind===id?'active':'')+'" data-action="kind" data-id="'+id+'">'+label+'</button>').join('')+'</div><div class="filter-row" aria-label="分類篩選"><button data-action="filter" data-id="all" class="'+(state.filter==='all'?'active':'')+'">所有分類</button>'+CATEGORIES.map(c=>'<button data-action="filter" data-id="'+c.id+'" class="'+(state.filter===c.id?'active':'')+'">'+c.label+'</button>').join('')+'</div>'+days.map(day=>{const ts=filtered.filter(t=>t.date===day);return '<div class="day-label"><span>'+esc(day.slice(5).replace('-',' / '))+'</span><span>'+ts.length+' 筆紀錄</span></div><div class="record-list">'+recent(ts,1000)+'</div>';}).join('')+(!days.length?'<div class="daily-empty">目前條件下還沒有紀錄。</div>':'')+'</main>';
}
function stats(){
 const s=monthRows(),expenses=s.rows.filter(t=>t.type==='expense'),items=CATEGORIES.map(c=>({...c,total:expenses.filter(t=>t.category===c.id).reduce((a,t)=>a+own(t),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
 let acc=0;const gradient=items.map(c=>{const start=acc;acc+=c.total/(s.expense||1)*100;return c.color+' '+start+'% '+acc+'%';}).join(',')||'#EEEBDD 0% 100%';
 const days=chartDays(state.month);
 const values=days.map(day=>expenses.filter(t=>t.date===state.month+'-'+day).reduce((a,t)=>a+own(t),0)),max=Math.max(1,...values);
 return header('生活統計','看懂花費，照自己的步調生活。')+'<main class="daily-body"><div class="month-strip">'+monthNav()+'<span class="mini-label">個人花費</span></div><section class="station-card chart-card"><div class="mini-label">本月支出</div><div class="ticket-main" style="font-size:30px;margin-top:4px"><small>NT$</small>'+money(s.expense)+'</div><div class="ticket-divider"></div><div class="daily-label">花在哪些地方？</div><div class="ring-row"><div class="daily-ring" style="background:conic-gradient('+gradient+')"><span>本月共記下<b>'+expenses.length+'</b>筆日常</span></div><div class="chart-legend">'+items.map(c=>'<div><i style="background:'+c.color+'"></i>'+c.label+'<strong>'+Math.round(c.total/(s.expense||1)*100)+'%</strong></div>').join('')+'</div></div></section><div class="section-row"><h2>分類花費</h2><span class="mini-label">分帳只計自己的負擔</span></div><section class="station-card chart-card">'+(items.map(c=>'<div class="row"><span style="font-size:11px">'+c.icon+' '+c.label+'</span><span class="record-value">NT$ '+money(c.total)+'</span></div><div class="horizontal-bar"><i style="width:'+(c.total/(s.expense||1)*100)+'%;background:'+c.color+'"></i></div>').join('')||'<div class="daily-empty">記下第一筆支出後，就能看到統計。</div>')+'</section><div class="section-row"><h2>本月每日支出</h2><span class="mini-label">每日個人支出</span></div><section class="station-card chart-card"><div class="week-chart">'+values.map((v,i)=>'<div><i style="height:'+Math.max(3,v/max*70)+'px" title="NT$ '+money(v)+'"></i>'+days[i]+'</div>').join('')+'</div></section></main>';
}
function splitPage(){
 const net=state.sharedNet||0;
 return header('一起分帳','聚餐、共同生活與旅行，需要時再加入。',false)+'<main class="daily-body"><section class="split-intro"><div class="graphic">🍽️</div><h2>一起花，也能算清楚。</h2><p>共用帳本可邀請朋友、記錄代墊與計算結算。<br>個人統計只計入自己應負擔的部分。</p><div class="split-actions"><button data-action="shared" data-mode="create">＋ 建立分帳</button><button data-action="shared" data-mode="join">加入朋友的帳</button></div></section><section class="station-card two-numbers"><div><span class="mini-label">共用帳本</span><strong>'+state.groups.length+' 本</strong></div><div><span class="mini-label">'+(net<0?'我待付':'我待收')+'</span><strong>NT$ '+money(Math.abs(net))+'</strong></div></section><div class="section-row"><h2>我的分帳</h2></div>'+state.groups.map(g=>'<section class="station-card split-group" style="margin-bottom:12px"><h3>'+esc(g.name)+'</h3><p>'+g.memberUids.length+' 位已加入的成員</p><button class="btn ghost full" data-action="shared" data-id="'+esc(g.id)+'">進入共用帳本 ›</button></section>').join('')+(!state.groups.length?'<div class="daily-empty">尚未建立或加入共用帳本。</div>':'')+'<p class="daily-footer-note">這裡顯示帳目計算，不會執行實際轉帳。<br>同名成員可能造成歸屬不明，請在共用帳本使用不同名字。</p></main>';
}
function me(){
 return header('我的生活帳本','把記帳，調整成適合自己的樣子。',false)+'<main class="daily-body"><section class="station-card profile-row"><div class="profile-circle">'+esc((ctx?.user.displayName||'我').charAt(0))+'</div><div><h2>'+esc(ctx?.user.displayName||'日常旅人')+'</h2><div class="mini-label">個人帳本 · 新台幣 TWD</div></div></section><div class="section-row"><h2>這個月的計畫</h2></div><section class="station-card"><button class="settings-row" data-action="budget-modal"><span>每月預算</span><small>NT$ '+money(state.budget)+'　›</small></button><div class="settings-row"><span>統計範圍</span><small>我的個人負擔</small></div></section><div class="section-row"><h2>我的帳戶</h2><span class="mini-label">用來區分付款方式</span></div><section class="station-card">'+Object.entries(ACCOUNT).map(([id,a])=>'<div class="account-row"><span>'+a.icon+'</span><div><strong>'+a.label+'</strong><small>本月 '+state.records.filter(t=>t.account===id&&t.date.slice(0,7)===state.month).length+' 筆紀錄</small></div></div>').join('')+'</section><div class="section-row"><h2>偏好設定</h2></div><section class="station-card"><div class="settings-row"><span>主題</span><small>江之電 · 海岸白天</small></div><button class="settings-row" data-action="arrival"><span>江之電進場畫面</span><small>重播　›</small></button><div class="settings-row"><span>記帳預設</span><small>個人支出</small></div><button class="settings-row" data-action="logout"><span>登出帳號</span><small>›</small></button></section><p class="daily-footer-note">Tallo — 日常的每一站<br>帳目儲存在自己的 Firebase 帳號中。</p></main>';
}
function draft(){return state.draft??{type:'expense',amount:'',category:'food',account:'cash',date:today(),note:'',split:false,count:3,group:state.groups[0]?.id};}
function addPage(){
 const d=draft();
 return '<header class="daily-header"><div class="heading-line"><div style="display:flex;align-items:center"><button class="daily-back" data-action="back" aria-label="返回">‹</button><div><h1>記一筆日常</h1><p>先記下來，再繼續今天的旅程。</p></div></div><span class="group-pill">個人帳本</span></div></header><form id="dailyEntry" class="daily-form">'+(state.error?'<div class="daily-error" role="alert">'+esc(state.error)+'</div>':'')+'<div class="type-segment"><button type="button" class="'+(d.type==='expense'?'active':'')+'" data-action="entry-type" data-id="expense">支出</button><button type="button" class="'+(d.type==='income'?'active':'')+'" data-action="entry-type" data-id="income">收入</button></div><div class="daily-amount"><label for="entryAmount">金額 / AMOUNT</label><div class="amount-input-row"><span>NT$</span><input id="entryAmount" name="amount" inputmode="numeric" type="text" value="'+esc(d.amount)+'" placeholder="0" autocomplete="off" required aria-label="金額"></div></div><div class="daily-label">分類</div><div class="daily-category-grid">'+CATEGORIES.map(c=>'<button type="button" data-action="entry-category" data-id="'+c.id+'" class="'+(c.id===d.category?'active':'')+'"><span>'+c.icon+'</span>'+c.label+'</button>').join('')+'</div><div class="daily-field-pair"><div class="daily-field"><label for="entryDate">日期</label><input id="entryDate" name="date" type="date" value="'+esc(d.date)+'" required></div><div class="daily-field"><label for="entryAccount">'+(d.type==='expense'?'付款帳戶':'存入帳戶')+'</label><select id="entryAccount" name="account">'+Object.entries(ACCOUNT).filter(([id])=>id!=='shared').map(([id,a])=>'<option value="'+id+'" '+(id===d.account?'selected':'')+'>'+a.label+'</option>').join('')+'</select></div></div><div class="daily-field"><label for="entryNote">備註</label><input id="entryNote" name="note" value="'+esc(d.note)+'" placeholder="這一筆，記下什麼日常？" maxlength="120"></div>'+(d.type==='expense'?'<button class="split-toggle" type="button" data-action="shared" data-mode="add"><span><strong>這筆要分帳</strong><small>前往共用帳本選擇付款人與分攤成員</small></span><span>›</span></button>':'')+'<div class="daily-save"><button type="submit">儲存'+(d.type==='income'?'收入':'這筆日常')+'</button></div></form>';
}
function modal(){
 if(!state.modal)return '';
 let body='',title='';
 if(state.modal==='budget'){title='每月的小小計畫';body='<p>設定每月支出預算，首頁會顯示還可以使用的金額。</p><form id="budgetForm"><div class="daily-field"><label for="budgetInput">每月預算（NT$）</label><input id="budgetInput" name="budget" type="number" min="1" max="10000000" value="'+state.budget+'" required></div><button class="modal-primary" type="submit">套用預算</button></form>';}
 return '<div class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><section><div class="row"><h2 id="modalTitle">'+title+'</h2><button class="auth-error-close" data-action="close-modal" aria-label="關閉">×</button></div>'+(state.error?'<div class="daily-error" role="alert">'+esc(state.error)+'</div>':'')+body+'</section></div>';
}
function render(preserve=false){
 const scroller=document.getElementById('phoneScroll'),y=scroller.scrollTop;
 const views={home,list:ledger,stats,split:splitPage,me,add:addPage};
 const root=document.getElementById('dailyApp');if(!root)return;if(!readyEntries||!readyBudget){root.innerHTML=state.syncError?'<div class="daily-error" role="alert">'+esc(state.syncError)+'<button data-action="retry">重新連線</button></div>':'<div class="spinner" role="status">正在同步個人帳本…</div>';return;}root.innerHTML=(state.syncError?'<div class="daily-error" role="alert">'+esc(state.syncError)+'</div>':'')+views[state.view]()+(state.view==='add'?'':nav())+modal()+(state.toast?'<div class="daily-toast" role="status">'+esc(state.toast)+'</div>':'');
 if(preserve)scroller.scrollTop=y;
 if(state.modal)setTimeout(()=>document.querySelector('.preview-modal input')?.focus(),0);
}
function startEntry(category,group){
 state.returnView=state.view;state.draft={type:'expense',amount:'',category:category||'food',account:'cash',date:today(),note:'',split:!!group,group:group||state.groups[0]?.id,count:state.groups.find(g=>g.id===group)?.count||3};navigate('add');
}
document.addEventListener('input',event=>{
 if(!event.target.closest('#dailyEntry'))return;
 const key=event.target.name;if(!key)return;state.error='';document.querySelector('.daily-error')?.remove();
 // Raw money input is validated on submit; do not silently change its value.
 state.draft={...draft(),[key]:event.target.value};
 const hint=document.getElementById('shareHint');if(hint)hint.innerHTML=shareHint(draft());
});
document.addEventListener('change',event=>{
 if(event.target.name==='group'&&event.target.closest('#dailyEntry')){state.draft.count=state.groups.find(g=>g.id===event.target.value)?.count||3;render(true);}
});
document.addEventListener('click',event=>{
 const b=event.target.closest('#dailyApp [data-action]');if(!b||state.busy)return;const a=b.dataset.action;if(a==='arrival'){ctx.arrival?.();return;}if(a==='retry'){location.reload();return;}if(a==='shared'){ctx.goShared(b.dataset.mode||'open',b.dataset.id);return;}if(a==='logout'){ctx.logout();return;}
 if(a==='nav')navigate(b.dataset.view);
 if(a==='add')startEntry(b.dataset.category);
 if(a==='back'){state.draft=null;navigate(state.returnView);}
 if(a==='filter'){state.filter=b.dataset.id;render(true);}
 if(a==='kind'){state.kind=b.dataset.id;render(true);}
 if(a==='month'){const [y,m]=state.month.split('-').map(Number),d=new Date(y,m-1+Number(b.dataset.step),1);state.month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render(true);}
 if(a==='entry-type'){state.draft={...draft(),type:b.dataset.id,split:false};render(true);}
 if(a==='entry-category'){state.draft={...draft(),category:b.dataset.id};render(true);}
 if(a==='budget-modal'){state.modal='budget';render(true);}
 if(a==='close-modal'){state.modal=null;render(true);}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.closest('#dailyApp'))return;event.preventDefault();if(state.busy)return;
 state.busy=true;state.error='';const buttons=[...form.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 let status=document.createElement('p');status.className='daily-save-status';status.setAttribute('role','status');status.textContent='正在儲存，請勿關閉頁面…';form.append(status);
 try{if(form.id==='dailyEntry')await persistEntry();else if(form.id==='budgetForm')await persistBudget(form);}
 catch(e){state.error=e.message;render(true);}
 finally{state.busy=false;status.remove();buttons.forEach(b=>b.disabled=false);}
});


let ctx=null,userId=null,cleanups=[],personal=[],shared=new Map(),groupStops=new Map(),sharedPaid=0,sharedOwed=0;
let readyEntries=false,readyBudget=false;
function syncError(e){state.syncError=e?.code==='permission-denied'?'沒有讀寫權限，請確認目前帳號及資料庫規則。':(e?.message||'同步失敗，請檢查連線');render(true);}
function rebuild(){
 const allShared=[...shared.values()].flat();sharedPaid=allShared.reduce((s,e)=>s+e.paid,0);sharedOwed=allShared.reduce((s,e)=>s+e.owed,0);
 state.records=[...personal,...[...shared.values()].flat()];
 state.sharedNet=sharedPaid-sharedOwed;
 if(state.view!=='add'&&!state.modal)render(true);
}
function clearDaily(){for(const stop of cleanups)stop();cleanups=[];for(const stops of groupStops.values())for(const stop of stops)stop();groupStops.clear();shared.clear();personal=[];userId=null;}
export function leaveDaily(){clearDaily();state={view:'home',month:currentMonth,budget:18000,filter:'all',kind:'all',returnView:'home',records:[],groups:[],draft:null,modal:null,error:'',toast:'',syncError:''};}
export function mountDaily(options){
 ctx=options;
 if(userId!==ctx.user.uid){
  clearDaily();userId=ctx.user.uid;readyEntries=false;readyBudget=false;state.records=[];state.groups=[];state.syncError='';
  const {collection,doc,onSnapshot,query,where}=ctx.api,db=ctx.db,uid=userId;
  cleanups.push(onSnapshot(collection(db,'users',uid,'entries'),snap=>{
   personal=snap.docs.map(d=>({...d.data(),id:d.id,split:null})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));readyEntries=true;rebuild();
  },syncError));
  cleanups.push(onSnapshot(doc(db,'users',uid,'settings','budget'),snap=>{
   state.budget=snap.exists()?snap.data().amount:18000;readyBudget=true;if(state.view!=='add'&&!state.modal)render(true);
  },syncError));
  cleanups.push(onSnapshot(query(collection(db,'groups'),where('memberUids','array-contains',uid)),{includeMetadataChanges:true},snap=>{if(snap.metadata.hasPendingWrites)return;
   const ids=new Set(snap.docs.map(d=>d.id));
   for(const [gid,stops] of groupStops)if(!ids.has(gid)){for(const stop of stops)stop();groupStops.delete(gid);for(const key of shared.keys())if(key.startsWith(gid+'/'))shared.delete(key);}
   state.groups=snap.docs.map(d=>({...d.data(),id:d.id}));
   for(const gd of snap.docs){
    const gid=gd.id,g=gd.data(),name=g.memberNames?.[uid];
    if(groupStops.has(gid))continue;
    const stops=[],tripStops=new Map();groupStops.set(gid,stops);
    stops.push(()=>{for(const stop of tripStops.values())stop();});
    stops.push(onSnapshot(collection(db,'groups',gid,'trips'),{includeMetadataChanges:true},ts=>{if(ts.metadata.hasPendingWrites)return;
     const tids=new Set(ts.docs.map(d=>d.id));
     for(const [tid,stop] of tripStops)if(!tids.has(tid)){stop();tripStops.delete(tid);shared.delete(gid+'/'+tid);}
     for(const td of ts.docs){
      const tid=td.id,trip=td.data(),key=gid+'/'+tid;
      const apply=docs=>{
       shared.set(key,sharedRecordRows(gid,tid,trip,docs,name));
       const all=[...shared.values()].flat();sharedPaid=all.reduce((s,e)=>s+e.paid,0);sharedOwed=all.reduce((s,e)=>s+e.owed,0);rebuild();
      };
      if(tripStops.has(tid)){tripStops.get(tid)();tripStops.delete(tid);}
      tripStops.set(tid,onSnapshot(collection(db,'groups',gid,'trips',tid,'expenses'),es=>apply(es.docs.map(d=>({...d.data(),id:d.id}))),syncError));
     }
     rebuild();
    },syncError));
   }
   rebuild();
  },syncError));
 }
 render(true);
}
async function persistEntry(){
 const d=draft(),record={id:crypto.randomUUID(),date:d.date,type:d.type,amount:parseAmount(d.amount),category:d.category,note:d.note.trim(),account:d.account,split:null,createdAt:Date.now()};
 validateRecord(record);
 if(!readyEntries||state.syncError)throw new Error('帳本尚未完成同步，請稍後重試');
 await ctx.api.setDoc(ctx.api.doc(ctx.db,'users',userId,'entries',record.id),record);
 state.month=record.date.slice(0,7);state.draft=null;state.view='home';state.error='';notify('已儲存這筆'+(record.type==='income'?'收入':'日常'));
}
async function persistBudget(form){
 const n=Number(new FormData(form).get('budget'));
 if(!Number.isSafeInteger(n)||n<1||n>10000000)throw new Error('預算需為 1 至 10,000,000 的整數');
 if(!readyBudget||state.syncError)throw new Error('預算尚未完成同步，請稍後重試');
 await ctx.api.setDoc(ctx.api.doc(ctx.db,'users',userId,'settings','budget'),{amount:n});
 state.budget=n;state.modal=null;notify('預算已儲存');
}
