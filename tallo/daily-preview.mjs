
import {CATEGORIES,money,summarize,shares,validateRecord,seedRecords,parseAmount,splitHint,initialPreview,chartDays} from './daily-model.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const currentMonth=today().slice(0,7),monthTitle=m=>Number(m.slice(0,4))+' 年 '+Number(m.slice(5))+' 月';
const ACCOUNT={cash:{label:'現金',icon:'👛'},card:{label:'信用卡',icon:'💳'},bank:{label:'銀行帳戶',icon:'🏦'}};
const ICON={
 home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
 list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 stats:'<path d="M4 20h16M7 16v-5M12 16V5M17 16V8"/>',
 split:'<path d="M4 7h15l-3-3M20 17H5l3 3M18 7v4M6 17v-4"/>',
 me:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>'
};
const TABS=[['home','首頁'],['list','明細'],['stats','統計'],['split','分帳'],['me','我的']];
const TRAIN='<svg class="coast-train" viewBox="0 0 210 55" aria-hidden="true"><rect x="3" y="7" width="204" height="34" rx="9" fill="#1F7A52"/><rect x="3" y="24" width="204" height="9" fill="#FFF3C4"/>'+Array.from({length:7},(_,i)=>'<rect x="'+(12+i*27)+'" y="12" width="20" height="9" rx="2" fill="#DFF6FF"/>').join('')+'<circle cx="25" cy="45" r="5" fill="#26372c"/><circle cx="185" cy="45" r="5" fill="#26372c"/><text x="108" y="39" text-anchor="middle" font-size="5" fill="#FFF3C4" letter-spacing="2">ENODEN</text></svg>';
let state={view:'home',...initialPreview(currentMonth)};
let toastTimer;
const own=t=>t.split?shares(t.amount,t.split.count)[0]:t.amount;
const cat=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES.at(-1);
const monthRows=()=>summarize(state.records,state.month,state.budget);
function fitPhone(){
 const scale=Math.max(.2,Math.min((innerWidth-44)/402,(innerHeight-44)/874,1.15));
 const stage=document.getElementById('phoneStage'),frame=document.querySelector('.phone-frame');
 stage.style.width=402*scale+'px';stage.style.height=874*scale+'px';frame.style.transform='scale('+scale+')';
}
function notify(text){state.toast=text;render(true);clearTimeout(toastTimer);toastTimer=setTimeout(()=>{state.toast='';render(true)},2200);}
function navigate(view){state.view=view;state.error='';state.modal=null;render();document.getElementById('phoneScroll').scrollTo(0,0);}
function monthNav(){return '<div class="month-control"><button data-action="month" data-step="-1" aria-label="上個月">‹</button><strong>'+esc(monthTitle(state.month))+'</strong><button data-action="month" data-step="1" aria-label="下個月">›</button></div>';}
function header(title,subtitle,add=true){return '<header class="daily-header"><div class="heading-line"><div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+(add?'<button class="small-add" data-action="add" aria-label="新增一筆">＋</button>':'<span class="group-pill">設計預覽</span>')+'</div></header>';}
function nav(){return '<nav class="daily-nav" aria-label="主要導覽">'+TABS.map(([id,label])=>'<button data-action="nav" data-view="'+id+'" class="'+(state.view===id?'active':'')+'" aria-current="'+(state.view===id?'page':'false')+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[id]+'</svg>'+label+'</button>').join('')+'</nav>';}
function row(t){
 const c=cat(t.category);
 return '<div class="record-item"><div class="record-emoji">'+(t.type==='income'?'↙':c.icon)+'</div><div class="record-text"><strong>'+esc(t.note||c.label)+(t.split?'<span class="shared-mark">分帳</span>':'')+'</strong><small>'+esc(t.date.slice(5).replace('-','/'))+' · '+esc(ACCOUNT[t.account].label)+(t.split?' · 我負擔 '+money(own(t)):'')+'</small></div><div class="record-value '+(t.type==='income'?'income':'')+'">'+(t.type==='income'?'+':'−')+money(own(t))+'</div></div>';
}
function recent(rows,max){const sorted=[...rows].reverse().sort((a,b)=>b.date.localeCompare(a.date));return sorted.slice(0,max).map(row).join('');}
function home(){
 const s=monthRows(),todayExpense=state.records.filter(t=>t.date===today()&&t.type==='expense').reduce((a,t)=>a+own(t),0);
 return '<header class="daily-hero"><div class="daily-brand">Tallo</div><div class="daily-kicker">日常的每一站 ・ DAILY JOURNAL</div><span class="daily-preview-badge">設計預覽</span><div class="daily-greeting">把日子，慢慢記下來。</div><div class="daily-subtitle">一杯咖啡、一趟通勤，都是生活的軌跡。</div>'+TRAIN+'</header><main class="daily-body home-body"><section class="station-card month-ticket"><div class="ticket-eyebrow"><span>生活乘車券 / THIS MONTH</span>'+monthNav()+'</div><div class="ticket-caption">本月支出</div><div class="ticket-main"><small>NT$</small>'+money(s.expense)+'</div><div class="ticket-divider"></div><div class="ticket-bottom"><div><div class="mini-label">預算'+(s.remaining<0?'已超出':'還可以用')+'</div><div class="value" '+(s.remaining<0?'style="color:#D63A22"':'')+'>NT$ '+money(Math.abs(s.remaining))+'</div></div><div style="text-align:right"><div class="mini-label">今天花了</div><div class="value" style="color:#17251F">NT$ '+money(todayExpense)+'</div></div></div><div class="budget-track"><i style="width:'+Math.min(100,s.ratio*100)+'%;'+(s.ratio>1?'background:#D63A22':'')+'"></i></div><div class="budget-line"><span>每月預算 NT$ '+money(state.budget)+'</span><b>'+Math.round(s.ratio*100)+'%</b></div></section><button class="quick-add" data-action="add"><span>＋</span> 記一筆日常</button><p class="daily-caption">自己的帳，打開就能記。</p><div class="section-row"><h2>快速記帳</h2><span class="mini-label">從生活的小事開始</span></div><div class="daily-category-row">'+CATEGORIES.slice(0,4).map(c=>'<button class="daily-shortcut" data-action="add" data-category="'+c.id+'"><span>'+c.icon+'</span>'+c.label+'</button>').join('')+'</div><div class="section-row"><h2>最近的日常</h2><button data-action="nav" data-view="list">全部明細 ›</button></div><section class="record-list">'+(recent(s.rows,3)||'<div class="daily-empty">這個月還沒記帳，從第一筆開始吧。</div>')+'</section><p class="daily-footer-note">江之電陪你，記下每一站生活。<br>範例帳目預覽 · 所有操作僅暫存本頁</p></main>';
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
 const shared=state.records.filter(t=>t.split),paid=shared.reduce((a,t)=>a+t.amount,0),personal=shared.reduce((a,t)=>a+own(t),0);
 return header('一起分帳','需要的時候，再把朋友加進來。',false)+'<main class="daily-body"><section class="split-intro"><div class="graphic">🍽️</div><h2>一起花，也能算清楚。</h2><p>聚餐、共同生活或旅行都可以分帳。<br>平常的個人記帳，照常繼續。</p><div class="split-actions"><button data-action="group-modal">＋ 建立分帳</button><button data-action="invite-modal">加入朋友的帳</button></div></section><section class="station-card two-numbers"><div><span class="mini-label">我已代墊</span><strong>NT$ '+money(paid)+'</strong></div><div><span class="mini-label">待收回</span><strong style="color:#1F7A52">NT$ '+money(paid-personal)+'</strong></div></section><div class="section-row"><h2>我的分帳</h2><span class="mini-label">'+state.groups.length+' 本共用帳</span></div>'+state.groups.map(g=>{const rows=shared.filter(t=>t.split.group===g.id),total=rows.reduce((a,t)=>a+t.amount,0);return '<section class="station-card split-group" style="margin-bottom:11px"><div class="row"><h3>'+esc(g.name)+'</h3><span class="group-pill">'+g.count+' 人分帳</span></div><p>'+rows.length+' 筆代墊 · 共 NT$ '+money(total)+'<br>個人帳本只計入自己應負擔的部分。</p><button class="btn ghost full" data-action="group-add" data-id="'+esc(g.id)+'">＋ 新增這本分帳的支出</button></section>';}).join('')+'<p class="daily-footer-note">此版可預覽平均分攤；邀請與轉帳尚未連接正式服務。</p></main>';
}
function me(){
 return header('我的生活帳本','把記帳，調整成適合自己的樣子。',false)+'<main class="daily-body"><section class="station-card profile-row"><div class="profile-circle">昱</div><div><h2>日常旅人</h2><div class="mini-label">個人帳本 · 新台幣 TWD</div></div></section><div class="section-row"><h2>這個月的計畫</h2></div><section class="station-card"><button class="settings-row" data-action="budget-modal"><span>每月預算</span><small>NT$ '+money(state.budget)+'　›</small></button><div class="settings-row"><span>統計範圍</span><small>我的個人負擔</small></div></section><div class="section-row"><h2>我的帳戶</h2><span class="mini-label">用來區分付款方式</span></div><section class="station-card">'+Object.entries(ACCOUNT).map(([id,a])=>'<div class="account-row"><span>'+a.icon+'</span><div><strong>'+a.label+'</strong><small>本月 '+state.records.filter(t=>t.account===id&&t.date.slice(0,7)===state.month).length+' 筆紀錄</small></div></div>').join('')+'</section><div class="section-row"><h2>偏好設定</h2></div><section class="station-card"><div class="settings-row"><span>主題</span><small>江之電 · 海岸白天</small></div><div class="settings-row"><span>記帳預設</span><small>個人支出</small></div><button class="settings-row" data-action="reset-modal"><span>重設範例紀錄</span><small>僅此預覽　›</small></button></section><p class="daily-footer-note">Tallo — 日常的每一站<br>設計預覽，不會存取你的正式帳務或登入資料。</p></main>';
}
function draft(){return state.draft??{type:'expense',amount:'',category:'food',account:'cash',date:today(),note:'',split:false,count:3,group:state.groups[0]?.id};}
function addPage(){
 const d=draft();
 return '<header class="daily-header"><div class="heading-line"><div style="display:flex;align-items:center"><button class="daily-back" data-action="back" aria-label="返回">‹</button><div><h1>記一筆日常</h1><p>先記下來，再繼續今天的旅程。</p></div></div><span class="group-pill">個人帳本</span></div></header><form id="dailyEntry" class="daily-form">'+(state.error?'<div class="daily-error" role="alert">'+esc(state.error)+'</div>':'')+'<div class="type-segment"><button type="button" class="'+(d.type==='expense'?'active':'')+'" data-action="entry-type" data-id="expense">支出</button><button type="button" class="'+(d.type==='income'?'active':'')+'" data-action="entry-type" data-id="income">收入</button></div><div class="daily-amount"><label for="entryAmount">金額 / AMOUNT</label><div class="amount-input-row"><span>NT$</span><input id="entryAmount" name="amount" inputmode="numeric" type="text" value="'+esc(d.amount)+'" placeholder="0" autocomplete="off" required aria-label="金額"></div></div><div class="daily-label">分類</div><div class="daily-category-grid">'+CATEGORIES.map(c=>'<button type="button" data-action="entry-category" data-id="'+c.id+'" class="'+(c.id===d.category?'active':'')+'"><span>'+c.icon+'</span>'+c.label+'</button>').join('')+'</div><div class="daily-field-pair"><div class="daily-field"><label for="entryDate">日期</label><input id="entryDate" name="date" type="date" value="'+esc(d.date)+'" required></div><div class="daily-field"><label for="entryAccount">'+(d.type==='expense'?'付款帳戶':'存入帳戶')+'</label><select id="entryAccount" name="account">'+Object.entries(ACCOUNT).map(([id,a])=>'<option value="'+id+'" '+(id===d.account?'selected':'')+'>'+a.label+'</option>').join('')+'</select></div></div><div class="daily-field"><label for="entryNote">備註</label><input id="entryNote" name="note" value="'+esc(d.note)+'" placeholder="這一筆，記下什麼日常？" maxlength="120"></div>'+(d.type==='expense'?'<button class="split-toggle" type="button" data-action="entry-split" aria-pressed="'+d.split+'"><span><strong>這筆要分帳</strong><small>預設只記自己，需要時再開啟</small></span><i class="toggle-switch" aria-hidden="true"></i></button>'+(d.split?'<section class="split-options"><div class="daily-field"><label for="entryGroup">分帳帳本</label><select id="entryGroup" name="group">'+state.groups.map(g=>'<option value="'+esc(g.id)+'" '+(g.id===d.group?'selected':'')+'>'+esc(g.name)+'</option>').join('')+'</select></div><div class="daily-field"><label for="entryCount">平均分攤人數（包含自己）</label><input id="entryCount" name="count" type="number" min="2" max="20" value="'+d.count+'"></div><p id="shareHint">'+shareHint(d)+'</p></section>':''):'')+'<div class="daily-save"><button type="submit">儲存'+(d.type==='income'?'收入':'這筆日常')+'</button></div></form>';
}
function shareHint(d){const amount=Number(d.amount);if(!Number.isSafeInteger(amount)||amount<=0||Number(d.count)<2||Number(d.count)>20)return '輸入總金額後，會顯示自己的分攤金額。';const split=splitHint(amount,Number(d.count));if(!split)return '請輸入有效總金額與 2 至 20 位整數人數。';const own=split.own;return '你先付 NT$ '+money(amount)+'，個人帳本記入 NT$ '+money(own)+'。<br>其餘 NT$ '+money(amount-own)+' 會列為待收回。';}
function modal(){
 if(!state.modal)return '';
 let body='',title='';
 if(state.modal==='budget'){title='每月的小小計畫';body='<p>設定每月支出預算，首頁會顯示還可以使用的金額。</p><form id="budgetForm"><div class="daily-field"><label for="budgetInput">每月預算（NT$）</label><input id="budgetInput" name="budget" type="number" min="1" max="10000000" value="'+state.budget+'" required></div><button class="modal-primary" type="submit">套用預算</button></form>';}
 if(state.modal==='group'){title='建立一本分帳';body='<p>個人帳本保持獨立，這本帳用來記大家一起的花費。</p><form id="groupForm"><div class="daily-field"><label for="groupName">分帳名稱</label><input id="groupName" name="name" placeholder="例如：週末聚餐、合租日常" maxlength="80" required></div><div class="daily-field"><label for="groupCount">參與人數（包含自己）</label><input id="groupCount" name="count" type="number" min="2" max="20" value="3" required></div><button class="modal-primary" type="submit">建立預覽帳本</button></form>';}
 if(state.modal==='invite'){title='加入朋友的帳';body='<p>正式版會在這裡輸入朋友的邀請碼。這次先確認個人記帳與分帳的版面；預覽不會加入任何真實群組。</p>';}
 if(state.modal==='reset'){title='重設預覽紀錄？';body='<p>只會重設這個預覽頁的範例紀錄與預算，不會影響正式帳務。</p><button class="modal-primary" data-action="reset">重設範例</button>';}
 return '<div class="preview-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><section><div class="row"><h2 id="modalTitle">'+title+'</h2><button class="auth-error-close" data-action="close-modal" aria-label="關閉">×</button></div>'+body+'</section></div>';
}
function render(preserve=false){
 const scroller=document.getElementById('phoneScroll'),y=scroller.scrollTop;
 const views={home,list:ledger,stats,split:splitPage,me,add:addPage};
 document.getElementById('dailyApp').innerHTML=views[state.view]()+(state.view==='add'?'':nav())+modal()+(state.toast?'<div class="daily-toast" role="status">'+esc(state.toast)+'</div>':'');
 if(preserve)scroller.scrollTop=y;fitPhone();
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
 const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
 if(a==='nav')navigate(b.dataset.view);
 if(a==='add')startEntry(b.dataset.category);
 if(a==='group-add')startEntry('food',b.dataset.id);
 if(a==='back'){state.draft=null;navigate(state.returnView);}
 if(a==='filter'){state.filter=b.dataset.id;render(true);}
 if(a==='kind'){state.kind=b.dataset.id;render(true);}
 if(a==='month'){const [y,m]=state.month.split('-').map(Number),d=new Date(y,m-1+Number(b.dataset.step),1);state.month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');render(true);}
 if(a==='entry-type'){state.draft={...draft(),type:b.dataset.id,split:false};render(true);}
 if(a==='entry-category'){state.draft={...draft(),category:b.dataset.id};render(true);}
 if(a==='entry-split'){state.draft={...draft(),split:!draft().split};render(true);}
 if(a==='budget-modal'){state.modal='budget';render(true);}
 if(a==='group-modal'){state.modal='group';render(true);}
 if(a==='invite-modal'){state.modal='invite';render(true);}
 if(a==='reset-modal'){state.modal='reset';render(true);}
 if(a==='close-modal'){state.modal=null;render(true);}
 if(a==='reset'){Object.assign(state,initialPreview(currentMonth));notify('已重設此頁的範例紀錄');}
});
document.addEventListener('submit',event=>{
 event.preventDefault();const form=event.target;
 if(form.id==='dailyEntry'){
  const d=draft(),record={id:crypto.randomUUID(),date:d.date,type:d.type,amount:Number(d.amount),category:d.category,note:d.note.trim(),account:d.account,split:d.split?{group:d.group,count:Number(d.count)}:null};
  try{record.amount=parseAmount(d.amount);validateRecord(record);if(record.split&&!state.groups.some(g=>g.id===record.split.group))throw new Error('請選擇有效分帳帳本');state.records.push(record);state.month=record.date.slice(0,7);state.draft=null;state.view='home';state.error='';document.getElementById('phoneScroll').scrollTop=0;notify('已記下這筆'+(record.type==='income'?'收入':'日常')+'（預覽）');}
  catch(e){state.error=e.message;render(true);}
 }
 if(form.id==='budgetForm'){const n=Number(new FormData(form).get('budget'));if(Number.isSafeInteger(n)&&n>0&&n<=10000000){state.budget=n;state.modal=null;notify('預算已更新（預覽）');}}
 if(form.id==='groupForm'){const data=new FormData(form),name=String(data.get('name')).trim(),count=Number(data.get('count'));if(name&&name.length<=80&&Number.isInteger(count)&&count>=2&&count<=20){state.groups.push({id:crypto.randomUUID(),name,count});state.modal=null;notify('分帳帳本已建立（預覽）');}}
});
window.addEventListener('resize',fitPhone);
render();
