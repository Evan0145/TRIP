import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const body = script.slice(script.indexOf('const CATEGORIES')).replace(/render\(\);\s*boot\(\);\s*$/, '');
const api = vm.runInNewContext('let auth = null;\n' + body +
  '\n({jsArg, esc, chip, validateTripInput, validateExpenseInput, cleanExpense, uid});',
  {window:{addEventListener(){}}, document:{addEventListener(){}}, crypto:webcrypto, setTimeout, clearTimeout});
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for(const value of ["O'Brien","'});globalThis.injected=true;//","\\');alert(1);//","\" autofocus onfocus=\"alert(1)","<img src=x onerror=alert(1)>","&quot;"]){
  test('dynamic handler safely preserves ' + JSON.stringify(value), () => {
    let captured;
    const ctx = {setForm:x=>captured=x.payer};
    vm.runInNewContext('setForm({payer:' + decode(api.jsArg(value)) + '})', ctx);
    assert.equal(captured,value);
    assert.equal(ctx.injected,undefined);
    assert(!api.jsArg(value).includes('"'));
  });
}
const expense = {id:'E1',date:'2026-11-18',amount:100,category:'FOOD',note:'Lunch',payer:'Alice',participants:[{name:'Alice',amount:50},{name:'Bob',amount:50}]};
test('valid expense and trip accepted',()=>{
  api.validateTripInput({name:'Tokyo',status:'進行中',members:['Alice','Bob']});
  api.validateExpenseInput(expense,['Alice','Bob']);
});
for(const [label,patch] of [
  ['negative amount',{amount:-1}],['infinite amount',{amount:Infinity}],['invalid category',{category:'BAD'}],
  ['unknown payer',{payer:'Mallory'}],['negative share',{participants:[{name:'Alice',amount:-1},{name:'Bob',amount:101}]}],
  ['wrong total',{participants:[{name:'Alice',amount:5}]}],['duplicate names',{participants:[{name:'Alice',amount:50},{name:'Alice',amount:50}]}]
]) test(label+' rejected',()=>assert.throws(()=>api.validateExpenseInput({...expense,...patch},['Alice','Bob'])));
test('reserved object property names are handled as ordinary participant names',()=>{
  api.validateExpenseInput({...expense,payer:'__proto__',participants:[{name:'__proto__',amount:100}]},['__proto__']);
});
test('import removes non-schema fields',()=>{
  assert.equal('_doc' in api.cleanExpense({...expense,_doc:true,ownerUid:'fake'}),false);
  assert.equal('ownerUid' in api.cleanExpense({...expense,ownerUid:'fake'}),false);
});
test('20 member limit',()=>assert.throws(()=>api.validateTripInput({name:'X',status:'進行中',members:Array.from({length:21},(_,i)=>'P'+i)})));
test('generated IDs are unique',()=>assert.equal(new Set(Array.from({length:1000},()=>api.uid('G'))).size,1000));

test('persisted shares map preserves names, amounts and excludes view metadata',()=>{
 const clean = api.cleanExpense({...expense,_doc:true});
 assert.equal(clean.shares.Alice,50); assert.equal(clean.shares.Bob,50);
 assert.equal('participants' in clean,false);
 const special = api.cleanExpense({...expense,participants:[{name:'__proto__',amount:100}]});
 assert.equal(Object.hasOwn(special.shares,'__proto__'),true); assert.equal(special.shares.__proto__,100);
});
