/* ================================================================
   DATA LAYER — dataset object { master, targets, monthly, meta }
   monthly: { BO_CODE: { "YYYY-MM": {w,n} } }
   Boot order: hosted elevate_data.json → browser storage → demo.
================================================================ */
const DEMO_TARGETS={"SDSE":{wfyp:1680000,nop:30,thr:.87},"ADSM":{wfyp:2000000,nop:35,thr:.87},"EADSM":{wfyp:2800000,nop:35,thr:.87},"DSM":{wfyp:3500000,nop:35,thr:.87},"Sr.DSM":{wfyp:5000000,nop:40,thr:.87},"SWM":{wfyp:6000000,nop:40,thr:.87},"PM":{wfyp:8000000,nop:50,thr:.87},"SPMG":{wfyp:10000000,nop:50,thr:.87},"CPM":{wfyp:12000000,nop:50,thr:.87},"EPM":{wfyp:16000000,nop:60,thr:.87}};
const DEMO_MASTER={
 593994:{bo:"ZV9506",name:"Himani Kakkar",full:"Portfolio Manager",desg:"PM",zone:"North",pers:0.9655},
 613794:{bo:"ACS696",name:"Biju Kumar Dey",full:"Senior Deputy Customer Relationship Manager",desg:"Sr.DSM",zone:"East",pers:0.9267},
 619479:{bo:"AEF178",name:"Nishi Singh",full:"Senior Wealth Manager",desg:"SWM",zone:"North",pers:0.8809},
 603310:{bo:"AAA634",name:"Lakshya Jayesh Hingorani",full:"Senior Portfolio Manager",desg:"SPMG",zone:"West",pers:0.9573},
 574749:{bo:"ZP6562",name:"Anbu Dharmaraj",full:"Executive Relationship Manager",desg:"EADSM",zone:"South",pers:0.6121},
 530293:{bo:"YV2686",name:"Ritesh Bastimal Shirsath",full:"Portfolio Manager",desg:"PM",zone:"West",pers:0.8853},
 538803:{bo:"ZB4543",name:"Anamika Kumari",full:"Senior Wealth Manager",desg:"SWM",zone:"East",pers:0.8546},
 516071:{bo:"BU7031",name:"Vijay Balubhai Patel",full:"Portfolio Manager",desg:"PM",zone:"West",pers:0.8803},
 607582:{bo:"ABD458",name:"Manish Ansari",full:"Deputy Customer Relationship Manager",desg:"DSM",zone:"North",pers:0.8911},
 540650:{bo:"ZB9054",name:"Amrit Kaur",full:"Portfolio Manager",desg:"PM",zone:"North",pers:0.7730},
 635771:{bo:"AHW165",name:"Sangram Urf Pratik Netaji Shinde",full:"Deputy Customer Relationship Manager",desg:"DSM",zone:"West",pers:"NA"},
};
const _W={"ZV9506":[0,0,0,0,0,0,113334.294,1086923.916,6417087.796,309883.313,105752.112,236603.484],"ACS696":[50520.06,30477,65277.15,466645.785,401725.3685,-45528.3615,237006.458,1194452.96,348102.008,763534.56,264723.39,1283096.716],"AEF178":[30261,105190.33,282500,69116.01,825391.08,1521591.017,2021298.3,2521293.82,1171151.33,569562.126,856418.16,18522.07],"AAA634":[0,0,0,0,0,0,-1666235.874,2170888.196,4706039.53,48353.03,3508362.93,2405535.2],"ZP6562":[74291.287,93183.647,46345.207,30775.207,190823,125261.8,495456,329757.48,585235.6,329928.6,200337.52,101932.1],"YV2686":[0,0,0,0,0,0,0,0,4844833.07,687627.72,1013223.01,391956.52],"ZB4543":[0,0,0,0,140483.88,403809.6,303792,2231763.6,923078,35357,542868.5,507950],"BU7031":[0,0,0,0,0,0,181303.44,1036715.49,3242404.89,580084.185,108892.675,44940.055],"ABD458":[0,0,0,0,0,0,0,0,11272044.71,10749.135,0,30294],"ZB9054":[0,0,0,0,0,0,0,0,0,110510,-2200086.232,0],"AHW165":[0,0,0,0,0,0,0,0,1245449.116,215160.04,400790.04,1268681.46]};
const _N={"ZV9506":[0,0,0,0,0,0,6,16,22,2,2,2],"ACS696":[1,1,2,6,5,3,8,16,8,3,7,2],"AEF178":[1,3,2,2,4,16,18,30,16,4,2,1],"AAA634":[0,0,0,0,0,0,4,12,26,1,5,3],"ZP6562":[2,3,2,1,5,4,10,8,14,2,5,2],"YV2686":[0,0,0,0,0,0,0,0,14,4,8,9],"ZB4543":[0,0,0,0,1,3,4,28,8,1,2,2],"BU7031":[0,0,0,0,0,0,8,18,32,9,2,1],"ABD458":[0,0,0,0,0,0,0,0,10,1,0,1],"ZB9054":[0,0,0,0,0,0,0,0,2,1,0,0],"AHW165":[0,0,0,0,0,0,0,0,26,5,7,12]};
function demoDataset(){const monthly={};Object.keys(_W).forEach(bo=>{monthly[bo]={};for(let i=0;i<12;i++){monthly[bo][addM("2025-07",i)]={w:_W[bo][i],n:_N[bo][i]};}});
  return{master:JSON.parse(JSON.stringify(DEMO_MASTER)),targets:JSON.parse(JSON.stringify(DEMO_TARGETS)),monthly,
    meta:{source:"demo",dseCount:Object.keys(DEMO_MASTER).length,minMonth:"2025-07",maxMonth:"2026-06",updatedAt:null}};}
let DATA=demoDataset();
const STORE_KEY="elevate_dataset_v1";
function saveDataset(d){try{localStorage.setItem(STORE_KEY,JSON.stringify(d));return true;}catch(e){return false;}}
function loadStored(){try{const s=localStorage.getItem(STORE_KEY);if(s)return JSON.parse(s);}catch(e){}return null;}
function clearStored(){try{localStorage.removeItem(STORE_KEY);}catch(e){}}
async function initData(){
  try{const r=await fetch('elevate_data.json',{cache:'no-store'});if(r.ok){const j=await r.json();if(j&&j.master&&j.monthly){DATA=j;refreshLanding();return;}}}catch(e){}
  const s=loadStored();if(s&&s.master&&s.monthly){DATA=s;}
  refreshLanding();
}
/* ---------- month key helpers ---------- */
function addM(key,delta){const[y,m]=key.split('-').map(Number);const t=y*12+(m-1)+delta;return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`.replace(/^(\d{4})-/,'$1-');}
function mLabel(key){const[y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleString('en-US',{month:'short'})+"'"+String(y).slice(2);}
function cmpM(a,b){return a<b?-1:a>b?1:0;}

/* ================= helpers ================= */
const $=id=>document.getElementById(id);
function inr(n){if(n==null||isNaN(n))return "–";const r=Math.round(n);return "₹"+(r<0?"-":"")+Math.abs(r).toLocaleString('en-IN');}
function lakh(n){const a=Math.abs(n);if(a>=1e7)return "₹"+(n/1e7).toFixed(2).replace(/\.?0+$/,'')+" Cr";if(a>=1e5)return "₹"+(n/1e5).toFixed(2).replace(/\.?0+$/,'')+" L";return inr(n);}
function pct0(x){return Math.round(x*100)+"%";}

/* ================= landing ================= */
let state={emp:null,empId:null,anchor:null,calculated:false};
function refreshLanding(){
  const m=DATA.meta;
  $('dsDot').style.animation='none';
  $('dsDot').style.background=m.source==='demo'?'var(--warn)':'var(--ok)';
  $('dsText').textContent=(m.source==='demo'?'Demo dataset':'Company dataset')+" · "+m.dseCount+" DSEs · data "+mLabel(m.minMonth)+"–"+mLabel(m.maxMonth)+(m.updatedAt?(" · published "+new Date(m.updatedAt).toLocaleDateString('en-IN')):"");
}
/* ---------- feedback: toast + resend timer ---------- */
let toastT=null;
function showToast(msg,info){const t=$('toast');$('toastMsg').textContent=msg;t.classList.toggle('info',!!info);
  t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600);}
let resendLeft=0,resendInt=null;
function startResend(){resendLeft=30;$('authResend').classList.add('linkdis');tickResend();
  clearInterval(resendInt);resendInt=setInterval(tickResend,1000);}
function tickResend(){const a=$('authResend');
  if(resendLeft<=0){clearInterval(resendInt);a.classList.remove('linkdis');a.textContent='Resend OTP';return;}
  a.textContent='Resend in '+resendLeft+'s';resendLeft--;}
function stopResend(){clearInterval(resendInt);resendLeft=0;const a=$('authResend');if(a){a.classList.remove('linkdis');a.textContent='Resend OTP';}}
/* ---------- auth: employee code -> OTP -> continue ---------- */
let pendingId=null,otpCode=null,verifyBusy=false;
function authSend(){
  const raw=$('authCode').value.trim(),id=parseInt(raw,10);
  if(!raw||isNaN(id)||!DATA.master[id]){$('authErr').textContent="We couldn't find that Employee Code. Please check and try again.";return;}
  $('authErr').textContent='';pendingId=id;
  otpCode=String(Math.floor(100000+Math.random()*900000));
  $('otpToLine').innerHTML="We sent a 6-digit code to the mobile registered for <b>xxxx"+String(id).slice(-2)+"</b>.";
  $('otpDemoNote').innerHTML="<b>Demo:</b> your code is <b style='font-size:15px;letter-spacing:.12em'>"+otpCode+"</b> — in production this arrives by SMS.";
  $('authOtp').value='';$('otpErr').textContent='';
  $('authStep1').classList.add('hide');
  const s2=$('authStep2');s2.classList.remove('hide','stepback');void s2.offsetWidth;s2.classList.add('step');
  setTimeout(()=>$('authOtp').focus(),160);
  showToast('OTP sent to mobile xxxx'+String(id).slice(-2));startResend();
}
function authResend(){if(resendLeft>0)return;
  otpCode=String(Math.floor(100000+Math.random()*900000));
  $('otpDemoNote').innerHTML="<b>Demo:</b> new code <b style='font-size:15px;letter-spacing:.12em'>"+otpCode+"</b> sent.";
  $('authOtp').value='';$('otpErr').textContent='';showToast('New OTP sent');startResend();}
function authBack(){stopResend();$('authStep2').classList.add('hide');
  const s1=$('authStep1');s1.classList.remove('hide','step');void s1.offsetWidth;s1.classList.add('stepback');}
function authVerify(){
  if(verifyBusy)return;
  if($('authOtp').value.trim()!==otpCode){$('otpErr').textContent="Incorrect code. Please re-enter.";return;}
  verifyBusy=true;$('otpErr').textContent='';stopResend();
  const card=$('authStep2');
  const ok=document.createElement('div');ok.className='okwrap';ok.innerHTML='<div class="okcheck">✓</div>';
  card.insertBefore(ok,card.firstChild);
  showToast('Verified — welcome, '+DATA.master[pendingId].name.split(' ')[0]+'!');
  setTimeout(()=>{ok.remove();verifyBusy=false;quick(pendingId);},750);
}
/* ---------- hidden demo lookup (typeahead) ---------- */
function toggleLookup(){$('lookupWrap').classList.toggle('hide');if(!$('lookupWrap').classList.contains('hide'))setTimeout(()=>$('lookupInput').focus(),120);}
function tySearch(q){
  const list=$('tyList');q=q.trim().toLowerCase();
  if(q.length<2){list.classList.add('hide');list.innerHTML='';return;}
  const hits=[];
  for(const[id,e] of Object.entries(DATA.master)){
    if(String(id).startsWith(q)||e.name.toLowerCase().includes(q)||e.bo.toLowerCase().startsWith(q)){hits.push([id,e]);if(hits.length>=8)break;}
  }
  if(!hits.length){list.innerHTML='<div class="tyi"><span class="m">No matches</span></div>';list.classList.remove('hide');return;}
  list.innerHTML=hits.map(([id,e])=>`<div class="tyi" onclick="quick(${id})"><div><div class="n">${e.name}</div><div class="m">${id} · ${e.bo} · ${e.zone}</div></div><span class="g">${e.desg}</span></div>`).join('');
  list.classList.remove('hide');
}
function quick(id){if(!DATA.master[id])return;state.empId=id;state.emp=DATA.master[id];boot();}
function backToLanding(){['appView','adminView','adminGate'].forEach(v=>$(v).classList.add('hide'));$('landing').classList.remove('hide');
  $('authStep2').classList.add('hide');$('authStep1').classList.remove('hide','step','stepback');
  $('authCode').value='';$('authOtp').value='';$('authErr').textContent='';$('otpErr').textContent='';
  $('lookupWrap').classList.add('hide');$('tyList').classList.add('hide');
  pendingId=null;otpCode=null;stopResend();
  refreshLanding();window.scrollTo(0,0);}
function toggleMe(){const ex=document.querySelectorAll('#appView .exp');ex[3].open=true;ex[3].scrollIntoView({behavior:'smooth'});}
let adminUnlocked=false;const ADMIN_PIN="7421";
function showAdminGate(){if(adminUnlocked){showAdmin();return;}$('landing').classList.add('hide');$('adminGate').classList.remove('hide');$('pinErr').textContent='';$('pinInput').value='';setTimeout(()=>$('pinInput').focus(),120);window.scrollTo(0,0);}
function checkPin(){if($('pinInput').value.trim()===ADMIN_PIN){adminUnlocked=true;$('adminGate').classList.add('hide');showAdmin();}else{$('pinErr').textContent='Incorrect PIN.';$('pinInput').value='';}}
function showAdmin(){if(!adminUnlocked){showAdminGate();return;}$('landing').classList.add('hide');$('adminGate').classList.add('hide');$('adminView').classList.remove('hide');renderHistory();renderAdminOverview();renderRules();window.scrollTo(0,0);}

/* ================= ENGINE ================= */
function targetFor(desg){return DATA.targets[desg]||{wfyp:0,nop:0,thr:.87};}
function mval(bo,key){const r=(DATA.monthly[bo]||{})[key];return r?{w:r.w||0,n:r.n||0}:{w:0,n:0};}
function compute(oW,oN,oP){
  const e=state.emp,tgt=targetFor(e.desg),A=state.anchor;
  let wIn=$('c_wfyp').value.trim(),nIn=$('c_nop').value.trim();const pIn=$('c_pers').value.trim();
  if(oW!==undefined){wIn=String(oW);nIn=String(oN);}
  const rows=[];let sW=0,sN=0;
  for(let k=0;k<12;k++){const key=addM(A,k-11),cur=(key===A);
    let {w,n}=mval(e.bo,key);
    if(cur){if(wIn!=="")w=parseFloat(wIn)||0;if(nIn!=="")n=parseFloat(nIn)||0;}
    sW+=w;sN+=n;const cwa=tgt.wfyp?sW/tgt.wfyp:0,cna=tgt.nop?sN/tgt.nop:0,cov=Math.min(cwa,1.5)*.75+Math.min(cna,1.5)*.25;
    rows.push({m:mLabel(key),cwa,cna,cov,wg:cwa>=.75,ng:cna>=.5,cur,w,n});}
  /* Four-gate decision via the tested rules engine when present; identical built-in math as fallback. */
  let wa,na,wW,nW,ov,wg,ng,wasPass;
  if(window.Elevate&&window.Elevate.evaluateSalesProgression){
    const _sp=window.Elevate.evaluateSalesProgression(window.Elevate.SP_RULES,
      {trailingWfyp:sW,trailingNop:sN,targetWfyp:tgt.wfyp,targetNop:tgt.nop,
       persistency:(e.pers==="NA"?"NA":e.pers),persistencyThreshold:tgt.thr});
    wa=_sp.wfypAch;na=_sp.nopAch;ov=_sp.was;wg=_sp.gates.wfyp;ng=_sp.gates.nop;wasPass=_sp.gates.was;
    wW=Math.min(wa,1.5)*.75;nW=Math.min(na,1.5)*.25;
  }else{
    wa=tgt.wfyp?sW/tgt.wfyp:0;na=tgt.nop?sN/tgt.nop:0;wW=Math.min(wa,1.5)*.75;nW=Math.min(na,1.5)*.25;ov=wW+nW;
    wg=wa>=.75;ng=na>=.5;wasPass=ov>1;
  }
  let pSource,pVal=null,pExempt=false,pPass=false;
  if(oP!==undefined&&oP!==null){pSource='sim';pVal=oP/100;pPass=pVal>=tgt.thr;}
  else if(pIn!==""&&!isNaN(pIn)){pSource='typed';pVal=parseFloat(pIn)/100;pPass=pVal>=tgt.thr;}
  else if(e.pers==="NA"){pSource='na';pExempt=true;pPass=true;}
  else{pSource='record';pVal=e.pers;pPass=pVal>=tgt.thr;}
  const eligible=wg&&ng&&wasPass&&pPass;
  let status;
  if(!wg&&!ng)status="WFYP & NOP Criteria Not Met";else if(!wg)status="WFYP Criteria Not Met";
  else if(!ng)status="NOP Criteria Not Met";else if(!wasPass)status="Final WAS Score";
  else if(pPass)status="Promotion";else status="Persistency Criteria";
  const gapWfyp=Math.max(0,tgt.wfyp*0.75-sW),gapNop=Math.max(0,Math.ceil(tgt.nop*0.5-sN));
  const needNopWas=Math.max(0,((1-wW)/0.25-na)*tgt.nop),needWfypWas=Math.max(0,((1-nW)/0.75-wa)*tgt.wfyp);
  const persGap=(!pExempt&&!pPass)?(tgt.thr-pVal):null;
  return{tgt,sW,sN,wa,na,wW,nW,ov,wg,ng,wasPass,pSource,pVal,pExempt,pPass,eligible,status,rows,anchor:A,e,gapWfyp,gapNop,needNopWas,needWfypWas,persGap};
}
function closeness(c){let s=Math.min(c.wa/0.75,1)*0.25+Math.min(c.na/0.5,1)*0.25+Math.min(c.ov/1,1)*0.30;
  s+=(c.pExempt||c.pPass)?0.20:Math.min(c.pVal/c.tgt.thr,1)*0.20;return Math.max(0,Math.min(s,1));}

/* ================= BOOT dashboard ================= */
function boot(){
  const e=state.emp;state.calculated=false;
  state.anchor=addM(DATA.meta.maxMonth,1);
  $('landing').classList.add('hide');$('adminView').classList.add('hide');$('adminGate').classList.add('hide');$('appView').classList.remove('hide');
  $('topAv').textContent=e.name.split(' ').map(x=>x[0]).slice(0,2).join('');
  $('topMonth').textContent=mLabel(state.anchor);
  $('obName').textContent=e.name.split(' ')[0];
  let opts='';for(let d=0;d<=12;d++){const key=addM(DATA.meta.maxMonth,d);opts+=`<option value="${key}" ${key===state.anchor?'selected':''}>${mLabel(key)}</option>`;}
  $('c_month').innerHTML=opts;
  $('c_wfyp').value='';$('c_nop').value='';$('c_pers').value='';
  ['c_wfyp','c_nop','c_pers'].forEach(id=>$(id).classList.remove('filled'));
  const px=$('c_pers');
  if(e.pers==="NA"){px.value='';px.disabled=true;px.placeholder='Exempt';
    $('persRec').innerHTML="New joiner — persistency is <b style='color:var(--ok)'>exempt</b>. No entry needed.";}
  else{px.disabled=false;px.placeholder=(e.pers*100).toFixed(2);
    $('persRec').innerHTML="Required — enter your current persistency. Last on record: <b>"+(e.pers*100).toFixed(2)+"%</b>.";}
  $('entryMonth').textContent=mLabel(state.anchor);
  $('windowNote').textContent="Rolling 12-month window: "+mLabel(addM(state.anchor,-11))+" → "+mLabel(state.anchor)+".";
  $('footNote').textContent="Elevate · ABSLI Direct Marketing · "+(DATA.meta.source==='demo'?'Demo data':'Data published '+new Date(DATA.meta.updatedAt).toLocaleString('en-IN'))+" · history & targets read-only";
  $('onboard').classList.remove('hide');$('dashContent').classList.add('hide');
  $('sl_w').value=0;$('sl_n').value=0;
  $('sl_p').value=e.pers==="NA"?87:Math.min(100,Math.max(60,e.pers*100)).toFixed(1);
  buildMe();validateCalc();window.scrollTo(0,0);setTimeout(()=>$('c_wfyp').focus(),250);
}
function validateCalc(){
  const w=$('c_wfyp').value.trim(),nn=$('c_nop').value.trim(),pv=$('c_pers').value.trim();
  ['c_wfyp','c_nop','c_pers'].forEach(id=>$(id).classList.toggle('filled',$(id).value.trim()!==''));
  const exempt=state.emp&&state.emp.pers==="NA";
  const ready=w!==""&&nn!==""&&(exempt||pv!=="");
  $('calcBtn').disabled=!ready;
  $('calcBtn').textContent=ready?"See where I stand →":(exempt?"Enter WFYP & NOP to begin":"Enter WFYP, NOP & Persistency to begin");
  return ready;
}
function calculate(){
  if(!validateCalc())return;
  state.calculated=true;
  updSum();
  $('onboard').classList.add('hide');$('dashContent').classList.remove('hide');
  renderAll(true);window.scrollTo({top:0,behavior:'smooth'});
}
function editEntries(){
  state.calculated=false;
  $('dashContent').classList.add('hide');$('onboard').classList.remove('hide');
  validateCalc();window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>$('c_wfyp').focus(),200);
}
function updSum(){
  const c=compute();
  $('sumW').textContent=lakh(parseFloat($('c_wfyp').value)||0);
  $('sumN').textContent=$('c_nop').value||0;
  $('sumP').textContent=c.pExempt?"Exempt":((c.pVal*100).toFixed(1)+"%"+(c.pSource==='record'?" (rec.)":""));
  $('sumM').textContent=mLabel(state.anchor);
}
function onInput(){validateCalc();}
function onMonth(){state.anchor=$('c_month').value;$('entryMonth').textContent=mLabel(state.anchor);$('topMonth').textContent=mLabel(state.anchor);
  $('windowNote').textContent="Rolling 12-month window: "+mLabel(addM(state.anchor,-11))+" → "+mLabel(state.anchor)+".";}

/* ================= RENDER ================= */
function renderAll(first){
  if(!state.calculated)return;
  const c=compute();
  $('topMonth').textContent=mLabel(c.anchor);
  const wasN=Math.round(c.ov*100),near=Math.round(closeness(c)*100);
  let badge,verd,vsub;
  if(c.eligible){badge=`<span class="vbadge ok">✓ Eligible for Promotion</span>`;verd="Congratulations, "+c.e.name.split(' ')[0]+" — you've made it! 🎉";vsub="All four gates are green on your trailing 12 months.";}
  else if(near>=80){badge=`<span class="vbadge warn">⚡ Almost there</span>`;verd="You're "+near+"% of the way.";vsub=nextMoveText(c);}
  else{badge=`<span class="vbadge no">Not eligible yet</span>`;verd="You're "+near+"% of the way.";vsub=nextMoveText(c);}
  const g=(ok,lbl)=>`<span class="gpill ${ok?'y':'n'}"><span class="d"></span>${lbl}</span>`;
  $('heroHost').innerHTML=`<div class="hero rise"><div class="glow"></div>
    <div class="hi">Welcome back, <b>${c.e.name.split(' ')[0]}</b> 👋 · ${c.e.desg} · ${mLabel(c.anchor)}</div>
    <div class="mid">
      <div class="ring">${ringSvg()}<div class="c"><div class="n count" id="ringN">0<span style="font-size:13px">%</span></div><div class="u">Overall WAS</div></div></div>
      <div class="msg">${badge}<div class="verd">${verd}</div><div class="vsub">${vsub}</div></div>
    </div>
    <div class="gaterow">${g(c.wg,'WFYP '+(c.wa*100).toFixed(0)+'%')}${g(c.ng,'NOP '+(c.na*100).toFixed(0)+'%')}${g(c.wasPass,'WAS '+(c.ov*100).toFixed(0)+'%')}${c.pExempt?`<span class="gpill y"><span class="d"></span>Persist. exempt</span>`:g(c.pPass,'Persist. '+(c.pVal*100).toFixed(1)+'%')}</div>
    <div class="hbar"><i id="hbarFill"></i></div>
    <div class="hbar-lab"><span id="atCamps"></span><span>${near}% of the way</span></div></div>`;
  requestAnimationFrame(()=>{animRing(Math.min(c.ov,1.5));$('hbarFill').style.width=(c.eligible?100:near)+"%";
    $('atCamps').textContent=[c.wg,c.ng,c.wasPass,c.pPass].filter(Boolean).length+" of 4 gates cleared";countUp('ringN',wasN,'%');});
  $('coachHost').innerHTML=coach(c);
  $('kpiHost').innerHTML=kpis(c);
  requestAnimationFrame(()=>document.querySelectorAll('#kpiHost .bar i').forEach(el=>el.style.width=el.dataset.w));
  $('chkHost').innerHTML=checklist(c);
  $('chkSum').textContent=[c.wg,c.ng,c.wasPass,c.pPass].filter(Boolean).length+" of 4 milestones lit";
  buildJourney(c);
  if($('expHist').open)drawChart(first);
  whatif();
}
function nextMoveText(c){
  if(!c.wg)return `Your next move: ${lakh(c.gapWfyp)} more WFYP opens the first gate.`;
  if(!c.ng)return `Your next move: ${c.gapNop} more ${c.gapNop===1?'policy':'policies'} opens the NOP gate.`;
  if(!c.wasPass){const nP=Math.ceil(c.needNopWas);return `Your next move: ~${nP} more ${nP===1?'policy':'policies'} lifts WAS above 100%.`;}
  if(!c.pPass)return `Your next move: lift persistency by ${(c.persGap*100).toFixed(1)}% to reach 87%.`;
  return `Keep the momentum.`;
}
function projFrom(c,dW,dN,oP){const w0=(parseFloat($('c_wfyp').value)||0),n0=(parseFloat($('c_nop').value)||0);
  return compute(w0+dW,n0+dN,oP);}
function buildPlan(c){
  const plan=[];const acc={dW:0,dN:0,oP:undefined};
  const proj=()=>projFrom(c,acc.dW,acc.dN,acc.oP);
  const res=(p)=>p.eligible?"→ You become promotion-eligible ✓":("→ Your score rises to "+(p.ov*100).toFixed(0)+"% ("+Math.round(closeness(p)*100)+"% of the way)");
  if(!c.wg){acc.dW+=c.gapWfyp+1;
    plan.push({action:`Bring in ${lakh(c.gapWfyp)} more premium`,prio:"HIGH",
      why:`Your premium gate needs 75% of target — you're at ${(c.wa*100).toFixed(0)}%. That's about ${lakh(c.gapWfyp/4)} a week this month.`,
      result:res(proj())});}
  if(!c.ng){acc.dN+=c.gapNop;
    plan.push({action:`Sell ${c.gapNop} more ${c.gapNop===1?'policy':'policies'}`,prio:"HIGH",
      why:`Your policy-count gate needs 50% — you're at ${(c.na*100).toFixed(0)}%. Any size of policy counts.`,
      result:res(proj())});}
  {const pNow=proj();
   if(!pNow.wasPass){
     const nR=Math.max(1,Math.ceil(pNow.needNopWas));
     const tryPol=projFrom(c,acc.dW,acc.dN+nR,acc.oP);
     if(tryPol.wasPass){acc.dN+=nR;
       plan.push({action:`Sell ${nR} more ${nR===1?'policy':'policies'} on top`,prio:plan.length?"MEDIUM":"HIGH",
         why:`Your overall score must cross 100% — it ${plan.length?'would still be':'is'} at ${(pNow.ov*100).toFixed(0)}%. Policies are the fastest way up.`,
         result:res(proj())});}
     else{const wR=pNow.needWfypWas+1;acc.dW+=wR;
       plan.push({action:`Add ${lakh(wR)} more premium on top`,prio:plan.length?"MEDIUM":"HIGH",
         why:`Your overall score must cross 100% — policies alone can't get there (that side is already maxed out), so it has to come from premium.`,
         result:res(proj())});}}}
  if(!c.pExempt&&!c.pPass){acc.oP=c.tgt.thr*100;
    plan.push({action:`Get persistency to 87% — chase your renewals`,prio:(c.wg&&c.ng&&c.wasPass)?"HIGH":"MEDIUM",
      why:`You're ${((c.tgt.thr-c.pVal)*100).toFixed(1)} points short. Call customers whose premiums are due — every renewal counts.`,
      result:res(proj())});}
  if(c.eligible){
    plan.push({action:`Keep persistency above 87%`,prio:"HIGH",
      why:`Your promotion holds only while renewals stay strong. Follow up on premiums due in the next 30 days.`,
      result:"→ Your eligibility stays locked in ✓"});
    plan.push({action:`Keep selling ~${lakh(c.tgt.wfyp/12)} + ${Math.ceil(c.tgt.nop/12)} policies a month`,prio:"MEDIUM",
      why:`The 12-month window moves every month — this month's work protects next month's score.`,
      result:"→ No dip after promotion"});}
  return plan;
}
function coach(c){
  const plan=buildPlan(c);
  const items=plan.map((p,i)=>`<div class="pi ${i===0?'first':''}"><div class="pih"><span class="rank">${i+1}</span><b>${p.action}</b>${i===0?'<span class="chip n">MOST IMPORTANT</span>':'<span class="chip w">THEN</span>'}</div>
    <div class="pwhy">${p.why}</div><div class="pres">${p.result}</div></div>`).join('');
  const planBlock=`<details class="plan"><summary>My simple plan · ${plan.length} step${plan.length>1?'s':''} ▸</summary><div class="planlist">${plan.length>1&&!c.eligible?'<div class="pnote">Do these in order — each step builds on the last.</div>':''}${items}</div></details>`;
  if(c.eligible)return `<div class="coach rise"><div class="ic">🏆</div><div style="flex:1"><div class="tag">Your coach</div><div class="tx">Outstanding — every gate is green. Hold this pace and your promotion case is rock-solid.</div>${planBlock}</div></div>`;
  let move,detail='';
  if(!c.wg)move=`${lakh(c.gapWfyp)} more WFYP`;
  else if(!c.ng)move=`${c.gapNop} more ${c.gapNop===1?'policy':'policies'}`;
  else if(!c.wasPass){const nP=Math.ceil(c.needNopWas);move=`${nP} more ${nP===1?'policy':'policies'}`;detail=` (or about ${lakh(c.needWfypWas)} WFYP)`;}
  else move=c.persGap!=null?`+${(c.persGap*100).toFixed(1)}% persistency`:`a persistency update`;
  const near=Math.round(closeness(c)*100);
  return `<div class="coach rise"><div class="ic">🎯</div><div style="flex:1"><div class="tag">Your coach</div>
    <div class="tx">You're <b>${near}%</b> of the way. Just <b>${move}</b>${detail} and you'll be promotion-eligible. Keep going!</div>${planBlock}</div></div>`;
}
function kpis(c){
  const cell=(t,story,ok,bar,cls,meta,chip)=>`<div class="kpi rise"><div class="kh">${t}${chip}</div>
    <div class="story ${ok?'ok':''}">${story}</div>
    <div class="bar ${cls}"><i data-w="${Math.max(0,Math.min(bar,100))}%"></i></div><div class="meta">${meta}</div></div>`;
  const chip=b=>`<span class="chip ${b?'y':'n'}">${b?'CLEARED':'AHEAD'}</span>`;
  const wStory=c.wg?`Gate cleared — ${lakh(c.sW)} banked ✓`:`<b>${lakh(c.gapWfyp)}</b> more to clear this gate`;
  const w=cell("WFYP",wStory,c.wg,c.wa/0.75*100,c.wg?'ib-ok':'ib-wn',`${(c.wa*100).toFixed(1)}% achieved · ${lakh(c.sW)} of ${lakh(c.tgt.wfyp)}`,chip(c.wg));
  const nStory=c.ng?`Gate cleared — ${c.sN} policies strong ✓`:`Just <b>${c.gapNop} more ${c.gapNop===1?'policy':'policies'}</b> unlocks this gate`;
  const n=cell("NOP",nStory,c.ng,c.na/0.5*100,c.ng?'ib-ok':'ib-wn',`${(c.na*100).toFixed(1)}% achieved · ${c.sN} of ${c.tgt.nop} policies`,chip(c.ng));
  let sStory;
  if(c.wasPass)sStory=`Above the 100% line — hold it ✓`;
  else if(c.wg&&c.ng){const nP=Math.ceil(c.needNopWas);sStory=`<b>${nP} more ${nP===1?'policy':'policies'}</b> lifts you past 100%`;}
  else sStory=`Rises as your gates clear — now ${(c.ov*100).toFixed(1)}%`;
  const sv=cell("Overall WAS",sStory,c.wasPass,c.ov*100,c.wasPass?'ib-ok':'ib-no',`${(c.ov*100).toFixed(1)}% · summit is 100%`,`<span class="chip ${c.wasPass?'y':'n'}">${c.wasPass?'ABOVE 100':'CLIMBING'}</span>`);
  let p;
  if(c.pExempt)p=cell("Persistency","New joiner — this camp is yours free ✓",true,100,'ib-ok',`Exempt from the 87% check`,`<span class="chip y">EXEMPT</span>`);
  else if(c.pPass)p=cell("Persistency",`Locked in at ${(c.pVal*100).toFixed(1)}% ✓`,true,c.pVal/0.87*100,'ib-ok',(c.pSource==='record'?'On record':'Entered')+` · needs ≥ 87%`,`<span class="chip y">CLEARED</span>`);
  else p=cell("Persistency",`<b>+${((c.tgt.thr-c.pVal)*100).toFixed(1)}%</b> to reach the 87% mark`,false,c.pVal/0.87*100,'ib-no',(c.pSource==='record'?'On record':'Entered')+` ${(c.pVal*100).toFixed(1)}% · needs ≥ 87%`,`<span class="chip n">AHEAD</span>`);
  return w+n+sv+p;
}
function checklist(c){
  const item=(l,st,d)=>{const m={p:'✓',f:'✕'};return `<div class="chk"><div class="ci ${st}">${m[st]}</div><div class="ct">${l}<div class="cs">${d}</div></div></div>`;};
  const S=b=>b?'p':'f';
  const pD=c.pExempt?'Exempt — new joiner':((c.pVal*100).toFixed(1)+'% vs 87%'+(c.pSource==='record'?' (on record)':''));
  return item("Milestone 1 · WFYP Gate ≥ 75%",S(c.wg),`${(c.wa*100).toFixed(1)}% achieved · ${lakh(c.sW)} of ${lakh(c.tgt.wfyp)}`)
    +item("Milestone 2 · NOP Gate ≥ 50%",S(c.ng),`${(c.na*100).toFixed(1)}% achieved · ${c.sN} of ${c.tgt.nop} policies`)
    +item("Milestone 3 · Overall WAS above 100%",S(c.wasPass),`Currently ${(c.ov*100).toFixed(1)}%`)
    +item("Milestone 4 · Persistency ≥ 87%",c.pExempt?'p':S(c.pPass),pD);
}
function ringSvg(){const R=55,C=2*Math.PI*R;return `<svg width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="${R}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10"/>
  <circle id="ringArc" cx="64" cy="64" r="${R}" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
  <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FDB913"/><stop offset="1" stop-color="#F58220"/></linearGradient></defs></svg>`;}
function animRing(ov){const el=$('ringArc');if(!el)return;const R=55,C=2*Math.PI*R,frac=Math.max(0,Math.min(ov/1,1));
  el.style.transition='none';el.style.strokeDashoffset=C;requestAnimationFrame(()=>{el.style.transition='stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)';el.style.strokeDashoffset=C*(1-frac);});}
function countUp(id,to,suf){const el=$(id);if(!el)return;const t0=performance.now(),dur=950;
  (function tick(t){const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,3);el.innerHTML=Math.round(to*e)+(suf?`<span style="font-size:13px">${suf}</span>`:'');if(p<1)requestAnimationFrame(tick);})(t0);}
function buildJourney(c){let rows='';
  c.rows.forEach(r=>{const g=ok=>`<span class="gd ${ok?'y':'n'}"><span class="d"></span>${ok?'Yes':'No'}</span>`;
    rows+=`<tr class="${r.cur?'cur':''}"><td>${r.m}${r.cur?' •':''}</td><td>${(r.cwa*100).toFixed(0)}%</td><td>${(r.cna*100).toFixed(0)}%</td><td>${(r.cov*100).toFixed(1)}%</td><td>${g(r.wg)}</td><td>${g(r.ng)}</td></tr>`;});
  $('jTbl').innerHTML=`<thead><tr><th>Month</th><th>WFYP %</th><th>NOP %</th><th>Overall WAS</th><th>WFYP Gate</th><th>NOP Gate</th></tr></thead><tbody>${rows}</tbody>`;}

/* ================= charts ================= */
function shortVal(v){const a=Math.abs(v);if(a>=1e7)return (v/1e7).toFixed(1).replace(/\.0(?=Cr)/,'')+'Cr';
  if(a>=1e5)return (v/1e5).toFixed(1).replace(/\.0(?=L)/,'')+'L';if(a>=1e3)return Math.round(v/1e3)+'k';return String(Math.round(v));}
let curChart='cum',chartData=null,rafId=null,chartPts=[];
$('expHist').addEventListener('toggle',e=>{if(e.target.open)setTimeout(()=>drawChart(true),60);});
function chartTab(t){curChart=t;document.querySelectorAll('#chartSeg button').forEach(b=>b.classList.toggle('on',b.dataset.c===t));drawChart(true);}
function drawChart(animate){
  const c=compute(),cv=$('cv'),box=$('chartBox');
  const W=box.clientWidth,H=box.clientHeight;if(!W)return;
  const dpr=window.devicePixelRatio||1;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const x=cv.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
  const labels=c.rows.map(r=>r.m);
  if(curChart==='cum'){chartData={type:'line',labels,series:[{v:c.rows.map(r=>r.cwa*100),col:'#F58220',name:'WFYP'},{v:c.rows.map(r=>r.cna*100),col:'#96172E',name:'NOP'}],ref:100,dl:v=>Math.round(v)+'%',fmt:v=>v.toFixed(0)+'%'};
    $('chartLegend').innerHTML='<span><i style="background:#F58220"></i>WFYP cum %</span><span><i style="background:#96172E"></i>NOP cum %</span><span><i style="background:#c9d2e0"></i>100%</span>';}
  else if(curChart==='was'){chartData={type:'line',labels,series:[{v:c.rows.map(r=>r.cov*100),col:'#96172E',grad:true,name:'WAS',fill:true}],ref:100,refLabel:'100% line',dl:v=>Math.round(v)+'%',fmt:v=>v.toFixed(1)+'%'};
    $('chartLegend').innerHTML='<span><i style="background:#96172E"></i>Overall WAS %</span><span><i style="background:#c9d2e0"></i>100%</span>';}
  else if(curChart==='wfyp'){chartData={type:'bar',labels,vals:c.rows.map(r=>r.w),col:'#F58220',pace:c.tgt.wfyp/12,dl:shortVal,fmt:v=>lakh(v)};
    $('chartLegend').innerHTML='<span><i style="background:#F58220"></i>WFYP actual</span><span><i style="background:#c9d2e0"></i>monthly pace</span>';}
  else{chartData={type:'bar',labels,vals:c.rows.map(r=>r.n),col:'#96172E',pace:c.tgt.nop/12,dl:v=>String(Math.round(v)),fmt:v=>v+' pol.'};
    $('chartLegend').innerHTML='<span><i style="background:#96172E"></i>NOP actual</span><span><i style="background:#c9d2e0"></i>monthly pace</span>';}
  if(rafId)cancelAnimationFrame(rafId);const t0=performance.now(),dur=animate?850:0;
  (function frame(t){const p=dur?Math.min((t-t0)/dur,1):1;const e=1-Math.pow(1-p,3);paint(x,W,H,e);if(p<1)rafId=requestAnimationFrame(frame);})(t0);
}
function paint(x,W,H,prog){
  x.clearRect(0,0,W,H);
  const padL=32,padR=14,padT=14,padB=26,y0=H-padB,x0=padL,x1=W-padR,plotW=x1-x0;chartPts=[];
  if(chartData.type==='line'){
    const all=chartData.series.flatMap(s=>s.v).concat([chartData.ref]);const mx=Math.max(...all)*1.12||1;
    const Y=v=>y0-(v/mx)*(y0-padT);
    const rf=Y(chartData.ref);x.strokeStyle='#dfe3ec';x.setLineDash([5,4]);x.lineWidth=1.4;x.beginPath();x.moveTo(x0,rf);x.lineTo(x1,rf);x.stroke();x.setLineDash([]);
    x.fillStyle='#aab2c0';x.font='9px sans-serif';x.textAlign='left';x.fillText(chartData.refLabel||'100%',x0+2,rf-4);
    /* y-axis figures */
    [mx,mx/2].forEach(tv=>{const ty=Y(tv);if(Math.abs(ty-rf)<11)return;
      x.strokeStyle='#f0f2f7';x.lineWidth=1;x.beginPath();x.moveTo(x0,ty);x.lineTo(x1,ty);x.stroke();
      x.fillStyle='#98a1b0';x.font='8.5px sans-serif';x.fillText(chartData.dl(tv),2,ty+3);});
    chartData.series.forEach(s=>{
      const pts=s.v.map((v,i)=>[x0+i*(plotW/(s.v.length-1)),Y(v*prog)]);
      if(s.fill){x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.lineTo(pts[pts.length-1][0],y0);x.lineTo(pts[0][0],y0);x.closePath();
        const g2=x.createLinearGradient(0,padT,0,y0);g2.addColorStop(0,'rgba(139,92,246,.22)');g2.addColorStop(1,'rgba(91,140,255,0)');x.fillStyle=g2;x.fill();}
      if(s.grad){const gr=x.createLinearGradient(x0,0,x1,0);gr.addColorStop(0,'#FF6B5E');gr.addColorStop(.5,'#C44BC0');gr.addColorStop(1,'#5B8CFF');x.strokeStyle=gr;}else x.strokeStyle=s.col;
      x.lineWidth=2.6;x.lineJoin='round';x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();
      pts.forEach((p,i)=>{x.fillStyle='#fff';x.strokeStyle=s.col;x.lineWidth=2;x.beginPath();x.arc(p[0],p[1],3,0,7);x.fill();x.stroke();
        chartPts.push({x:p[0],y:p[1],label:chartData.labels[i],val:s.v[i],name:s.name,fmt:chartData.fmt});});
      /* point figures */
      if(prog>=1){const last=s.v.length-1,step=plotW/(s.v.length-1),multi=chartData.series.length>1;
        s.v.forEach((v,i)=>{if(v===0&&i!==last)return;
          if(multi&&i!==last)return;
          if(!multi&&step<34&&i%2&&i!==last)return;
          x.fillStyle=i===last?s.col:'#8a93a5';x.font=(i===last?'bold 9.5px':'8.5px')+' sans-serif';x.textAlign='center';
          x.fillText(chartData.dl(v),Math.min(pts[i][0],x1-14),pts[i][1]-8);});}});
  } else {
    const vals=chartData.vals;const mx=Math.max(chartData.pace*1.25,...vals.map(v=>Math.abs(v)))||1;const bw=plotW/vals.length;
    const Y=v=>y0-(v/mx)*(y0-padT);const py=Y(chartData.pace);
    x.strokeStyle='#dfe3ec';x.setLineDash([5,4]);x.lineWidth=1.4;x.beginPath();x.moveTo(x0,py);x.lineTo(x1,py);x.stroke();x.setLineDash([]);
    x.fillStyle='#aab2c0';x.font='8.5px sans-serif';x.textAlign='left';x.fillText('pace '+chartData.dl(chartData.pace),x0+2,py-4);
    [mx].forEach(tv=>{const ty=Y(tv);x.fillStyle='#98a1b0';x.fillText(chartData.dl(tv),2,ty+3);});
    vals.forEach((v,i)=>{const bh=(Math.abs(v)/mx)*(y0-padT)*prog;const bx=x0+i*bw+bw*0.22,bwd=bw*0.56,by=y0-bh;
      const grad=x.createLinearGradient(0,by,0,y0);grad.addColorStop(0,chartData.col);grad.addColorStop(1,chartData.col+'99');
      x.fillStyle=v<0?'#e88':grad;rr(x,bx,by,bwd,bh,4);x.fill();
      chartPts.push({x:bx+bwd/2,y:by,label:chartData.labels[i],val:v,fmt:chartData.fmt});});
    /* bar figures */
    if(prog>=1){x.font='8.5px sans-serif';x.textAlign='center';
      vals.forEach((v,i)=>{if(!v)return;if(bw<27&&i%2)return;
        const bx=x0+i*bw+bw*0.5,by=Y(Math.abs(v));
        x.fillStyle=v<0?'#D8465B':'#6f7a8c';x.fillText(chartData.dl(v),bx,Math.max(10,by-4));});}
  }
  x.fillStyle='#aab2c0';x.font='9px sans-serif';x.textAlign='center';
  chartData.labels.forEach((l,i)=>{if(i%2===0){const px=x0+i*(plotW/(chartData.labels.length-1));x.fillText(l.slice(0,3),px,H-9);}});
  x.textAlign='left';
}
function rr(x,X,Y,W,H,r){r=Math.min(r,W/2,Math.abs(H)/2||0);x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath();}
function hover(clientX){const box=$('chartBox'),tip=$('tip'),rect=box.getBoundingClientRect();const mx=clientX-rect.left;
  let best=null,bd=1e9;chartPts.forEach(p=>{const d=Math.abs(p.x-mx);if(d<bd){bd=d;best=p;}});
  if(best&&bd<30){tip.style.opacity=1;tip.style.left=best.x+'px';tip.style.top=best.y+'px';tip.innerHTML=`${best.label} · <b>${best.fmt(best.val)}</b>${best.name?' '+best.name:''}`;}
  else tip.style.opacity=0;}
document.addEventListener('mousemove',e=>{if(!chartPts.length||$('appView').classList.contains('hide'))return;const r=$('chartBox').getBoundingClientRect();
  if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)hover(e.clientX);else $('tip').style.opacity=0;});
$('chartBox').addEventListener('touchmove',e=>{const t=e.touches[0];if(t)hover(t.clientX);},{passive:true});

/* ================= what-if ================= */
function whatif(){if(!state.emp)return;
  $('sl_w').max=Math.round(targetFor(state.emp.desg).wfyp*0.5/10000)*10000||500000;
  const exempt=(state.emp.pers==="NA"&&$('c_pers').value.trim()==="");
  $('wfPersRow').classList.toggle('hide',exempt);
  const w=+$('sl_w').value,n=+$('sl_n').value,pv=+$('sl_p').value;
  $('sl_w').style.setProperty('--p',(w/$('sl_w').max*100)+'%');$('sl_n').style.setProperty('--p',(n/40*100)+'%');
  $('sl_p').style.setProperty('--p',((pv-60)/40*100)+'%');
  $('wfLW').textContent=lakh(w);$('wfLN').textContent=n;$('wfLP').textContent=pv.toFixed(1)+'%';
  const c=exempt?compute(w,n):compute(w,n,pv);
  $('wfWas').textContent=(c.ov*100).toFixed(1)+'%';
  $('wfNear').textContent=(c.eligible?100:Math.round(closeness(c)*100))+'%';
  const b=$('wfBadge');
  if(c.eligible){b.textContent="✓ Eligible";b.className="chip y";$('wfNote').textContent="With these numbers you'd clear every gate.";}
  else if(c.wg&&c.ng&&c.wasPass){b.textContent="Persistency pending";b.className="chip a";$('wfNote').textContent="Gates + WAS clear — slide persistency to 87% to go green.";}
  else{b.textContent="Not yet";b.className="chip n";$('wfNote').textContent="Keep dragging to find your threshold.";}}
function applyWhatif(){$('c_wfyp').value=$('sl_w').value;$('c_nop').value=$('sl_n').value;
  if(!(state.emp.pers==="NA"&&$('c_pers').value.trim()===""))$('c_pers').value=(+$('sl_p').value).toFixed(1);
  validateCalc();updSum();renderAll(false);window.scrollTo({top:0,behavior:'smooth'});}
function buildMe(){const e=state.emp,t=targetFor(e.desg);
  $('meHost').innerHTML=[["Name",e.name],["DSE ID",state.empId],["BO Code",e.bo],["Designation",(e.full||'')+" ("+e.desg+")"],["Zone",e.zone||'—'],
    ["WFYP annual target",inr(t.wfyp)],["NOP annual target",t.nop],["Persistency threshold",pct0(t.thr)]]
    .map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');}
window.addEventListener('resize',()=>{if(!$('appView').classList.contains('hide')&&$('expHist').open)drawChart(false)});

/* ================================================================
   ADMIN — parsing, validation, publish
================================================================ */
const admin={master:null,monthly:null,targets:null};
const HIST_KEY="elevate_history_v1";
function loadHist(){try{const s=localStorage.getItem(HIST_KEY);if(s)return JSON.parse(s);}catch(e){}return (DATA.meta&&DATA.meta.history)?DATA.meta.history.slice():[];}
function saveHist(h){try{localStorage.setItem(HIST_KEY,JSON.stringify(h));}catch(e){}}
function adminTab(t,btn){
  document.querySelectorAll('#atabs button').forEach(b=>b.classList.toggle('on',b===btn));
  ['ov','up','ru','vp','au'].forEach(k=>$('ap_'+k).classList.toggle('hide',k!==t));
  if(t==='ov')renderAdminOverview();if(t==='ru')renderRules();if(t==='au')renderHistory();
}
function renderAdminOverview(){
  const m=DATA.meta;let rows=0;Object.values(DATA.monthly).forEach(x=>rows+=Object.keys(x).length);
  let stored=false;try{stored=!!localStorage.getItem(STORE_KEY);}catch(e){}
  const st=(l,v)=>`<div class="ovstat"><div class="l">${l}</div><div class="v">${v}</div></div>`;
  $('ovGrid').innerHTML=st('Dataset source',m.source==='demo'?'Demo dataset':'Company upload')
   +st('DSEs on roster',m.dseCount)+st('Performance rows',rows.toLocaleString('en-IN'))
   +st('Data window',mLabel(m.minMonth)+' – '+mLabel(m.maxMonth))
   +st('Last published',m.updatedAt?(new Date(m.updatedAt).toLocaleDateString('en-IN')+(m.publishedBy?' · '+m.publishedBy:'')):'—')
   +st('Browser storage',stored?'Saved ✓':'Session only');
}
function renderRules(){
  let r='<thead><tr><th>Grade</th><th>WFYP annual target</th><th>NOP annual target</th><th>Persistency ≥</th></tr></thead><tbody>';
  Object.entries(DATA.targets).forEach(([d,t])=>r+=`<tr><td>${d}</td><td>${inr(t.wfyp)}</td><td>${t.nop}</td><td>${Math.round(t.thr*100)}%</td></tr>`);
  $('rulesTbl').innerHTML=r+'</tbody>';
}
function dlDataset(){const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(DATA)],{type:'application/json'}));
  a.download='elevate_data.json';a.click();showToast('Dataset JSON downloaded');}
function renderHistory(){
  const h=loadHist();const tb=$('histLog').querySelector('tbody');
  if(!h.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--faint)">No uploads yet — the demo dataset is active.</td></tr>';return;}
  tb.innerHTML=h.map(e=>`<tr><td>${new Date(e.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</td><td>${e.by||'—'}</td><td>${e.dse}</td><td>${e.rows??'—'}</td><td>${mLabel(e.min)} → ${mLabel(e.max)}</td><td style="font-size:10.5px">${e.files?Object.values(e.files).filter(Boolean).join('<br>'):'—'}</td><td>${e.warns||0}</td></tr>`).join('');
}
function pick(kind){$('f_'+kind).click();}
/* drag & drop */
['master','monthly','targets'].forEach(kind=>{
  const el=$('up_'+kind);
  el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('over');});
  el.addEventListener('dragleave',()=>el.classList.remove('over'));
  el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('over');const f=e.dataTransfer.files[0];if(f)readFile(kind,f);});
});
function fileChosen(kind,input){const f=input.files[0];if(f)readFile(kind,f);input.value='';}
function readFile(kind,file){
  const name=file.name.toLowerCase();
  if(name.endsWith('.xlsx')||name.endsWith('.xls')){
    if(typeof XLSX==='undefined'){setStat(kind,false,"Excel library failed to load — refresh the page, or save as CSV and retry.");return;}
    const rd=new FileReader();
    rd.onload=e=>{try{const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
      ingest(kind,rows,file.name);}catch(err){setStat(kind,false,"Could not read Excel file: "+err.message);}};
    rd.readAsArrayBuffer(file);
  }else{
    const rd=new FileReader();
    rd.onload=e=>{try{ingest(kind,parseCSV(e.target.result),file.name);}catch(err){setStat(kind,false,"Could not parse CSV: "+err.message);}};
    rd.readAsText(file);
  }
}
/* CSV parser: quotes, commas, CRLF */
function parseCSV(text){
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
    else if(ch==='"')q=true;
    else if(ch===','){row.push(cell);cell='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(c=>String(c).trim()!==''))rows.push(row);row=[];}
    else cell+=ch;}
  row.push(cell);if(row.some(c=>String(c).trim()!==''))rows.push(row);
  return rows;
}
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const ALIASES={
 master:{dseid:['dseid','dse_id','employeecode','empid','employeeid','dseidnumber'],
   bocode:['bocode','bo_code','dsebocode','bo'],name:['name','employeename','dsename'],
   full:['designationfull','businessdesignation','designation','fulldesignation'],
   desg:['desg','grade','shortdesg','desgcode','gradecode'],zone:['zone','region'],
   pers:['persistency','persistencypercent','persist','persistencyonrecord']},
 monthly:{bocode:['bocode','bo_code','dsebocode','bo'],month:['month','monthkey','period','yearmonth'],
   wfyp:['wfyp','wfypactual','wfypamount'],nop:['nop','nopactual','policies','nopcount']},
 targets:{desg:['desg','designation','grade','desgcode'],wfyp:['wfyptarget','wfyp','wfypannualtarget'],
   nop:['noptarget','nop','nopannualtarget'],thr:['persistencythreshold','threshold','persistency','persistthreshold']}
};
function mapHeader(kind,hdr){
  const map={};const spec=ALIASES[kind];
  hdr.forEach((h,i)=>{const n=norm(h);for(const key in spec){if(spec[key].includes(n))map[key]=i;}});
  return map;
}
function parseMonth(v){
  if(v==null||v==='')return null;
  if(typeof v==='number'&&v>20000&&v<60000){const d=new Date(Math.round((v-25569)*86400*1000));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
  const s=String(v).trim();
  let m=s.match(/^(\d{4})[-\/](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}`;
  m=s.match(/^([A-Za-z]{3,9})[\s'\-\.]*(\d{2,4})$/);
  if(m){const mi=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[1].slice(0,3).toLowerCase());
    if(mi>=0){let y=+m[2];if(y<100)y+=2000;return `${y}-${String(mi+1).padStart(2,'0')}`;}}
  m=s.match(/^(\d{1,2})[-\/](\d{4})$/);if(m)return `${m[2]}-${String(+m[1]).padStart(2,'0')}`;
  return null;
}
function numv(v){if(v===''||v==null)return null;const n=parseFloat(String(v).replace(/[,₹\s]/g,''));return isNaN(n)?null:n;}
function ingest(kind,rows,fname){
  if(!rows.length){setStat(kind,false,"File is empty.");return;}
  const map=mapHeader(kind,rows[0]);const body=rows.slice(1);
  const errors=[],warns=[];
  const need={master:['dseid','bocode','name','desg','pers'],monthly:['bocode','month','wfyp','nop'],targets:['desg','wfyp','nop']}[kind];
  const missing=need.filter(k=>map[k]===undefined);
  if(missing.length){setStat(kind,false,"Missing column(s): "+missing.join(', ')+". Download the template to see the expected headers.");admin[kind]=null;refreshPub();return;}
  if(kind==='master'){
    const out={};const seenBo=new Set();
    body.forEach((r,ix)=>{const ln=ix+2;
      const id=parseInt(r[map.dseid],10),bo=String(r[map.bocode]||'').trim().toUpperCase();
      const nm=String(r[map.name]||'').trim(),dg=String(r[map.desg]||'').trim();
      if(!id||!bo||!nm||!dg){errors.push(`Row ${ln}: missing DSE_ID / BO_Code / Name / Desg`);return;}
      if(out[id]){errors.push(`Row ${ln}: duplicate DSE_ID ${id}`);return;}
      if(seenBo.has(bo)){errors.push(`Row ${ln}: duplicate BO_Code ${bo}`);return;}
      seenBo.add(bo);
      let pv=String(r[map.pers]??'').trim().toUpperCase();let pers;
      if(pv===''||pv==='NA'||pv==='N/A')pers="NA";
      else{const n=numv(pv);if(n==null){errors.push(`Row ${ln}: persistency "${pv}" is not a number or NA`);return;}
        pers=n>1.5?n/100:n;if(pers<0||pers>1.2){errors.push(`Row ${ln}: persistency ${pv} out of range`);return;}}
      out[id]={bo,name:nm,full:String(r[map.full]||'').trim()||dg,desg:dg,zone:String(map.zone!==undefined?r[map.zone]:'').trim()||'—',pers};});
    finish(kind,out,Object.keys(out).length+" DSEs",errors,warns,fname,body.slice(0,4),rows[0]);
  }
  if(kind==='monthly'){
    const out={};let cnt=0;const dup=new Set();
    body.forEach((r,ix)=>{const ln=ix+2;
      const bo=String(r[map.bocode]||'').trim().toUpperCase();const mk=parseMonth(r[map.month]);
      const w=numv(r[map.wfyp]),n=numv(r[map.nop]);
      if(!bo){errors.push(`Row ${ln}: missing BO_Code`);return;}
      if(!mk){errors.push(`Row ${ln}: month "${r[map.month]}" not understood (use 2026-03 or Mar'26)`);return;}
      if(w==null||n==null){errors.push(`Row ${ln}: WFYP/NOP not numeric`);return;}
      out[bo]=out[bo]||{};
      const k=bo+"|"+mk;
      if(dup.has(k)){warns.push(`Row ${ln}: duplicate ${bo} ${mk} — values summed`);out[bo][mk]={w:out[bo][mk].w+w,n:out[bo][mk].n+n};}
      else{dup.add(k);out[bo][mk]={w,n};}
      cnt++;});
    finish(kind,out,cnt+" month-rows · "+Object.keys(out).length+" DSEs",errors,warns,fname,body.slice(0,4),rows[0]);
  }
  if(kind==='targets'){
    const out={};
    body.forEach((r,ix)=>{const ln=ix+2;
      const dg=String(r[map.desg]||'').trim();const w=numv(r[map.wfyp]),n=numv(r[map.nop]);
      let th=map.thr!==undefined?numv(r[map.thr]):87;if(th==null)th=87;th=th>1.5?th/100:th;
      if(!dg||w==null||n==null||w<=0||n<=0){errors.push(`Row ${ln}: bad grade / targets`);return;}
      if(out[dg]){errors.push(`Row ${ln}: duplicate grade ${dg}`);return;}
      out[dg]={wfyp:w,nop:n,thr:th};});
    finish(kind,out,Object.keys(out).length+" grades",errors,warns,fname,body.slice(0,4),rows[0]);
  }
}
function finish(kind,data,summary,errors,warns,fname,preview,hdr){
  if(errors.length){admin[kind]=null;setStat(kind,false,fname+" — "+errors.length+" error(s)");}
  else{admin[kind]={data,warns,fname};setStat(kind,true,fname+" ✓ "+summary+(warns.length?(" · "+warns.length+" warning(s)"):""));}
  showProblems(kind,errors,warns);
  refreshPub();
}
function setStat(kind,ok,msg){const el=$('s_'+kind);el.textContent=msg;el.className='stat '+(ok?'ok':'bad');
  const box=$('up_'+kind);box.classList.toggle('done',ok);box.classList.toggle('err',!ok&&msg!=='');}
function showProblems(kind,errors,warns){
  const box=$('probBox');
  if(!errors.length&&!warns.length){box.classList.add('hide');box.innerHTML='';return;}
  const cap=8;
  box.classList.remove('hide');
  box.innerHTML=`<div class="pt">${kind==='master'?'Employee Master':kind==='monthly'?'Monthly Performance':'Designation Targets'} — issues found</div><ul>`+
    errors.slice(0,cap).map(e=>`<li class="e">${e}</li>`).join('')+
    (errors.length>cap?`<li class="e">…and ${errors.length-cap} more errors</li>`:'')+
    warns.slice(0,cap).map(w=>`<li class="w">${w}</li>`).join('')+
    (warns.length>cap?`<li class="w">…and ${warns.length-cap} more warnings</li>`:'')+`</ul>`;
}
function refreshPub(){
  const ready=admin.master&&admin.monthly;
  $('pubBtn').disabled=!ready;
  if(!ready){$('pubInfo').innerHTML="Upload the <b>Employee Master</b> and <b>Monthly Performance</b> to enable publishing. Targets are optional (built-in table used if skipped).";return;}
  /* cross-validation preview */
  const tg=admin.targets?admin.targets.data:DEMO_TARGETS;
  const badDesg=[...new Set(Object.values(admin.master.data).map(e=>e.desg).filter(d=>!tg[d]))];
  const boSet=new Set(Object.values(admin.master.data).map(e=>e.bo));
  const orphan=Object.keys(admin.monthly.data).filter(bo=>!boSet.has(bo));
  let msg=`Ready: <b>${Object.keys(admin.master.data).length} DSEs</b>, <b>${Object.keys(admin.monthly.data).length}</b> with monthly data`;
  if(badDesg.length)msg+=` · <span style="color:var(--no)">unknown grade(s): ${badDesg.join(', ')} — fix master or upload targets</span>`;
  if(orphan.length)msg+=` · <span style="color:var(--warn)">${orphan.length} BO code(s) in performance not in master (will be skipped)</span>`;
  $('pubInfo').innerHTML=msg;
  $('pubBtn').disabled=badDesg.length>0;
}
function publish(){
  const tg=admin.targets?admin.targets.data:JSON.parse(JSON.stringify(DEMO_TARGETS));
  const master=admin.master.data;
  const boSet=new Set(Object.values(master).map(e=>e.bo));
  const monthly={};let minM=null,maxM=null;
  Object.entries(admin.monthly.data).forEach(([bo,months])=>{
    if(!boSet.has(bo))return;
    monthly[bo]=months;
    Object.keys(months).forEach(k=>{if(!minM||k<minM)minM=k;if(!maxM||k>maxM)maxM=k;});});
  if(!maxM){alert("No performance rows matched the Employee Master BO codes.");return;}
  const by=($('pubBy').value.trim()||'Admin');
  let rowCount=0;Object.values(monthly).forEach(m=>rowCount+=Object.keys(m).length);
  const warnCount=(admin.master.warns.length+admin.monthly.warns.length+(admin.targets?admin.targets.warns.length:0));
  const entry={at:new Date().toISOString(),by,dse:Object.keys(master).length,rows:rowCount,min:minM,max:maxM,
    files:{master:admin.master.fname,monthly:admin.monthly.fname,targets:admin.targets?admin.targets.fname:'(built-in)'},warns:warnCount};
  const hist=[entry,...loadHist()].slice(0,20);saveHist(hist);
  const ds={master,targets:tg,monthly,meta:{source:"upload",dseCount:Object.keys(master).length,minMonth:minM,maxMonth:maxM,updatedAt:entry.at,publishedBy:by,history:hist.slice(0,10)}};
  DATA=ds;
  const persisted=saveDataset(ds);
  const blob=new Blob([JSON.stringify(ds)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  showToast('Dataset published ✓');
  $('pubDone').classList.remove('hide');
  $('pubDone').innerHTML=`✅ <b>Published.</b> The dashboard now runs on your uploaded data — ${ds.meta.dseCount} DSEs, ${mLabel(minM)} → ${mLabel(maxM)}. `+
    (persisted?`Saved in this browser. `:`<span style="color:var(--warn)">Browser storage unavailable here — active for this session only.</span> `)+
    `<br>For everyone on the shared link: <a href="${url}" download="elevate_data.json" style="color:var(--red);font-weight:800">⬇ download elevate_data.json</a> and place it next to this HTML on your web server — the page auto-loads it for all users. `+
    `<a onclick="backToLanding()" style="color:var(--red);font-weight:800;cursor:pointer;text-decoration:underline">Open the dashboard →</a>`;
  refreshLanding();renderHistory();renderAdminOverview();
}
function resetToDemo(){clearStored();DATA=demoDataset();admin.master=admin.monthly=admin.targets=null;
  ['master','monthly','targets'].forEach(k=>{setStat(k,false,'');$('up_'+k).classList.remove('done','err');});
  $('probBox').classList.add('hide');$('pubDone').classList.add('hide');refreshPub();refreshLanding();renderHistory();renderAdminOverview();}
/* template downloads */
function dlTemplate(kind){
  let csv;
  if(kind==='master')csv="DSE_ID,BO_Code,Name,Designation_Full,Desg,Zone,Persistency\n593994,ZV9506,Himani Kakkar,Portfolio Manager,PM,North,96.55\n635771,AHW165,Sangram Shinde,Deputy Customer Relationship Manager,DSM,West,NA\n";
  else if(kind==='monthly')csv="BO_Code,Month,WFYP,NOP\nZV9506,2026-03,6417087.80,22\nZV9506,2026-04,309883.31,2\nAHW165,Mar'26,1245449.12,26\n";
  else csv="Desg,WFYP_Target,NOP_Target,Persistency_Threshold\nSDSE,1680000,30,87\nADSM,2000000,35,87\nEADSM,2800000,35,87\nDSM,3500000,35,87\nSr.DSM,5000000,40,87\nSWM,6000000,40,87\nPM,8000000,50,87\nSPMG,10000000,50,87\nCPM,12000000,50,87\nEPM,16000000,60,87\n";
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download={master:"employee_master.csv",monthly:"monthly_performance.csv",targets:"designation_targets.csv"}[kind];a.click();
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(!$('adminGate').classList.contains('hide')){checkPin();return;}
  if(!$('landing').classList.contains('hide')){
    if(!$('authStep2').classList.contains('hide'))authVerify();else authSend();return;}
  if(!$('appView').classList.contains('hide')&&!$('onboard').classList.contains('hide')&&!$('calcBtn').disabled)calculate();
});
/* ===== V2: share (Web Share API, clipboard fallback) ===== */
function shareStatus(){
  if(!state.calculated){showToast('Calculate your status first','info');return;}
  const c=compute(),near=c.eligible?100:Math.round(closeness(c)*100);
  const txt=`Elevate · ${c.e.name} (${c.e.desg})\n${mLabel(c.anchor)} — ${c.status}\nOverall WAS ${(c.ov*100).toFixed(1)}% · ${[c.wg,c.ng,c.wasPass,c.pPass].filter(Boolean).length} of 4 gates · ${near}% of the way\n${nextMoveText(c)}`;
  if(navigator.share){navigator.share({title:'My Elevate status',text:txt}).catch(()=>{});}
  else if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>showToast('Status copied — paste anywhere'))
      .catch(()=>showToast('Sharing unavailable here','info'));}
  else showToast('Sharing unavailable here','info');
}
/* ===== V2: management report ===== */
function downloadReport(){
  if(!state.calculated){showToast('Calculate your status first','info');return;}
  const c=compute(),near=c.eligible?100:Math.round(closeness(c)*100),e=c.e,plan=buildPlan(c);
  const logo=document.querySelector('#appView .nav img.ablogo').src;
  const g=(ok,txt)=>`<span class="${ok?'ok':'no'}">${ok?'✓ '+ (txt||'Met'):'✗ '+(txt||'Not met')}</span>`;
  const strip=h=>h.replace(/<[^>]+>/g,'');
  const rows=c.rows.map(r=>`<tr><td>${r.m}${r.cur?' •':''}</td><td>${lakh(r.w)}</td><td>${r.n}</td><td>${(r.cwa*100).toFixed(0)}%</td><td>${(r.cna*100).toFixed(0)}%</td><td>${(r.cov*100).toFixed(1)}%</td></tr>`).join('');
  const planHtml=plan.map((p,i)=>`<div class="rp-plan"><b>${i+1}. ${strip(p.action)}</b> — <i>${i===0?'Most important':'Then'}</i><br>${strip(p.why)}<br><b>${strip(p.result)}</b></div>`).join('');
  const gaps=[];
  if(!c.wg)gaps.push(`WFYP shortfall to 75% gate: <b>${lakh(c.gapWfyp)}</b>`);
  if(!c.ng)gaps.push(`NOP shortfall to 50% gate: <b>${c.gapNop} policies</b>`);
  if(c.wg&&c.ng&&!c.wasPass)gaps.push(`To exceed 100% WAS: <b>≈${Math.ceil(c.needNopWas)} policies</b> or <b>${lakh(c.needWfypWas)}</b> premium`);
  if(!c.pExempt&&!c.pPass)gaps.push(`Persistency shortfall to 87%: <b>${((c.tgt.thr-c.pVal)*100).toFixed(1)} pts</b>`);
  if(!gaps.length)gaps.push(`<span class="ok">No gaps — all promotion criteria satisfied.</span>`);
  $('printReport').innerHTML=`
  <div class="rp-head"><img src="${logo}" alt="ABSLI"><div class="rp-title"><h1>Sales Progression Report</h1>
    <div>Elevate · Direct Marketing · Assessment month ${mLabel(c.anchor)}</div></div></div>
  <h2>Employee Profile</h2>
  <table><tr><th>Name</th><th>DSE ID</th><th>BO Code</th><th>Designation</th><th>Zone</th><th>Annual Targets</th></tr>
  <tr><td>${e.name}</td><td>${state.empId}</td><td>${e.bo}</td><td>${e.full} (${e.desg})</td><td>${e.zone}</td><td>${lakh(c.tgt.wfyp)} WFYP · ${c.tgt.nop} NOP</td></tr></table>
  <h2>Promotion Readiness</h2>
  <div class="rp-grid">
    <div class="rp-stat"><div class="l">Status</div><div class="v" style="font-size:12.5px">${c.status}</div></div>
    <div class="rp-stat"><div class="l">Overall WAS</div><div class="v">${(c.ov*100).toFixed(2)}%</div></div>
    <div class="rp-stat"><div class="l">Readiness</div><div class="v">${near}%</div></div>
  </div>
  <h2>Gate Status</h2>
  <table><tr><th>Gate</th><th>Requirement</th><th>Actual</th><th>Status</th></tr>
  <tr><td>WFYP Achievement</td><td>≥ 75%</td><td>${(c.wa*100).toFixed(1)}% (${lakh(c.sW)})</td><td>${g(c.wg)}</td></tr>
  <tr><td>NOP Achievement</td><td>≥ 50%</td><td>${(c.na*100).toFixed(1)}% (${c.sN} policies)</td><td>${g(c.ng)}</td></tr>
  <tr><td>Overall WAS</td><td>&gt; 100%</td><td>${(c.ov*100).toFixed(2)}%</td><td>${g(c.wasPass)}</td></tr>
  <tr><td>Persistency</td><td>≥ 87%</td><td>${c.pExempt?'New joiner':((c.pVal*100).toFixed(2)+'%'+(c.pSource==='record'?' (on record)':''))}</td><td>${c.pExempt?'<span class="ok">Exempt</span>':g(c.pPass)}</td></tr></table>
  <h2>12-Month Trend (${mLabel(addM(c.anchor,-11))} – ${mLabel(c.anchor)})</h2>
  <table><tr><th>Month</th><th>WFYP</th><th>NOP</th><th>Cum WFYP %</th><th>Cum NOP %</th><th>Cum WAS</th></tr>${rows}</table>
  <h2>Gap Analysis</h2><div>${gaps.join('<br>')}</div>
  <h2>Coach Recommendations — Next Action Plan</h2>${planHtml}
  <div class="rp-foot"><span>Generated ${new Date().toLocaleString('en-IN')} · ${DATA.meta.source==='demo'?'Demo dataset':'Company dataset published '+new Date(DATA.meta.updatedAt).toLocaleDateString('en-IN')}</span>
  <span>Confidential — internal ABSLI document</span></div>`;
  showToast('Preparing report — choose “Save as PDF”','info');
  setTimeout(()=>window.print(),350);
}
/* ===== Ascent Path helpers ===== */
const RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function placeNodes(wrap,path,fracs){
  const svg=wrap.querySelector('svg'),vb=svg.viewBox.baseVal,L=path.getTotalLength();
  return fracs.map(f=>{const pt=path.getPointAtLength(L*f);
    const sp=document.createElement('span');sp.className='pmnode';
    sp.style.left=(pt.x/vb.width*100)+'%';sp.style.top=(pt.y/vb.height*100)+'%';
    wrap.appendChild(sp);return sp;});
}
function drawPath(path,dur,delay){
  const L=path.getTotalLength();
  if(RM){path.style.strokeDasharray='none';return;}
  path.style.strokeDasharray=L;path.style.strokeDashoffset=L;
  requestAnimationFrame(()=>{path.style.transition=`stroke-dashoffset ${dur}s cubic-bezier(.3,.6,.2,1) ${delay}s`;path.style.strokeDashoffset=0;});
}
function drawJourney(){
  const wrap=$('lpathwrap');if(!wrap||wrap.dataset.done)return;wrap.dataset.done=1;
  const p=$('lpathLine');drawPath(p,2.6,.35);
  const nodes=placeNodes(wrap,p,[.2,.46,.72,.97]);
  nodes.forEach((nd,i)=>setTimeout(()=>{nd.classList.add('on','pop');},RM?0:(1100+i*480)));
  const mini=$('miniTrail');if(mini&&!mini.dataset.done){mini.dataset.done=1;
    const mp=$('miniPath');drawPath(mp,1.6,.9);
    const mn=placeNodes(mini,mp,[.06,.4,.72,.97]);
    setTimeout(()=>mn[0].classList.add('on','pop'),RM?0:1600);}
}
drawJourney();
/* ===== Earnings (engine-driven) ===== */
let INCENTIVE=null;
async function loadIncentive(){if(INCENTIVE)return INCENTIVE;try{const r=await fetch('elevate_incentive.json',{cache:'no-store'});if(r.ok)INCENTIVE=await r.json();}catch(e){}return INCENTIVE;}
function moveLabel(r){if(!r)return null;
  if(r.lever==='nop')return r.extraPolicies===1?'Sell one more policy':`Sell ${r.extraPolicies} more policies`;
  if(r.lever==='ulipGrid')return `Grow ULIP premium by ${lakh(r.rupeesNeeded)}`;
  if(r.lever==='achievement')return `Bring in ${lakh(r.rupeesNeeded)} more premium`;
  if(r.lever==='persistency')return 'Improve persistency';
  return 'Your best move';}
async function openEarnings(){
  const e=state.emp;if(!e)return;
  $('appView').classList.add('hide');$('earningsView').classList.remove('hide');window.scrollTo(0,0);
  $('earnHost').innerHTML='<div class="eempty">Loading your statement…</div>';
  await loadIncentive();
  const row=INCENTIVE&&INCENTIVE[e.bo];
  if(!row){$('earnHost').innerHTML=`<div class="eempty">No incentive statement was published for <b>${e.name}</b> this month.<br><span style="font-size:12px">Earnings appear once your DSE code is in the monthly incentive sheet.</span></div>`;return;}
  if(!(window.Elevate&&window.Elevate.earningsFor)){$('earnHost').innerHTML='<div class="eempty">The earnings engine could not load. Serve the app over http (not file://).</div>';return;}
  renderEarnings(window.Elevate.earningsFor(Object.assign({},row)),e);
}
function closeEarnings(){$('earningsView').classList.add('hide');$('appView').classList.remove('hide');window.scrollTo(0,0);}
function renderEarnings(s,e){
  const H=s.headline;
  const crRows=s.credits.map(c=>`<div class="er cr"><span class="bar"></span><div class="nm">${c.label}</div><div class="amt">+${inr(c.amount)}</div></div>`).join('');
  const opRows=s.deductions.length?s.deductions.map(c=>`<div class="er op"><span class="bar"></span><div><div class="nm">${c.label}</div><div class="ds">${c.recoverable?'recoverable':''}</div></div><div class="amt">−${inr(Math.abs(c.amount))}</div></div>`).join(''):`<div class="er"><div class="nm" style="color:var(--muted);font-weight:600">Nothing on the table — fully optimised ✓</div></div>`;
  const rec=s.recommendations&&s.recommendations[0];
  const move=rec?`<div class="emove"><div class="ic">⚡</div><div class="tx"><b>${moveLabel(rec)}</b> adds <b>${inr(rec.deltaFinal)}</b> this month.</div></div>`:'';
  $('earnHost').innerHTML=`
    <div class="ehero"><div class="lbl">Estimated incentive · April</div>
      <div class="big">${inr(H.finalAmount)}</div>
      <div class="pot">Potential <b>${inr(H.baseline)}</b> · <b>${inr(H.onTheTable)}</b> to claim</div></div>
    <div class="card"><div class="eyebrow" style="margin-top:0;display:flex;justify-content:space-between"><span style="color:var(--ok)">Earned · in the bank</span><span class="esum" style="color:var(--ok)">+${inr(H.baseline)}</span></div>
      <div class="eledger">${crRows}</div></div>
    <div class="card" style="margin-top:14px"><div class="eyebrow" style="margin-top:0;display:flex;justify-content:space-between"><span style="color:var(--warn)">Still on the table</span><span class="esum" style="color:var(--warn)">${inr(H.onTheTable)}</span></div>
      <div class="eledger">${opRows}</div></div>
    ${move}
    <div class="etrust">From the company payout sheet · ${e.name} · ${e.desg}</div>`;
}
/* boot */
initData();
