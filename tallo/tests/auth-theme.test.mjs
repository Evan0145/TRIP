import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const moduleSource=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const body=moduleSource.slice(moduleSource.indexOf('const CATEGORIES'))
 .replace(/render\(\);\s*boot\(\);\s*$/,'')
 .replace(/function render\(\)\{[\s\S]*?\ndocument.addEventListener\("compositionstart"/,'function render(){}\ndocument.addEventListener("compositionstart"');
function setup(signIn, profile=async()=>{}){
 const timers=[],auth={currentUser:null};
 const api=vm.runInNewContext('let auth=authMock;let signInWithEmailAndPassword=signInMock,createUserWithEmailAndPassword=signInMock,updateProfile=profileMock;\n'+body+'\n({authenticate,setFormSilent,renderLogin,getState:()=>state,getAuthState:()=>({authBusy,authSuccess,authTransition}),togglePassword});',{
  authMock:auth,signInMock:signIn,profileMock:profile,
  window:{addEventListener(){},matchMedia(){return {matches:false};}},
  document:{addEventListener(){},getElementById(){return null;}},
  crypto:webcrypto,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){}
 });
 api.setFormSilent({email:'traveler@example.invalid',password:'test-only-password',authName:'旅人'});
 return {api,timers,auth};
}
test('invalid credentials never show success or schedule entry',async()=>{
 const {api,timers}=setup(async()=>{throw {code:'auth/invalid-credential'};});
 await api.authenticate('login');
 assert.equal(api.getAuthState().authSuccess,false);assert.equal(api.getAuthState().authBusy,false);
 assert.equal(timers.length,0);assert.match(api.getState().error,/帳號或密碼/);
});
test('pending authentication blocks duplicate submissions',async()=>{
 let resolve,count=0;const {api}=setup(()=>{count++;return new Promise(r=>resolve=r);});
 const pending=api.authenticate('login');await api.authenticate('login');
 assert.equal(count,1);assert.equal(api.getAuthState().authBusy,true);assert.equal(api.getAuthState().authSuccess,false);
 resolve({user:{}});await pending;
});
test('successful Firebase response clears password and schedules entry',async()=>{
 const {api,timers,auth}=setup(async()=>{auth.currentUser={uid:'test'};return {user:auth.currentUser};});
 await api.authenticate('login');
 assert.equal(api.getState().form.password,'');assert.equal(api.getAuthState().authSuccess,true);
 assert.equal(api.getState().screen,'boot');timers.at(-1)();assert.equal(api.getState().screen,'app');
});
test('signup profile failure does not turn an existing new account into a login failure',async()=>{
 const {api,auth}=setup(async()=>{auth.currentUser={uid:'test'};return {user:auth.currentUser};},async()=>{throw new Error('profile unavailable');});
 await api.authenticate('signup');assert.equal(api.getAuthState().authSuccess,true);assert.match(api.getState().error,/姓名/);
});
test('login HTML has labels, no Google and no seeded credentials',()=>{
 const {api}=setup(async()=>{});
 api.setFormSilent({email:'',password:''});
 const html=api.renderLogin();assert(html.includes('for="authEmailInput"'));assert(html.includes('for="authPassInput"'));
 assert(!html.includes('Google'));assert(!html.includes('123456'));assert(!html.includes('evan90405'));
});
test('mobile shell and reduced motion are present',()=>{
 assert(html.includes('id="phoneStage"'));assert(html.includes('id="phoneScroll"'));
 const css=fs.readFileSync(new URL('../enoden.css',import.meta.url),'utf8');
 assert(css.includes('prefers-reduced-motion'));assert(css.includes('6s cubic-bezier'));
});
