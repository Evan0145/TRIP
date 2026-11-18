
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
export function validateRecord(record){
 if(!['expense','income'].includes(record.type)||!Number.isSafeInteger(record.amount)||record.amount<=0||record.amount>10000000) throw new Error('請輸入 1 至 10,000,000 元的整數金額');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(record.date)||Number.isNaN(Date.parse(record.date+'T00:00:00Z'))||new Date(record.date+'T00:00:00Z').toISOString().slice(0,10)!==record.date)throw new Error('請選擇有效日期');
 if(!CATEGORIES.some(c=>c.id===record.category)||!['cash','card','bank'].includes(record.account))throw new Error('請選擇分類與帳戶');
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
