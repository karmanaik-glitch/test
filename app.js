'use strict';

/* ══ DRUG AUTOCOMPLETE DATABASE ══ */
const indianDrugs = ["Amoxicillin","Clavulanic Acid","Paracetamol","Metformin","Glimepiride","Atorvastatin","Rosuvastatin","Pantoprazole","Rabeprazole","Amlodipine","Telmisartan","Losartan","Levothyroxine","Aspirin","Clopidogrel","Azithromycin","Cefixime","Ceftriaxone","Diclofenac","Aceclofenac","Ibuprofen","Ondansetron","Domperidone","Metoprolol","Bisoprolol","Sitagliptin","Vildagliptin","Teneligliptin","Dapagliptin","Empagliflozin","Montelukast","Levocetirizine","Cetirizine","Fexofenadine","Pregabalin","Gabapentin","Methylcobalamin","Vitamin D3","Calcium Carbonate","Iron","Folic Acid","Zinc","Vitamin B Complex","Vitamin C","Cilnidipine","Chlorthalidone","Metronidazole","Ciprofloxacin","Ofloxacin","Levofloxacin","Doxycycline","Fluconazole","Itraconazole","Miconazole","Albendazole","Ivermectin","Hydroxychloroquine","Linezolid","Meropenem","Piperacillin","Tazobactam","Amikacin","Gentamicin","Vancomycin","Teicoplanin","Colistin","Polymyxin B","Tigecycline","Dexamethasone","Methylprednisolone","Prednisolone","Hydrocortisone","Deflazacort","Budesonide","Formoterol","Salbutamol","Levosalbutamol","Ipratropium","Tiotropium","Fluticasone","Mometasone","Umeclidinium","Glycopyrrolate","Theophylline","Doxofylline","Deriphyllin","Ambroxol","Guaifenesin","Bromhexine","Dextromethorphan","Chlorpheniramine","Phenylephrine","Paroxetine","Escitalopram","Sertraline","Fluoxetine","Fluvoxamine","Amitriptyline","Duloxetine","Venlafaxine","Mirtazapine","Desvenlafaxine","Bupropion","Clonazepam","Diazepam","Lorazepam","Alprazolam","Etizolam","Clobazam","Zolpidem","Nitrazepam","Midazolam","Chlordiazepoxide","Phenytoin","Carbamazepine","Valproate","Levetiracetam","Lamotrigine","Topiramate","Oxcarbazepine","Zonisamide","Lacosamide","Brivaracetam","Perampanel","Rufinamide","Eslicarbazepine","Vigabatrin","Tiagabine","Ethosuximide","Primidone","Phenobarbital","Haloperidol","Risperidone","Olanzapine","Quetiapine","Clozapine","Ziprasidone","Aripiprazole","Paliperidone","Iloperidone","Lurasidone","Asenapine","Blonanserin","Amisulpride","Cariprazine","Brexpiprazole","Lumateperone","Pimavanserin"];

function handleAC(inp) {
  const v = inp.value.toLowerCase();
  const ac = inp.nextElementSibling;
  if(!ac || !ac.classList.contains('rx-ac')) return;
  if(v.length < 2) { ac.classList.remove('show'); return; }
  const matches = indianDrugs.filter(d => d.toLowerCase().includes(v)).slice(0,8);
  if(matches.length > 0) {
    ac.innerHTML = matches.map(m => `<div class="rx-ac-item" data-val="${m.replace(/"/g,'&quot;')}" data-inp="${inp.id}">${m}</div>`).join('');
    ac.classList.add('show');
  } else { ac.classList.remove('show'); }
}

function selectAC(val, id) {
  const inp = document.getElementById(id);
  inp.value = val;
  const acEl = inp.nextElementSibling; if(acEl) acEl.classList.remove('show');
  inp.focus();
}

document.addEventListener('click', e => {
  if(e.target.classList.contains('rx-ac-item')) {
    const val = e.target.getAttribute('data-val');
    const id  = e.target.getAttribute('data-inp');
    if(val && id) selectAC(val, id);
    return;
  }
  if(!e.target.classList.contains('rx-ac-inp')) {
    document.querySelectorAll('.rx-ac').forEach(a => a.classList.remove('show'));
  }
});

/* ══ PREMIUM UI SOUND ENGINE ══ */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  return audioCtx;
}

const Sounds = {
  play: (type) => {
    const ctx = getAudioCtx();
    if (!S.haptic || !ctx || ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = ctx.currentTime;
    if (type === 'tick') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gainNode.gain.setValueAtTime(0.05, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'pop') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'receive') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.05, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.25);
    }
  }
};
document.addEventListener('click', () => { const c = getAudioCtx(); if(c && c.state === 'suspended') c.resume(); }, {once: true});

/* ══ OFFLINE EVENTS ══ */
window.addEventListener('offline', () => toast('You are offline. Changes will sync when reconnected.', 'warn', 8000));
window.addEventListener('online', () => { toast('Back online. Syncing data...', 'ok', 3000); saveWardData(); saveSessions(); });

/* ══ STATE ══ */
const GROQ_MODEL='llama-3.3-70b-versatile';
const VISION_MODEL='meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_HIST=10;
let user=null,uName='',groqKey='',loading=false,micOn=false,recog=null,hist=[],sessions=[],currSess=null,rxList=[],lastQuery='';
const F={preg:false,peds:false,geri:false,counsel:false,steward:false};
let S={haptic:true,theme:'auto'};
let _pendingFBUser=null;
let lastSendTime = 0;

/* ══ DEMO USAGE LIMIT ══
   Free public demo — 5 AI queries per account per day.
   Stored in Firestore so it survives cache clears and device switches.
   Resets automatically at midnight. */
const DEMO_DAILY_LIMIT = 5;
let _demoCount = 0;
let _demoDate  = '';

function _todayStr() { return new Date().toISOString().slice(0, 10); }

async function loadDemoUsage() {
  if(!user) return;
  try {
    const doc = await db.collection('users').doc(user).get();
    if(doc.exists) {
      const d = doc.data();
      _demoDate  = d.demo_date  || '';
      _demoCount = d.demo_count || 0;
    }
  } catch(e) {}
  if(_demoDate !== _todayStr()) { _demoCount = 0; _demoDate = _todayStr(); }
  renderDemoCounter();
}

function _saveDemoUsage() {
  if(!user) return;
  fsWrite(() => db.collection('users').doc(user).set(
    { demo_date: _demoDate, demo_count: _demoCount }, { merge: true }
  ), 'demoUsage');
}

function demoCheck() {
  if(_demoDate !== _todayStr()) { _demoCount = 0; _demoDate = _todayStr(); }
  return _demoCount < DEMO_DAILY_LIMIT;
}

function demoIncrement() {
  if(_demoDate !== _todayStr()) { _demoCount = 0; _demoDate = _todayStr(); }
  _demoCount++;
  _saveDemoUsage();
  renderDemoCounter();
}

function renderDemoCounter() {
  const el = document.getElementById('demo-counter');
  if(!el) return;
  const remaining = Math.max(0, DEMO_DAILY_LIMIT - _demoCount);
  const pct = _demoCount / DEMO_DAILY_LIMIT;
  const textSpan = el.querySelector('span:last-child');
  if(textSpan) textSpan.textContent = remaining + ' / ' + DEMO_DAILY_LIMIT;
  el.style.background   = pct < 0.6 ? 'rgba(16,185,129,0.15)' : pct < 1 ? 'rgba(245,158,11,0.18)' : 'rgba(239,68,68,0.18)';
  el.style.color        = pct < 0.6 ? 'var(--ok)'   : pct < 1 ? 'var(--warn)'   : 'var(--danger)';
  el.style.borderColor  = pct < 0.6 ? 'rgba(16,185,129,0.3)' : pct < 1 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.35)';
}

function showLimitModal() {
  const now = new Date(), midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight - now;
  const hrs  = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const el = document.getElementById('demo-reset-time');
  if(el) el.textContent = hrs > 0 ? hrs + 'h ' + mins + 'm' : mins + ' minutes';
  openM('demo-limit-modal');
  hap(40);
}

/* ══ SIDEBAR SWIPE LOGIC ══ */
let touchStartX = 0;
document.addEventListener('DOMContentLoaded', () => {
  const sb = document.getElementById('sb');
  sb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
  sb.addEventListener('touchend', e => {
    if (touchStartX - e.changedTouches[0].clientX > 60 && sb.classList.contains('open')) toggleSB();
  });
});

/* ══ HAPTIC & TOAST ══ */
function hap(ms){if(!S.haptic)return;if('vibrate'in navigator)navigator.vibrate(ms);}
function toast(msg,type='info',dur=3000){const w=document.getElementById('tw');const el=document.createElement('div');el.className=`toast ${type}`;const ic={ok:'check_circle',warn:'warning',err:'error',info:'info'};el.innerHTML=`<span class="ms xs">${ic[type]||'info'}</span><span>${msg}</span>`;w.appendChild(el);setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),350);},dur);}

/* ══ THEME / SETTINGS (Async with localforage) ══ */
async function loadS(){
  try {
    const s = await localforage.getItem('pharmai_S');
    if(s) S={...S, ...s};
  } catch(e) {}
  applyTheme(S.theme);
}
function saveS(){localforage.setItem('pharmai_S', S);}
function applyTheme(m){const p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';const a=m==='auto'?p:m;document.body.classList.toggle('light',a==='light');document.getElementById('tcm').content=a==='light'?'#F7F7F7':'#000000';}
function setTheme(m){S.theme=m;saveS();applyTheme(m);document.querySelectorAll('.tp-pill').forEach(p=>p.classList.remove('active'));document.getElementById('th-'+m)?.classList.add('active');hap(10);Sounds.play('tick');syncSettings();}
function toggleSet(k){S[k]=document.getElementById('hap-t').checked;saveS();hap(10);Sounds.play('tick');syncSettings();}
function applyUI(){document.getElementById('hap-t').checked=S.haptic;document.querySelectorAll('.tp-pill').forEach(p=>p.classList.remove('active'));document.getElementById('th-'+S.theme)?.classList.add('active');}

async function syncSettings(){if(!user)return;try{await fsWrite(() => db.collection('users').doc(user).set({settings:S},{merge:true}), 'settings');}catch(e){}}
async function loadSettingsFromFirestore(){if(!user)return;try{const d=await db.collection('users').doc(user).get();if(d.exists&&d.data().settings){S={...S,...d.data().settings};saveS();applyUI();applyTheme(S.theme);}}catch(e){}}

/* ══ SPLASH & ONBOARDING ══ */
async function handleSplash(){
  const seen = await localforage.getItem('pharmai_vis');
  const sp=document.getElementById('splash');
  if(seen){sp.style.display='none';}else{localforage.setItem('pharmai_vis','1');setTimeout(()=>{sp.style.display='none';},1900);}
}

async function checkOnboarding(){
  const ob = await localforage.getItem('pharmai_onboarded');
  if(!ob){
    setTimeout(()=>document.getElementById('onboarding-modal').classList.add('active'), 500);
  }
}
function nextOb(step){
  document.querySelectorAll('.ob-slide').forEach(s=>s.classList.remove('active'));
  document.getElementById('ob-'+step).classList.add('active');
}
function finishOb(){
  document.getElementById('onboarding-modal').classList.remove('active');
  localforage.setItem('pharmai_onboarded', '1');
}

/* ══ INITIALIZATION ══ */
window.addEventListener('DOMContentLoaded', async () => {
  await loadS();
  handleSplash();
  initMic();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(S.theme==='auto')applyTheme('auto');});
  document.getElementById('query').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQ();hap(20);}});
  document.getElementById('query').addEventListener('input',()=>{autoR();updCC();});
  document.getElementById('chat').addEventListener('click',e=>{
    const btn=e.target.closest('.acbtn');if(!btn)return;
    const txt=btn.getAttribute('data-text');if(!txt)return;
    if(btn.classList.contains('tts-btn'))tts(decodeURIComponent(txt),btn);
    if(btn.classList.contains('cpy-btn'))cpyTxt(decodeURIComponent(txt),btn);
  });

  const sessSearchEl = document.getElementById('sess-search');
  if(sessSearchEl) sessSearchEl.addEventListener('input', () => renderSB(sessSearchEl.value.trim().toLowerCase()));
});

/* ══ UI HELPERS & MODALS ══ */
let openModals = [];
function toggleF(k){
  hap(10);
  const next = !F[k];
  Object.keys(F).forEach(key => {
    F[key] = false;
    document.getElementById('t-'+key).classList.remove('on');
  });
  F[k] = next;
  document.getElementById('t-'+k).classList.toggle('on', next);
  Sounds.play('tick');
}
function openM(id){document.getElementById(id).classList.add('open'); openModals.push(id); Sounds.play('tick');}
function closeM(id){document.getElementById(id).classList.remove('open'); openModals = openModals.filter(m => m !== id);}
function handleOC(e,id){if(e.target===document.getElementById(id) && openModals[openModals.length - 1] === id){closeM(id);}}

function switchTab(e,key){const sh=e.target.closest('.msh');sh.querySelectorAll('.tp').forEach(p=>p.classList.remove('active'));sh.querySelectorAll('.tbtn').forEach(b=>b.classList.remove('active'));document.getElementById('tp-'+key).classList.add('active');e.target.classList.add('active');Sounds.play('tick');}
function toggleC(id){document.querySelectorAll('.ccard').forEach(c=>{if(c.id!==id)c.classList.remove('open');});document.getElementById(id).classList.toggle('open');Sounds.play('tick');}
function toggleWizC(id){document.querySelectorAll('.wcard').forEach(c=>{if(c.id!==id)c.classList.remove('open');});document.getElementById(id).classList.toggle('open');Sounds.play('tick');}
function flU(el){el.closest('.flw').classList.add('up');}
function flB(el){if(!el.value&&el.value!=='0')el.closest('.flw').classList.remove('up');}
function toggleSB(){const sb=document.getElementById('sb'),ov=document.getElementById('sb-ov');if(sb.classList.contains('open')){sb.classList.remove('open');setTimeout(()=>ov.classList.remove('open'),350);}else{ov.classList.add('open');setTimeout(()=>sb.classList.add('open'),10);}Sounds.play('tick');}

/* ══ SESSIONS ══ */
function getDocSizeKB(obj) { return new Blob([JSON.stringify(obj)]).size / 1024; }

async function loadSessions(){
  if(!user) return;
  try{
    const snap = await db.collection('users').doc(user).collection('sessions').get();
    if(!snap.empty) {
      sessions = snap.docs.map(d => d.data()).sort((a,b) => b.id - a.id);
      localforage.setItem('psess_'+user, sessions);
      renderSB();
    } else {
      const s = await localforage.getItem('psess_'+user);
      if (s) { sessions = s; renderSB(); }
      const docSnap = await db.collection('users').doc(user).get();
      if (docSnap.exists && docSnap.data().sessions && docSnap.data().sessions.length > 0) {
        sessions = docSnap.data().sessions;
        renderSB();
        const CHUNK = 400;
        for(let i=0;i<sessions.length;i+=CHUNK){
          const batch = db.batch();
          sessions.slice(i,i+CHUNK).forEach(s=>batch.set(db.collection('users').doc(user).collection('sessions').doc(s.id.toString()),s));
          await batch.commit();
        }
        localforage.setItem('psess_'+user, sessions);
      }
    }
  }catch(e){
    const s = await localforage.getItem('psess_'+user);
    sessions = s || [];
    renderSB();
  }
}

function saveSessions(){
  if(!user) return;
  let kb = getDocSizeKB(sessions);
  if(kb > 800) {
    sessions = sessions.slice(0, Math.max(0, sessions.length - 5));
    toast('Older chats auto-archived to save space.', 'info');
  }
  localforage.setItem('psess_'+user, sessions);
  const s = sessions.find(x=>x.id===currSess);
  if(s) {
    fsWrite(() => db.collection('users').doc(user).collection('sessions').doc(s.id.toString()).set(s), 'sessions');
  }
}

async function clearChats(){
  if(!confirm('Clear all chat history?'))return;
  try {
    const snap = await db.collection('users').doc(user).collection('sessions').get();
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  } catch(e){}
  sessions=[];currSess=null;hist=[];
  await localforage.removeItem('psess_'+user);
  renderWelcome();toast('Chat history cleared.','ok');
}

function saveHist(){
  if(!currSess){currSess=Date.now();const title=hist.length?hist[0].content.substring(0,28)+'\u2026':'New Chat';sessions.unshift({id:currSess,title,hist:[],html:''});}
  const s=sessions.find(x=>x.id===currSess);
  if(s){s.hist=hist.slice(-MAX_HIST*2);const cl=document.getElementById('chat').cloneNode(true);const ty=cl.querySelector('#typ');if(ty)ty.remove();s.html=cl.innerHTML;}
  saveSessions();renderSB();
}

async function genTitle(q){if(!groqKey||!currSess)return;try{const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},body:JSON.stringify({model:GROQ_MODEL,messages:[{role:'system',content:'Generate a 3-5 word clinical topic title. Return ONLY the title, no punctuation at end.'},{role:'user',content:q}],temperature:.3,max_tokens:20})});const d=await r.json();const t=d.choices?.[0]?.message?.content?.trim();if(t){const s=sessions.find(x=>x.id===currSess);if(s){s.title=t;saveSessions();renderSB();}}}catch(e){}}

function renderSB(filter=''){
  const l=document.getElementById('sbl');
  if(!l) return;
  l.innerHTML='';
  const filtered = filter ? sessions.filter(s => s.title.toLowerCase().includes(filter)) : sessions;
  if(filtered.length===0 && sessions.length>0){
    l.innerHTML='<div style="text-align:center;padding:20px;font-size:0.82rem;color:var(--muted);">No matches found.</div>';
    return;
  }
  filtered.forEach(s=>{const d=document.createElement('div');d.className='sbi'+(currSess===s.id?' active':'');d.innerHTML=`<div class="sbi-t" onclick="loadChat(${s.id});hap(10);"><span class="ms xs">chat</span><span>${esc(s.title)}</span></div><button class="sbi-del" onclick="delChat(${s.id},event);hap(20);"><span class="ms xs">delete</span></button>`;l.appendChild(d);});
}

function newChat(){hist=[];currSess=null;renderWelcome();if(document.getElementById('sb').classList.contains('open'))toggleSB();renderSB();}
function loadChat(id){const s=sessions.find(x=>x.id===id);if(!s)return;currSess=id;hist=s.hist;document.getElementById('chat').innerHTML=s.html;if(document.getElementById('sb').classList.contains('open'))toggleSB();scrollD();renderSB();Sounds.play('tick');}

async function delChat(id,e){
  e.stopPropagation();
  sessions=sessions.filter(x=>x.id!==id);
  if(currSess===id){hist=[];currSess=null;renderWelcome();}
  localforage.setItem('psess_'+user, sessions);
  try { await fsWrite(() => db.collection('users').doc(user).collection('sessions').doc(id.toString()).delete(), 'delSession'); } catch(err){}
  renderSB();
}

/* ══ EXPORT / IMPORT ══ */
function exportData(){
  if(!confirm('\u26a0 PHI Warning\n\nThis backup file will contain sensitive patient data including names, diagnoses, medications and lab results in plain text.\n\nStore it in a secure location. Do not share or leave it in Downloads.\n\nContinue with export?')) return;
  const dump = { sessions, wardPatients, settings: S, exportDate: new Date().toISOString(), userName: uName };
  const b=new Blob([JSON.stringify(dump)],{type:'application/json'});
  const u=URL.createObjectURL(b);const a=document.createElement('a');
  a.href=u;a.download=`PharmAI_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();URL.revokeObjectURL(u);toast('Exported! Store this file securely.','ok');
}

function importData(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=async function(ev){
    try{
      const p=JSON.parse(ev.target.result);
      if(typeof p !== 'object' || p === null) throw new Error('Not a valid JSON object.');
      if(p.sessions !== undefined && !Array.isArray(p.sessions)) throw new Error('Invalid sessions format.');
      if(p.wardPatients !== undefined && !Array.isArray(p.wardPatients)) throw new Error('Invalid ward data format.');
      if(p.sessions) sessions = p.sessions;
      if(p.wardPatients) wardPatients = p.wardPatients;
      if(p.settings && typeof p.settings === 'object') { S = {...S, ...p.settings}; saveS(); applyUI(); applyTheme(S.theme); }
      await localforage.setItem('psess_'+user, sessions);
      await localforage.setItem('pharmai_ward_' + user, wardPatients);
      const CHUNK = 400;
      for(let i=0;i<sessions.length;i+=CHUNK){const batch=db.batch();sessions.slice(i,i+CHUNK).forEach(s=>batch.set(db.collection('users').doc(user).collection('sessions').doc(s.id.toString()),s));await batch.commit();}
      for(let i=0;i<wardPatients.length;i+=CHUNK){const batch=db.batch();wardPatients.slice(i,i+CHUNK).forEach(w=>batch.set(db.collection('users').doc(user).collection('ward').doc(w.id.toString()),w));await batch.commit();}
      renderSB(); renderWardList();
      toast('Backup restored!','ok');closeM('sm');
    }catch(err){toast('Invalid backup file: '+err.message,'err');}
  };r.readAsText(f);
}

/* ══ POLYRX ══ */
function addRx(){const inp=document.getElementById('rx-input');const v=inp.value.trim();if(!v||rxList.includes(v)){toast('Drug already added or field empty.','warn');return;}hap(10);rxList.push(v);inp.value='';renderRx();}
function remRx(i){hap(10);rxList.splice(i,1);renderRx();}
function renderRx(){document.getElementById('rx-con').innerHTML=rxList.map((r,i)=>`<div class="rx-tag">${esc(r)}<button class="rx-del" onclick="remRx(${i})"><span class="ms xs">close</span></button></div>`).join('');}

function analyzeRx(){
  if(rxList.length<2){toast('Add at least 2 medications.','warn');return;}
  closeM('tm');
  let ctxStr = '';
  const useCtx = document.getElementById('poly-ctx').checked;
  if (useCtx) {
    if (typeof activeCaseId === 'undefined' || !activeCaseId) {
      toast('No active ward patient. Uncheck context or select a patient first.', 'warn');
      ctxStr = '';
    } else {
      const pt = wardPatients.find(p => p.id === activeCaseId);
      if (pt && pt.demo) {
        const age = pt.demo.age || 'Unknown';
        const sex = pt.demo.sex || 'Unknown';
        const wt = pt.demo.wt ? `${pt.demo.wt}kg` : 'Unknown weight';
        ctxStr = `\nPatient Context: ${age}y ${sex}, ${wt}. `;
      }
    }
  }
  const q=`Analyze polypharmacy interactions between: ${rxList.join(', ')}. ${ctxStr}Provide an Interaction Matrix covering severity, mechanism, and required monitoring.`;
  insertAndSend(q);
  rxList=[];
  renderRx();
}

/* ══ CHAT ENGINE ══ */
function openPolyRxTab(){
  openM('tm');
  const btn = document.querySelector('.tbtn[data-tab="poly"]') ||
              document.querySelector('.tbtn:nth-child(2)');
  if(btn) btn.click();
}
function openCKDCalc(){
  openM('tm');
  const calcBtn = document.querySelector('.tbtn[data-tab="calc"]') ||
                  document.querySelector('.tbtn:first-child');
  if(calcBtn) calcBtn.click();
  setTimeout(()=>{ const card = document.getElementById('cc-ckd'); if(card) card.classList.add('open'); }, 100);
}

function renderWelcome(){
  const h=new Date().getHours();const gr=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const name=uName||'Doctor';
  const wHtml=`
    <span class="ws-word" style="animation-delay:0.3s">${gr.split(' ')[0]}</span>
    <span class="ws-word" style="animation-delay:0.45s">${gr.split(' ')[1]},</span>
    <span class="ws-word" style="animation-delay:0.6s; color: var(--blue);">${name}.</span>
  `;
  const c=document.getElementById('chat');
  c.innerHTML=`<div id="ws">
    <div class="ws-logo"><span class="ms lg fill">cardiology</span></div>
    <div class="ws-g">${wHtml}</div>
    <div class="ws-sub" style="animation-delay:0.75s">How can I assist you today?</div>
    <div class="ws-hint" style="animation-delay:0.9s">You can ask follow-up questions naturally.</div>
    <div class="ws-grid">
      <button class="ws-btn" style="animation-delay:0.9s" onclick="openPolyRxTab()">
        <span class="ms lg">monitor_heart</span>Drug Interactions
      </button>
      <button class="ws-btn" style="animation-delay:1.0s" onclick="insertAndSend('Beers Criteria \u2014 high-risk medications to avoid in elderly patients')">
        <span class="ms lg">elderly</span>Beers Criteria
      </button>
      <button class="ws-btn" style="animation-delay:1.1s" onclick="insertAndSend('Standard pediatric dose for Amoxicillin 40mg/kg/day?')">
        <span class="ms lg">child_care</span>Peds Dosing
      </button>
      <button class="ws-btn" style="animation-delay:1.2s" onclick="openCKDCalc()">
        <span class="ms lg">water_drop</span>eGFR Calc
      </button>
    </div>
  </div>`;
}

const getChat=()=>document.getElementById('chat');
function scrollD(){setTimeout(()=>{const c=getChat();c.scrollTo({top:c.scrollHeight,behavior:'smooth'});},50);}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function autoR(){const q=document.getElementById('query');q.style.height='auto';q.style.height=Math.min(q.scrollHeight,120)+'px';}
function insertQ(t){hap(10);const q=document.getElementById('query');q.value=t;autoR();q.focus();}
function insertAndSend(t){insertQ(t);setTimeout(sendQ,100);}
function updCC(){const q=document.getElementById('query'),cc=document.getElementById('cc'),l=q.value.length;if(l>0){cc.textContent=l;cc.classList.add('show');cc.classList.toggle('warn',l>400);}else{cc.classList.remove('show');}}
function ts(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}

function regenLast(btn){
  if(!lastQuery || loading) return;
  const aiMsg = btn.closest('.msg');
  const userMsg = aiMsg.previousElementSibling;
  if(userMsg && userMsg.classList.contains('user')) userMsg.remove();
  aiMsg.remove();
  if(hist.length >= 2) { hist.pop(); hist.pop(); }
  document.getElementById('query').value = lastQuery;
  sendQ();
}

function appendUser(text){const ws=document.getElementById('ws');if(ws)ws.remove();const d=document.createElement('div');d.className='msg user';d.innerHTML=`<div class="bwrap"><div class="utxt">${esc(text)}</div><div class="mts">${ts()}</div></div>`;getChat().appendChild(d);scrollD();}
function appendSkel(){const d=document.createElement('div');d.className='msg';d.id='typ';d.innerHTML=`<div class="avatar ai"><span class="ms sm fill">cardiology</span></div><div class="bwrap" style="max-width:84%;width:100%"><div class="skel"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="think-txt">PharmAI is analyzing...</div></div></div>`;getChat().appendChild(d);scrollD();}
function remTyp(){const t=document.getElementById('typ');if(t)t.remove();}

function sanitizeHTML(html) {
  if(typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(html, {ALLOWED_TAGS:['p','ul','li','ol','strong','em','br','small','b','i','span','div','h4'],ALLOWED_ATTR:['style']});
  return esc(String(html));
}

function appendAI(p){
  if(p.in_scope === false){
    const d=document.createElement('div');d.className='msg';
    d.innerHTML=`<div class="avatar ai"><span class="ms sm fill">cardiology</span></div>
    <div class="bwrap" style="max-width:85%">
      <div class="oos-card">
        <div class="oos-icon"><span class="ms sm">block</span></div>
        <div>
          <div class="oos-title">Outside Clinical Scope</div>
          <div class="oos-body">PharmAI is a clinical decision support tool for licensed medical professionals. This query falls outside the scope of medicine, pharmacology, or clinical science and cannot be answered here.</div>
        </div>
      </div>
      <div class="mts">${ts()}</div>
    </div>`;
    getChat().appendChild(d);scrollD();
    return;
  }

  const CM={
    'Pharmacokinetics':{c:'mec',i:'science',l:'Pharmacokinetics'},
    'Drug Interaction':{c:'int',i:'monitor_heart',l:'Drug Interaction'},
    'Dosage & Administration':{c:'dos',i:'medication',l:'Dosage & Administration'},
    'Adverse Effects':{c:'se',i:'bolt',l:'Adverse Effects'},
    'Contraindication':{c:'con',i:'block',l:'Contraindication'},
    'Mechanism of Action':{c:'mec',i:'biotech',l:'Mechanism of Action'},
    'Clinical Therapeutics':{c:'gen',i:'local_hospital',l:'Clinical Therapeutics'},
    'Monitoring':{c:'dos',i:'monitoring',l:'Monitoring'},
    'Antimicrobial':{c:'int',i:'coronavirus',l:'Antimicrobial'},
    'General Clinical':{c:'gen',i:'info',l:'General Clinical'},
  };
  const cat=CM[p.category]||{c:'gen',i:'info',l:esc(p.category||'Clinical Response')};

  const evClass={'A':'ev-a','B':'ev-b','C':'ev-c','D':'ev-d'}[p.evidence_grade]||'ev-c';
  const evBadge=p.evidence_grade?`<span class="ev-badge ${evClass}">Evidence ${p.evidence_grade}</span>`:'';
  const badges=[F.preg?'<span class="fb2">Pregnancy</span>':'',F.peds?'<span class="fb2">Paediatric</span>':'',F.geri?'<span class="fb2">Geriatric</span>':'',F.counsel?'<span class="fb2">Counselling</span>':'',F.steward?'<span class="fb2">Stewardship</span>':''].filter(Boolean).join('');
  const bbwBar=p.bbw?`<div class="clin-bbw-bar"><span class="ms xs" style="flex-shrink:0">warning</span><span><strong>BLACK BOX WARNING:</strong> ${esc(p.bbw)}</span></div>`:'';

  let pkHtml='';
  if(p.pharmacokinetics){
    const pk=p.pharmacokinetics;
    const pkFields=[
      {l:'Bioavailability',v:pk.bioavailability},{l:'T<sub>max</sub>',v:pk.tmax},
      {l:'V<sub>d</sub>',v:pk.vd},{l:'Protein Binding',v:pk.protein_binding},
      {l:'Half-life (t\u00BD)',v:pk.half_life},{l:'Metabolism',v:pk.metabolism},
      {l:'Excretion',v:pk.excretion}
    ].filter(f=>f.v&&f.v!=='null'&&f.v!==null);
    if(pkFields.length>0){
      pkHtml=`<div class="clin-sec">
        <div class="clin-sec-hdr"><span class="ms xs">science</span> Pharmacokinetics</div>
        <div class="pk-grid">${pkFields.map(f=>`<div class="pk-cell"><div class="pk-lbl">${f.l}</div><div class="pk-val">${esc(String(f.v))}</div></div>`).join('')}</div>
      </div>`;
    }
  }

  const detailsHtml=p.clinical_details?`<div class="clin-sec">
    <div class="clin-sec-hdr"><span class="ms xs">menu_book</span> Clinical Overview</div>
    <div class="clin-body">${sanitizeHTML(p.clinical_details)}</div>
  </div>`:'';

  let monHtml='';
  if(p.monitoring&&p.monitoring.length>0){
    monHtml=`<div class="clin-sec">
      <div class="clin-sec-hdr"><span class="ms xs">monitoring</span> Monitoring Parameters</div>
      <div style="overflow-x:auto;padding:0 14px 12px;">
        <table class="mon-tbl">
          <thead><tr><th>Parameter</th><th>Frequency</th><th>Target / Threshold</th></tr></thead>
          <tbody>${p.monitoring.map(m=>`<tr><td>${esc(m.parameter||'-')}</td><td>${esc(m.frequency||'-')}</td><td>${esc(m.target||'-')}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  let intHtml='';
  if(p.interactions&&p.interactions.length>0){
    intHtml=`<div class="clin-sec">
      <div class="clin-sec-hdr"><span class="ms xs">compare_arrows</span> Drug Interactions</div>
      <div style="padding:0 14px 12px;">
        ${p.interactions.map(i=>{
          const sc=(i.severity||'').toLowerCase();
          const sevCls=sc==='major'?'major':sc==='moderate'?'moderate':'minor';
          return `<div class="int-row">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="int-drug">${esc(i.drug||'-')}</span>
              <span class="int-sev ${sevCls}"><span class="ms xs">warning</span>${esc(i.severity||'Unknown')}</span>
            </div>
            <div class="int-mech"><strong>Mechanism:</strong> ${esc(i.mechanism||'-')}</div>
            <div class="int-mgmt"><span class="ms xs" style="font-size:12px;vertical-align:middle">arrow_forward</span> ${esc(i.management||'-')}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  let doseHtml='';
  const da=p.dose_adjustments;
  if(da&&(da.renal||da.hepatic||da.other)){
    const rows=[];
    if(da.renal&&da.renal!=='null') rows.push(`<div class="dose-row"><span class="dose-lbl renal">Renal</span><span>${esc(da.renal)}</span></div>`);
    if(da.hepatic&&da.hepatic!=='null') rows.push(`<div class="dose-row"><span class="dose-lbl hepatic">Hepatic</span><span>${esc(da.hepatic)}</span></div>`);
    if(da.other&&da.other!=='null') rows.push(`<div class="dose-row"><span class="dose-lbl other">Other</span><span>${esc(da.other)}</span></div>`);
    if(rows.length>0){
      doseHtml=`<div class="clin-sec">
        <div class="clin-sec-hdr"><span class="ms xs">tune</span> Dose Adjustments</div>
        <div class="dose-adj">${rows.join('')}</div>
      </div>`;
    }
  }

  let kpHtml='';
  if(p.key_points&&p.key_points.length>0){
    kpHtml=`<div class="clin-sec">
      <div class="clin-sec-hdr"><span class="ms xs">checklist</span> Clinical Pearls</div>
      <div style="padding:4px 14px 12px;">
        ${p.key_points.map((k,i)=>`<div class="kp-row"><div class="kp-num">${i+1}</div><span>${esc(k)}</span></div>`).join('')}
      </div>
    </div>`;
  }

  const refsHtml=p.references&&p.references.length>0?
    `<div class="clin-refs"><span style="font-size:0.6rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-right:3px;">Refs</span>${p.references.map(r=>`<span class="ref-tag">${esc(r)}</span>`).join('')}</div>`:'';

  const plain=[
    p.summary,
    p.bbw?'BLACK BOX WARNING: '+p.bbw:'',
    p.clinical_details?p.clinical_details.replace(/<[^>]+>/g,''):'',
    p.monitoring&&p.monitoring.length?'Monitoring: '+p.monitoring.map(m=>m.parameter+' ('+m.target+')').join('; '):'',
    p.interactions&&p.interactions.length?'Interactions: '+p.interactions.map(i=>i.drug+' \u2014 '+i.severity).join('; '):'',
    p.key_points&&p.key_points.length?'Clinical Pearls: '+p.key_points.join('. '):'',
    p.references&&p.references.length?'References: '+p.references.join(', '):'',
  ].filter(Boolean).join('\n\n');

  const d=document.createElement('div');d.className='msg';
  d.innerHTML=`<div class="avatar ai"><span class="ms sm fill">cardiology</span></div>
  <div class="bwrap" style="max-width:87%">
    <div class="clin-card ${cat.c}">
      <div class="clin-tag">
        <div class="clin-tag-l">
          <span class="ms xs">${cat.i}</span>
          <span style="color:var(--cc,var(--text))">${cat.l}</span>
          ${p.drug_name&&p.drug_name!=='null'?`<span style="color:var(--t2);font-weight:400">\u2014 ${esc(p.drug_name)}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          ${p.bbw?'<span class="clin-bbw">BBW</span>':''}
          ${evBadge}
        </div>
      </div>
      ${badges?`<div class="fbadges">${badges}</div>`:''}
      <div class="clin-summary"><span class="ms xs">bookmark</span>${esc(p.summary)}</div>
      ${bbwBar}
      ${pkHtml}
      ${detailsHtml}
      ${monHtml}
      ${intHtml}
      ${doseHtml}
      ${kpHtml}
      ${refsHtml}
      <div class="clin-acbar acbar">
        <button class="acbtn tts-btn" data-text="${encodeURIComponent(plain)}"><span class="ms xs">volume_up</span> Read</button>
        <button class="acbtn cpy-btn" data-text="${encodeURIComponent(plain)}"><span class="ms xs">content_copy</span> Copy</button>
        <button class="acbtn" onclick="regenLast(this)"><span class="ms xs">refresh</span> Regenerate</button>
      </div>
    </div>
    <div class="mts">${ts()}</div>
  </div>`;
  getChat().appendChild(d);scrollD();
  Sounds.play('receive');
}

function appendErr(msg){const d=document.createElement('div');d.className='msg';d.innerHTML=`<div class="avatar ai"><span class="ms sm fill">cardiology</span></div><div class="bwrap"><div class="aic se"><div class="ctag se"><span class="ms xs">error</span> Error</div><div class="abody" style="padding:14px 16px;color:var(--danger)">${esc(msg)}</div></div></div>`;getChat().appendChild(d);scrollD();}

function tts(text,btn){if(!('speechSynthesis'in window)){toast('TTS not supported.','warn');return;}if(speechSynthesis.speaking){speechSynthesis.cancel();btn.innerHTML='<span class="ms xs">volume_up</span> Read Aloud';return;}const u=new SpeechSynthesisUtterance(text);u.rate=0.95;u.onstart=()=>{btn.innerHTML='<span class="ms xs">stop_circle</span> Stop';};u.onend=u.onerror=()=>{btn.innerHTML='<span class="ms xs">volume_up</span> Read Aloud';};speechSynthesis.speak(u);}
function cpyTxt(text,btn){navigator.clipboard.writeText(text).then(()=>{btn.innerHTML='<span class="ms xs">check_circle</span> Copied!';toast('Copied!','ok');hap(15);setTimeout(()=>{btn.innerHTML='<span class="ms xs">content_copy</span> Copy';},2000);});}

function buildPrompt(text){
  const fl=[];
  const pregKeywords=['pregnant','pregnancy','lactation','breastfeed','trimester','obstetric','antenatal'];
  const autoPreg=pregKeywords.some(k=>text.toLowerCase().includes(k));
  if(F.preg||autoPreg) fl.push('PREGNANCY SPECIALIST MODE: State FDA PLLR data across all three sections (Pregnancy/Lactation/Reproductive). Specify trimester-specific risks, teratogenic mechanisms, and evidence-graded safer alternatives with dosing. Reference ACOG guidelines.');
  if(F.peds) fl.push('PAEDIATRIC SPECIALIST MODE: Provide age-stratified and weight-based dosing (mg/kg and absolute cap). Note neonatal vs infant vs child PK differences, off-label status, and paediatric-specific toxicities. Reference BNFc and AAP guidelines.');
  if(F.geri) fl.push('GERIATRIC SPECIALIST MODE: Apply Beers Criteria (2023 AGS), STOPP/START criteria. Quantify anticholinergic burden (ACB score). Flag polypharmacy cascade risks, fall risk, QTc prolongation with specific QTc thresholds, and age-related PK changes (reduced Vd, CrCl, hepatic clearance).');
  if(F.steward) fl.push('ANTIMICROBIAL STEWARDSHIP MODE: Classify as empiric vs. targeted therapy. State spectrum, PD/PK target attainment (AUC/MIC, T>MIC, Cmax/MIC), de-escalation criteria, IV-to-oral switch eligibility (OPAT criteria), and recommended total duration per IDSA/local guidelines. Note local resistance patterns.');
  if(F.counsel) fl.push('COUNSELLING MODE: Translate all clinical information to patient-appropriate language (5th grade reading level). Replace all jargon with simple equivalents. Use actionable instructions.');

  const filters=fl.length?`\nSPECIALIST FILTERS ACTIVE:\n${fl.join('\n')}`:'';

  return `You are PharmAI, an AI clinical decision support system functioning at the level of a Senior Clinical Pharmacist and Physician. Your audience is exclusively licensed medical professionals. Responses must be evidence-based, precise, and clinically actionable.

SCOPE GATE (MANDATORY): If the query is not related to medicine, pharmacology, clinical sciences, pharmacy, diagnostics, or allied health \u2014 set "in_scope": false and return nothing else.

ADAPTIVE FIELD POPULATION \u2014 CRITICAL: Populate ONLY the fields relevant to the specific query. Set all other fields to null or []. Use this mapping:

\u2022 Pharmacokinetics or Mechanism of Action \u2192 populate: pharmacokinetics, clinical_details, key_points, references. Set monitoring=[], interactions=[], dose_adjustments all null.
\u2022 Drug Interaction \u2192 populate: interactions (full detail), clinical_details, key_points, references. Set pharmacokinetics null (except relevant CYP subfields if PK-mediated). Set monitoring=[], dose_adjustments all null.
\u2022 Dosage & Administration \u2192 populate: dose_adjustments, monitoring, clinical_details, key_points, references. Set pharmacokinetics null, interactions=[].
\u2022 Adverse Effects \u2192 populate: clinical_details, monitoring, bbw if present, key_points, references. Set pharmacokinetics null, interactions=[], dose_adjustments all null.
\u2022 Contraindication \u2192 populate: clinical_details, bbw if present, key_points, references. Set pharmacokinetics null, monitoring=[], interactions=[], dose_adjustments all null.
\u2022 Monitoring \u2192 populate: monitoring (detailed), clinical_details, key_points, references. Set pharmacokinetics null, interactions=[], dose_adjustments all null.
\u2022 Clinical Therapeutics or General Clinical \u2192 populate: clinical_details, key_points, references. Set pharmacokinetics null, monitoring=[], interactions=[], dose_adjustments all null \u2014 unless the query explicitly asks about those sections.
\u2022 Antimicrobial \u2192 populate: clinical_details, dose_adjustments, monitoring, interactions if relevant, key_points, references. Set pharmacokinetics null unless PK/PD target attainment is the question.

NEVER pad responses with unrequested sections. A drug interaction question does not need PK parameters. A disease question does not need a monitoring table.
${filters}

CLINICAL DEPTH (for populated fields only):
- Mechanisms at receptor/molecular/enzyme level
- Evidence graded: A = RCT/meta-analysis; B = cohort; C = expert consensus
- Cite specific guidelines with year (e.g. "ACC/AHA 2023", "BNF 88", "IDSA 2022")
- Flag Black Box Warnings explicitly
- Interactions: ASHP severity classification with mechanistic basis
- Dose adjustments: exact CrCl and Child-Pugh thresholds
- Monitoring: exact target ranges and sampling timing

Respond ONLY in this exact JSON (no markdown, no code fences):
{
  "in_scope": true,
  "category": "<Pharmacokinetics|Drug Interaction|Dosage & Administration|Adverse Effects|Contraindication|Mechanism of Action|Clinical Therapeutics|Monitoring|Antimicrobial|General Clinical>",
  "drug_name": "<Primary drug or topic name, or null>",
  "evidence_grade": "<A|B|C>",
  "bbw": "<Exact Black Box Warning text or null>",
  "summary": "<One precise, clinically dense sentence>",
  "pharmacokinetics": {
    "bioavailability": "<% or null>",
    "tmax": "<time or null>",
    "vd": "<L/kg or null>",
    "protein_binding": "<% or null>",
    "half_life": "<hours or null>",
    "metabolism": "<CYP/phase or null>",
    "excretion": "<route or null>"
  },
  "clinical_details": "<Structured HTML using p,ul,li,strong \u2014 relevant depth only>",
  "monitoring": [
    {"parameter": "<param>", "frequency": "<timing>", "target": "<range>"}
  ],
  "interactions": [
    {"drug": "<drug>", "severity": "<Major|Moderate|Minor>", "mechanism": "<PK/PD>", "management": "<action>"}
  ],
  "dose_adjustments": {
    "renal": "<CrCl thresholds or null>",
    "hepatic": "<Child-Pugh or null>",
    "other": "<age/weight/dialysis or null>"
  },
  "key_points": ["<pearl 1>","<pearl 2>","<pearl 3>"],
  "references": ["<guideline with year>","<source 2>"]
}`;
}

async function sendQ(imgBase64 = null){
  if (Date.now() - lastSendTime < 2000) { toast('Please wait before sending again.', 'warn'); return; }
  const text=document.getElementById('query').value.trim();if((!text && !imgBase64)||loading)return;
  if(!groqKey){toast('API key not configured. Contact admin.','err');return;}
  if(!demoCheck()){ showLimitModal(); return; }
  lastSendTime = Date.now();
  loading=true;document.getElementById('sbtn').disabled=true;
  lastQuery = text;
  document.getElementById('query').value='';document.getElementById('query').style.height='auto';document.getElementById('cc').classList.remove('show');
  Sounds.play('pop');
  const ws=document.getElementById('ws');if(ws)ws.remove();

  appendUser(imgBase64 ? '\ud83d\udcf7 Image submitted for analysis' + (text ? ': '+text : '') : text);
  appendSkel();

  let msgs = [];
  let modelToUse = GROQ_MODEL;

  if (imgBase64) {
    modelToUse = VISION_MODEL;
    msgs = [{role:'user', content: [
      {type:"text", text: text || "Identify this medication tablet/capsule from its physical appearance, color, shape, and any imprint code visible. Provide clinical details."},
      {type:"image_url", image_url:{url:"data:image/jpeg;base64,"+imgBase64}}
    ]}];
  } else {
    msgs = [{role:'system',content:buildPrompt(text)},...hist.slice(-MAX_HIST*2),{role:'user',content:text}];
  }

  try{
    const res=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey},body:JSON.stringify({model:modelToUse,messages:msgs,temperature:0.25,max_tokens:1400,response_format:imgBase64?undefined:{type:'json_object'}})});
    const data=await res.json();
    if(data.error) throw new Error(data.error.message);
    let raw=data.choices?.[0]?.message?.content||'{}';
    if(imgBase64){
      raw = JSON.stringify({category:"General Information",summary:"Vision Analysis Complete",details:`<p>${esc(raw)}</p>`});
    }
    const parsed=JSON.parse(raw.replace(/```json|```/g,'').trim());
    remTyp();appendAI(parsed);
    if(parsed.in_scope !== false){ hap(15); demoIncrement(); }
    if(parsed.in_scope !== false){
      const slimRaw = raw.length > 500 ? '{"category":"System","summary":"Previous complex report generated."}' : raw;
      hist.push({role:'user',content:text},{role:'assistant',content:slimRaw});
    }
    saveHist();
    if(hist.length===2 && !imgBase64) genTitle(text);
  }catch(e){
    remTyp();
    appendErr('Something went wrong: '+e.message);
    toast('Request failed.','err');
    hap(40);
  }finally{
    loading=false;
    document.getElementById('sbtn').disabled=false;
    document.getElementById('query').focus();
  }
}

/* ══ MIC & CAMERA ══ */
function initMic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;recog=new SR();recog.continuous=false;recog.interimResults=false;recog.lang='en-US';recog.onresult=e=>{const t=e.results[0][0].transcript;const q=document.getElementById('query');q.value+=(q.value?' ':'')+t;autoR();q.focus();setMic(false);toast('Voice captured!','ok');};recog.onerror=()=>{setMic(false);toast('Microphone error.','err');};recog.onend=()=>setMic(false);}
function toggleMic(){if(!recog){toast('Voice not supported in this browser.','warn');return;}if(micOn){recog.stop();setMic(false);}else{recog.start();setMic(true);hap(20);}}
function setMic(on){micOn=on;const btn=document.getElementById('micbtn'),ico=document.getElementById('micico');ico.textContent=on?'mic_off':'mic';btn.classList.toggle('micon',on);}

const vid=()=>document.getElementById('video');
async function openCam(){document.getElementById('cm').classList.add('open');try{vid().srcObject=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}});}catch(e){toast('Camera access denied.','err');closeCam();}}
function closeCam(){const s=vid().srcObject;if(s)s.getTracks().forEach(t=>t.stop());vid().srcObject=null;document.getElementById('cm').classList.remove('open');}

async function capScan(){
  const btn=document.getElementById('snapbtn');
  const v=vid();
  if(v.videoWidth===0||v.videoHeight===0){toast('Camera is still initializing, please wait.','warn');return;}
  if(typeof Tesseract==='undefined'&&document.getElementById('cam-mode').value==='ocr'){
    toast('Loading OCR Engine (First time only)...','info');
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src="https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js";
      script.crossOrigin='anonymous';
      script.onload=resolve;
      script.onerror=()=>{toast('Failed to load OCR engine.','err');reject(new Error('Tesseract load failed'));};
      document.head.appendChild(script);
    }).catch(()=>{btn.disabled=false;btn.innerHTML='<span class="ms md">document_scanner</span> Capture';return;});
    if(typeof Tesseract==='undefined')return;
  }
  btn.disabled=true;btn.innerHTML='<span class="ms md" style="animation:spin 1s linear infinite">progress_activity</span> Processing...';
  const c=document.getElementById('canvas');
  c.width=v.videoWidth;c.height=v.videoHeight;
  c.getContext('2d').drawImage(v,0,0);
  const mode=document.getElementById('cam-mode').value;
  try{
    if(mode==='ocr'){
      const r=await Tesseract.recognize(c,'eng');
      const txt=r.data.text.trim();
      if(txt&&txt.length>3){closeCam();document.getElementById('ocredit').value=txt;openM('opm');}
      else{toast('No text detected. Try better lighting.','warn');}
    } else {
      const b64=c.toDataURL('image/jpeg').split(',')[1];
      closeCam();sendQ(b64);
    }
  }catch(e){toast('Processing failed. Please try again.','err');}
  btn.disabled=false;btn.innerHTML='<span class="ms md">document_scanner</span> Capture';
}

function confirmOCR(){const t=document.getElementById('ocredit').value.trim();if(!t)return;insertQ(t);closeM('opm');}
