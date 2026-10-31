// The Night Bite: Bait nearby check on every lake home at 390, 820 and 1440 (from nb-east-batch). Usage: BASE=<site/> node tools/check-bait.cjs (default the preview). Blocks analytics via tools/no-analytics.cjs.
const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core');
const na=require(require('path').join(__dirname,'no-analytics.cjs'));
const BASE=process.env.BASE||'https://dr0231.github.io/night-bite-preview/';
const data=require(require('path').join(__dirname,'..','data','bait-shops.json')).lakes;
const IDS=['hoover','alum','buckeye','oshaughnessy','griggs','indian','delaware','deercreek','madison','knox','clearfork','seneca','dillon','logan','saltfork','burroak','dow'];
let pass=0,fail=0;const out=[];function ok(n,c,i){c?pass++:fail++; if(!c||process.env.V) out.push((c?'PASS ':'FAIL ')+n+(i!==undefined?' :: '+JSON.stringify(i):''));}
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:na.args()});
 for(const vp of [[390,844,true],[820,1180,true],[1440,900,false]]){
  const c=await b.newContext({viewport:{width:vp[0],height:vp[1]},isMobile:vp[2],hasTouch:vp[2],serviceWorkers:'block'});await na.block(c);
  for(const id of IDS){
   const p=await c.newPage();const errs=[];
   p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push('pageerror '+e.message));
   const W=vp[0]+' '+id+': ';
   await p.goto(BASE+(id==='hoover'?'':id+'/')+(process.env.V2?'?v='+Date.now():''),{waitUntil:'load'});
   await p.waitForFunction(()=>document.getElementById('bait-nearby').dataset.state!=='loading',null,{timeout:15000}).catch(()=>{});
   const r=await p.evaluate(()=>{const c=document.getElementById('bait-nearby');const cs=getComputedStyle(c);
     const rows=[...c.querySelectorAll('.bait-row')].map(li=>({n:li.querySelector('.bait-name').textContent,t:li.querySelector('.bait-time').textContent,h:li.querySelector('a').href}));
     const prev=c.previousElementSibling; let p2=c; while(p2&&p2.tagName!=='SECTION'||p2===c) p2=p2.previousElementSibling;
     const cond=document.getElementById('conditions').getBoundingClientRect(),bb=c.getBoundingClientRect();
     return {id:NightBiteLake.id,state:c.dataset.state,vis:cs.display!=='none'&&bb.height>0,rows,vis3:c.querySelectorAll('.bait-list:not(.bait-more-list) .bait-row').length,
      moreHidden:c.querySelector('.bait-more').hidden,status:c.querySelector('.bait-status').hidden?'':c.querySelector('.bait-status').textContent,
      tell:c.querySelector('.bait-tell').href,afterCond:p2&&p2.id==='conditions',below:bb.top>=cond.top-1,
      cards:document.querySelectorAll('#bait-nearby').length,ovf:document.documentElement.scrollWidth<=innerWidth,cardOvf:c.scrollWidth<=c.clientWidth+1}});
   const exp=data[id];
   ok(W+'lake id',r.id===id,r.id);
   ok(W+'one card visible',r.cards===1&&r.vis);
   ok(W+'placed after conditions',r.afterCond&&r.below);
   ok(W+'names match data',JSON.stringify(r.rows.map(x=>x.n))===JSON.stringify(exp.map(x=>x.name)),r.rows.map(x=>x.n));
   ok(W+'times',r.rows.every((x,i)=>x.t==='about '+exp[i].min+' min'));
   ok(W+'3 visible max',r.vis3===Math.min(3,exp.length));
   ok(W+'more shown iff >3',r.moreHidden===(exp.length<=3));
   ok(W+'directions urls',r.rows.every((x,i)=>{const u=new URL(x.h);return u.origin==='https://www.google.com'&&u.pathname==='/maps/search/'&&u.searchParams.get('api')==='1'&&u.searchParams.get('query')===(exp[i].q||exp[i].name+' '+exp[i].address)}));
   ok(W+'empty state',exp.length?r.status==='':/No shops confirmed yet/.test(r.status),r.status);
   ok(W+'tell link',r.tell.startsWith('mailto:contact@nightbiteoh.com?subject='),r.tell);
   ok(W+'no h-overflow',r.ovf&&r.cardOvf);
   ok(W+'no console errors',errs.length===0,errs);
   if(vp[0]===390&&id==='alum'||vp[0]===1440&&id==='buckeye'||vp[0]===820&&id==='madison'){
     if(!r.moreHidden){await p.click('#bait-nearby .bait-more summary');await p.waitForTimeout(200);}
     await p.locator('#bait-nearby').screenshot({path:`${process.env.OUT||'/tmp'}/bait-${vp[0]}-${id}.png`});
   }
   if(vp[0]===1440&&id==='hoover') await p.screenshot({path:''+(process.env.OUT||'/tmp')+'/bait-1440-home.png',fullPage:true});
   await p.close();
  }
  await c.close();
 }

 // ---- location tests (1 page each, per viewport) ----
 for(const vp of [[390,844,true],[820,1180,true],[1440,900,false]]){
  const W=vp[0]+' geo ';
  const mk=async(opts,init)=>{const c=await b.newContext(Object.assign({viewport:{width:vp[0],height:vp[1]},isMobile:vp[2],hasTouch:vp[2],serviceWorkers:'block'},opts));await na.block(c);if(init)await c.addInitScript(init);const p=await c.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));return {c,p,errs};};
  const st=p=>p.evaluate(()=>{const c=document.getElementById('bait-nearby');return {sort:c.dataset.sort,names:[...c.querySelectorAll('.bait-list:not(.bait-more-list) .bait-name')].map(e=>e.textContent),all:[...c.querySelectorAll('.bait-name')].map(e=>e.textContent),times:[...c.querySelectorAll('.bait-time')].map(e=>e.textContent),loc:c.querySelector('.bait-loc').hidden?'':c.querySelector('.bait-loc').textContent,btn:c.querySelector('.bait-near').textContent,btnHidden:c.querySelector('.bait-near').hidden,ovf:document.documentElement.scrollWidth<=innerWidth,calls:window.__geoCalls||0}});
  const ready=p=>p.waitForFunction(()=>document.getElementById('bait-nearby').dataset.state!=='loading');
  // granted near Millersport at Buckeye Lake: silent sort on load
  {const {c,p,errs}=await mk({permissions:['geolocation'],geolocation:{latitude:39.9033,longitude:-82.5348}});
   await p.goto(BASE+'buckeye/');await ready(p);await p.waitForFunction(()=>document.getElementById('bait-nearby').dataset.sort==='you',null,{timeout:10000}).catch(()=>{});
   let r=await st(p);
   ok(W+'granted: silent sort on load',r.sort==='you',r);
   ok(W+'granted: Millersport first',r.names[0]==='Millersport Bait & Tackle',r.names);
   ok(W+'granted: order changed from lake order',JSON.stringify(r.all)!==JSON.stringify(data.buckeye.map(x=>x.name)),r.all);
   ok(W+'granted: from you times',r.times.every(t=>/^about \d+ min from you$/.test(t)&&+t.match(/\d+/)[0]%5===0&&+t.match(/\d+/)[0]>=5),r.times);
   ok(W+'granted: sorted line + back button',/Sorted from your location/.test(r.loc)&&r.btn==='Back to lake order',r);
   ok(W+'granted: all 4 shops still listed',r.all.length===4);
   await p.click('#bait-nearby .bait-near');r=await st(p);
   ok(W+'back to lake order',r.sort==='lake'&&JSON.stringify(r.all)===JSON.stringify(data.buckeye.map(x=>x.name))&&r.times.every(t=>!/from you/.test(t))&&r.loc==='',r);
   await p.click('#bait-nearby .bait-near');await p.waitForTimeout(800);r=await st(p);
   ok(W+'tap re-sorts',r.sort==='you'&&r.names[0]==='Millersport Bait & Tackle',r);
   // Hoover, user beside Cabela's: Cabela's promoted
   ok(W+'granted: no errors, no overflow (buckeye)',errs.length===0&&r.ovf,errs);await c.close();}
  {const {c,p,errs}=await mk({permissions:['geolocation'],geolocation:{latitude:40.1493,longitude:-82.9731}});let r;
   await p.goto(BASE);await ready(p);await p.waitForFunction(()=>document.getElementById('bait-nearby').dataset.sort==='you',null,{timeout:10000}).catch(()=>{});
   r=await st(p);ok(W+"granted hoover: Cabela's first",r.names[0]==="Cabela's",r.names);
   ok(W+'granted: no errors, no overflow',errs.length===0&&r.ovf,errs);
   await c.close();}
  // prompt state (not granted): no auto request; tap -> denied -> fallback, no re-prompt
  {const init=`(()=>{window.__geoCalls=0;const g=navigator.geolocation;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:function(s,e){window.__geoCalls++;setTimeout(()=>e({code:1,message:'denied'}),50)}}});const q=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=d=>d&&d.name==='geolocation'?Promise.resolve({state:'prompt'}):q(d);})()`;
   const {c,p,errs}=await mk({},init);
   await p.goto(BASE+'oshaughnessy/');await ready(p);await p.waitForTimeout(1200);let r=await st(p);
   ok(W+'prompt: no auto request',r.calls===0&&r.sort==='lake'&&r.loc==='',r);
   ok(W+"lake order strictly by time: Cabela's first at O'Shaughnessy",r.names[0]==="Cabela's",r.names);
   await p.click('#bait-nearby .bait-near');await p.waitForTimeout(400);r=await st(p);
   ok(W+'denied: falls back with calm line',r.sort==='lake'&&r.loc==='Location off, sorted from the lake.'&&r.calls===1,r);
   await p.click('#bait-nearby .bait-near');await p.waitForTimeout(400);r=await st(p);
   ok(W+'denied: no repeat prompt',r.calls===1&&r.loc==='Location off, sorted from the lake.',r);
   ok(W+'denied: no errors, no overflow',errs.length===0&&r.ovf,errs);
   await c.close();}
  // real Chrome denial (no permission granted in context)
  {const {c,p,errs}=await mk({});await p.goto(BASE+'indian/');await ready(p);await p.click('#bait-nearby .bait-near');await p.waitForFunction(()=>!document.querySelector('#bait-nearby .bait-near').disabled,null,{timeout:12000}).catch(()=>{});
   const r=await st(p);ok(W+'chrome default deny: fallback',r.sort==='lake'&&/Location off/.test(r.loc),r);ok(W+'chrome deny: no errors',errs.length===0,errs);await c.close();}
  if(vp[0]===390){
   // timeout: never answers
   {const init=`Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:function(){window.__geoCalls=(window.__geoCalls||0)+1}}});`;
    const {c,p,errs}=await mk({},init);await p.goto(BASE+'knox/');await ready(p);await p.click('#bait-nearby .bait-near');await p.waitForTimeout(4000);
    let r=await st(p);ok(W+'timeout: still waiting at 4s',r.loc.startsWith('Finding'),r.loc);
    await p.waitForTimeout(5500);r=await st(p);ok(W+'timeout: fallback after ~8s',r.sort==='lake'&&r.loc==='Location off, sorted from the lake.',r);ok(W+'timeout: no errors',errs.length===0,errs);await c.close();}
   // unsupported
   {const init=`delete Navigator.prototype.geolocation;`;
    const {c,p,errs}=await mk({},init);await p.goto(BASE+'griggs/');await ready(p);const r=await st(p);
    ok(W+'unsupported: lake order + calm line, no button',r.sort==='lake'&&r.btnHidden&&r.loc==='Location off, sorted from the lake.',r);ok(W+'unsupported: no errors',errs.length===0,errs);await c.close();}
  }
  // layout: no card stretched far past its content at desktop
  if(vp[0]===1440){const {c,p}=await mk({});for(const id of ['','buckeye/','madison/','alum/']){await p.goto(BASE+id);await ready(p);await p.waitForTimeout(3000);
    const g=await p.evaluate(()=>[...document.querySelectorAll('.bento-grid > .bento-card')].map(e=>{const r=e.getBoundingClientRect();let h=0;for(const k of e.children){if(k.tagName==='SCRIPT')continue;const kr=k.getBoundingClientRect();if(kr.height)h=Math.max(h,kr.bottom-r.top)}return [e.className.split(' ')[1],Math.round(r.height-h)]}));
    ok(W+'no stretched cards '+(id||'hoover'),g.every(x=>x[1]<80),g);
    if(id==='') await p.screenshot({path:''+(process.env.OUT||'/tmp')+'/bait-1440-home-grid.png',fullPage:true});}
   await c.close();}
 }
 await b.close();
 console.log(out.join('\n'));console.log(`checks: ${pass} pass, ${fail} fail`);
})();
