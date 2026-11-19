
export const CATEGORIES = [
 {id:'food',label:'餐飲',icon:'🍜',color:'#D63A22'},
 {id:'transport',label:'交通',icon:'🚃',color:'#1F7A52'},
 {id:'daily',label:'日用品',icon:'🧺',color:'#A8823D'},
 {id:'shopping',label:'購物',icon:'🛍',color:'#648D88'},
 {id:'home',label:'居家',icon:'🏡',color:'#6580A0'},
 {id:'fun',label:'娛樂',icon:'🎟',color:'#B77A69'},
 {id:'health',label:'健康',icon:'🌿',color:'#789559'},
 {id:'other',label:'其他',icon:'⋯',color:'#8A8474'}
];
export const money=n=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);
export function summarize(records,month,budget){
 const rows=records.filter(t=>t.date.slice(0,7)===month);
 const expense=Math.round(rows.filter(t=>t.type==='expense').reduce((s,t)=>s+(t.split?shares(t.amount,t.split.count)[0]:t.amount),0)*100)/100;
 const income=rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
 return {rows,expense,income,balance:income-expense,remaining:budget-expense,ratio:budget>0?expense/budget:0};
}
export function shares(total,count){
 if(!Number.isInteger(total)||total<=0||!Number.isInteger(count)||count<1||count>20) throw new Error('分攤金額或人數不正確');
 const cents=Math.round(total*100),base=Math.floor(cents/count),rest=cents%count;
 return Array.from({length:count},(_,i)=>(base+(i<rest?1:0))/100);
}
export function validateRecord(record, catalog={categories:CATEGORIES,accounts:DEFAULT_ACCOUNTS}, original=null){
 if(!['expense','income'].includes(record.type)||!Number.isSafeInteger(record.amount)||record.amount<=0||record.amount>10000000) throw new Error('請輸入 1 至 10,000,000 元的整數金額');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||Number.isNaN(Date.parse(record.date+'T00:00:00Z'))||new Date(record.date+'T00:00:00Z').toISOString().slice(0,10)!==record.date)throw new Error('請選擇有效日期');
 if(!catalog.categories.some(c=>c.id===record.category&&(!c.archived||original?.category===record.category))||!catalog.accounts.some(c=>c.id===record.account&&(!c.archived||original?.account===record.account)))throw new Error('請選擇分類與帳戶');
 if(typeof record.note!=='string'||record.note.length>120)throw new Error('備註最多 120 字');
 if(record.split && (record.type!=='expense'||!Number.isInteger(record.split.count)||record.split.count<2||record.split.count>20))throw new Error('分帳人數需為 2 至 20 人');
 return record;
}
export function seedRecords(month){
 const make=(id,day,amount,category,note,account='card',type='expense')=>({id,date:month+'-'+String(day).padStart(2,'0'),amount,category,note,account,type,split:null});
 return [
 make('r1',19,150,'food','午餐・巷口食堂','cash'),
 make('r2',19,50,'transport','捷運通勤','cash'),
 make('r3',19,95,'food','早晨的拿鐵'),
 make('r4',18,620,'daily','超市補貨'),
 make('r5',18,390,'fun','影音訂閱'),
 make('r6',17,280,'food','下班後的晚餐'),
 make('r7',16,599,'home','手機月租費','bank'),
 make('r8',15,460,'daily','洗衣精與衛生紙'),
 make('r9',12,500,'transport','交通卡加值','cash'),
 make('r10',5,8500,'home','這個月的房租','bank'),
 make('r11',8,1200,'home','水電費','bank'),
 make('r12',10,130,'food','午餐','cash'),
 make('r13',11,360,'fun','週末看電影'),
 make('r14',5,42000,'other','薪資入帳','bank','income')];
}

// Preserve raw input until validation; never turn 12.5 into 125 or -5 into 5.
export function parseAmount(raw){
 if(typeof raw!=='string'||!/^\d+$/.test(raw))throw new Error('請輸入 1 至 10,000,000 元的整數金額');
 const value=Number(raw);if(!Number.isSafeInteger(value)||value<1||value>10000000)throw new Error('請輸入 1 至 10,000,000 元的整數金額');return value;
}
export function splitHint(amount,count){
 if(!Number.isSafeInteger(amount)||amount<1||amount>10000000||!Number.isInteger(count)||count<2||count>20)return null;
 const own=shares(amount,count)[0];return {own,receivable:Math.round((amount-own)*100)/100};
}
export function initialPreview(month){
 return {month,budget:18000,filter:'all',kind:'all',returnView:'home',records:[...seedRecords(month),{id:'r15',date:month+'-16',amount:1260,category:'food',note:'週末和朋友吃飯',account:'card',type:'expense',split:{group:'g1',count:3}}],groups:[{id:'g1',name:'週末聚餐',count:3}],draft:null,modal:null,error:'',toast:''};
}
export function chartDays(month){return Array.from({length:new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate()},(_,i)=>String(i+1).padStart(2,'0'));}

export function sharedRecordRows(gid,tid,trip,docs,name){
 const merged=new Map([...(trip.expenses||[]),...docs].map(e=>[e.id,e]));
 return [...merged.values()].map(e=>{
  const ps=e.shares||Object.fromEntries((e.participants||[]).map(p=>[p.name,p.amount]));
  const mine=Number(ps[name]||0),paid=e.payer===name?Number(e.amount):0;
  return {id:'shared:'+gid+':'+tid+':'+e.id,date:e.date,type:'expense',amount:mine,category:({FOOD:'food',TRANSPORT:'transport',HOTEL:'home',SHOPPING:'shopping',TICKET:'fun',OTHER:'other'})[e.category]||'other',note:e.note||trip.name,account:'shared',split:null,shared:true,paid,owed:mine,groupId:gid,tripId:tid};
 });
}

export const DEFAULT_ACCOUNTS=[
 {id:'cash',label:'現金',icon:'👛',color:'#1F7A52'},
 {id:'card',label:'信用卡',icon:'💳',color:'#648D88'},
 {id:'bank',label:'銀行帳戶',icon:'🏦',color:'#6580A0'}
];
export const ITEM_ICONS=['🍜','🍱','🍽️','☕','🧋','🥐','🛒','🧺','🛍','👕','👟','💄','🏡','💡','📱','💻','🚃','🚌','🚕','🚗','🛵','🚲','✈️','⛽','🎟','🎮','🎬','🎵','📚','🎓','🌿','🏥','💊','🏋️','🐶','🐱','🎁','❤️','👶','👥','👛','💳','🏦','💵','🪙','📲','💰','💼','📈','🍀','🌊','⋯'];
export const ITEM_COLORS=['#D63A22','#1F7A52','#A8823D','#648D88','#6580A0','#B77A69','#789559','#8A8474'];
export function validateCatalogItem(item){
 if(typeof item.label!=='string'||!item.label.trim()||item.label.length>24)throw new Error('名稱請填寫 1 至 24 字');
 if(typeof item.icon!=='string'||!item.icon.trim()||item.icon.length>16||/[<>&"'\s]/u.test(item.icon))throw new Error('請挑選圖標，或輸入一個表情符號');
 if(typeof item.color!=='string'||!/^#[0-9A-Fa-f]{6}$/.test(item.color))throw new Error('請選擇有效顏色');
 if(typeof item.archived!=='boolean'||!Number.isFinite(item.updatedAt))throw new Error('項目格式不正確');
 return {...item,label:item.label.trim()};
}
export function catalogItems(defaults,overrides=[]){
 const map=new Map(defaults.map(x=>[x.id,{...x,archived:false}]));
 for(const x of overrides){try{map.set(x.id,validateCatalogItem(x));}catch{}}
 return [...map.values()];
}
export function catalogItem(items,id){
 return items.find(x=>x.id===id)||{id,label:'未命名項目',icon:'⋯',color:'#8A8474',archived:true};
}
export function checkCatalogChange(items,item){
 const valid=validateCatalogItem(item);
 if(items.some(x=>x.id!==item.id&&x.label.trim()===valid.label))throw new Error('已有相同名稱，請換一個名稱');
 if(valid.archived&&!items.some(x=>x.id!==item.id&&!x.archived))throw new Error('至少保留一個可用項目');
 return valid;
}
