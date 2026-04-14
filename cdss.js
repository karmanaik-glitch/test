/* ══ WARD DASHBOARD & CDSS LOGIC — FIXED ══ */
let isWardMode = false;
let wardPatients = [];
let activeTab = 'active';
let cdssTempLabs = [];
let cdssTempTx = [];
let currentWardMode = 'admit';
let _wardFormDirty = false;

// ══ WARD DATA LOAD / SAVE ══
async function loadWardData() {
  if (!user) return;

  const container = document.getElementById('pt-list-container');
  if(container) container.innerHTML = `<div style="text-align:center;padding:30px 20px;color:var(--muted);">
    <span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span><br>
    <span style="font-size:0.82rem;margin-top:8px;display:block;">Loading patients...</span>
  </div>`;

  try {
    let localData = await localforage.getItem('pharmai_ward_' + user);
    if (localData) { wardPatients = localData; renderWardList(); }
    
    const snap = await db.collection('users').doc(user).collection('ward').get();
    if (!snap.empty) {
      wardPatients = snap.docs.map(d => d.data());
      localforage.setItem('pharmai_ward_' + user, wardPatients);
      renderWardList();
    } else {
      const docSnap = await db.collection('users').doc(user).get();
      if (docSnap.exists && docSnap.data().wardPatients && docSnap.data().wardPatients.length > 0) {
        wardPatients = docSnap.data().wardPatients;
        renderWardList();
        const CHUNK = 400;
        for(let i=0;i<wardPatients.length;i+=CHUNK){
          const batch = db.batch();
          wardPatients.slice(i,i+CHUNK).forEach(pt => {
            batch.set(db.collection('users').doc(user).collection('ward').doc(pt.id.toString()), pt);
          });
          await batch.commit();
        }
        localforage.setItem('pharmai_ward_' + user, wardPatients);
      }
    }
    if(!wardPatients.length) renderWardList();
  } catch(e) {
    console.warn("Failed to load ward data", e);
    renderWardList();
  }
}

let wardSaveTimer = null;
function saveWardData() {
  if(!user) return;
  localforage.setItem('pharmai_ward_' + user, wardPatients);
  renderWardList();
  clearTimeout(wardSaveTimer);
  wardSaveTimer = setTimeout(async () => {
    try { 
      const CHUNK = 400;
      for(let i=0;i<wardPatients.length;i+=CHUNK){
        const batch = db.batch();
        wardPatients.slice(i,i+CHUNK).forEach(pt => {
          batch.set(db.collection('users').doc(user).collection('ward').doc(pt.id.toString()), pt);
        });
        await batch.commit();
      }
    } catch(e) { console.warn('Ward save failed:', e); }
  }, 2000);
}

function toggleAppMode() {
  if (!isWardMode) {
    history.pushState({ wardOpen: true }, '', '#ward');
    applyWardState(true);
  } else {
    history.back();
  }
}

function closeWardMode() {
  if (isWardMode) history.back();
}

function applyWardState(isOpen) {
  isWardMode = isOpen;
  const wardView = document.getElementById('cdss-view');
  const overlay = document.getElementById('ward-overlay');
  const navIcon = document.getElementById('navIcon');

  if (isOpen) {
    wardView.classList.add('open');
    if(overlay) overlay.classList.add('open');
    navIcon.textContent = 'chat';
    renderWardList();
  } else {
    wardView.classList.remove('open');
    if(overlay) overlay.classList.remove('open');
    navIcon.textContent = 'local_hospital';
  }
  Sounds.play('tick');
  hap(15);
}

window.addEventListener('popstate', (e) => {
  if (e.state && e.state.wardOpen) {
    applyWardState(true);
  } else {
    applyWardState(false);
  }
});

function switchWardTab(tab) {
  activeTab = tab;
  document.getElementById('tab-active').classList.toggle('active', tab === 'active');
  document.getElementById('tab-closed').classList.toggle('active', tab === 'closed');
  hap(10); renderWardList();
}

function renderWardList() {
  const container = document.getElementById('pt-list-container');
  if(!container) return;
  const filtered = wardPatients.filter(p => p.status === activeTab);
  
  const count = wardPatients.filter(p => p.status === 'active').length;
  const badge = document.getElementById('ward-badge');
  if(badge) { badge.style.display = count ? 'flex' : 'none'; badge.textContent = count; }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:50px 20px;">
        <span class="ms xxl" style="color:var(--b2); display:block; margin-bottom:16px;">local_hospital</span>
        <div style="font-weight:700; color:var(--text); margin-bottom:8px;">Ward is clear</div>
        <div style="font-size:0.85rem; color:var(--muted);">Tap Admit to add your first patient.</div>
      </div>
    `; return;
  }

  container.innerHTML = filtered.map(p => {
    const cc = p.cc ? String(p.cc).substring(0, 30) : 'No details';
    return `
    <div class="pat-card ${p.status}" onclick="openCDSSFile('${esc(p.id)}');hap(10);">
      <div class="pc-head">
        <div class="pc-name">${esc(p.name || 'Unknown')}</div>
        <div class="pc-badge">${esc(p.bedId || '—')}</div>
      </div>
      <div class="pc-details">
        <span>${esc(String(p.age || '?'))}y ${esc(p.sex || '')}</span>
        <span>${esc(String(p.weight || '?'))} kg</span>
        <span>CC: ${esc(cc)}${p.cc && p.cc.length > 30 ? '…' : ''}</span>
      </div>
    </div>`;
  }).join('');
}

function clearCDSSForm() {
  const inputs = document.querySelectorAll('#cdss-form .finp');
  inputs.forEach(inp => { if (inp.tagName === 'SELECT') inp.selectedIndex = 0; else inp.value = ''; });
  document.getElementById('w-bmi').textContent = '--'; document.getElementById('w-bmi').style.color = 'var(--t2)';
  document.getElementById('w-preg-fg').style.display = 'none';
  cdssTempLabs = []; cdssTempTx = [];
  renderCDSSLabs(); renderCDSSTx();
  _wardFormDirty = false;
}

function calcBMI() {
  const w = parseFloat(document.getElementById('w-wt').value), h = parseFloat(document.getElementById('w-ht').value), bmiEl = document.getElementById('w-bmi');
  if (w && h) { const bmi = (w / ((h/100) * (h/100))).toFixed(1); bmiEl.textContent = bmi + ' kg/m²'; bmiEl.style.color = (bmi < 18.5 || bmi >= 25) ? 'var(--warn)' : 'var(--ok)'; } 
  else { bmiEl.textContent = '--'; bmiEl.style.color = 'var(--t2)'; }
  _wardFormDirty = true;
}

function togglePreg() {
  const sex = document.getElementById('w-sex').value, pregBox = document.getElementById('w-preg-fg');
  if(pregBox) pregBox.style.display = sex === 'F' ? 'flex' : 'none';
}

function openCDSSWiz(mode) {
  currentWardMode = mode;
  document.getElementById('cdss-form').classList.add('open');
  if (mode === 'admit') {
    clearCDSSForm();
    document.getElementById('wiz-title').innerHTML = '<span class="ms md">person_add</span> Admit Patient';
    document.getElementById('wiz-sec-demo').style.display = 'block';
    document.getElementById('wiz-sec-hist').style.display = 'block';
    document.getElementById('wiz-sec-fresh').style.display = 'none';
    document.getElementById('lbl-vitals').textContent = 'Baseline Vitals';
    document.getElementById('btn-gen-plan').innerHTML = '<span class="ms sm">memory</span> Analyze & Generate';
  } else if (mode === 'progress') {
    if (!activeCaseId) { toast('No active patient selected.', 'err'); closeCDSSWiz(); return; }
    clearCDSSForm();
    const pt = wardPatients.find(p => p.id === activeCaseId);
    cdssTempTx = pt && pt.currentTx ? JSON.parse(JSON.stringify(pt.currentTx)) : [];
    document.getElementById('wiz-title').innerHTML = '<span class="ms md">edit_note</span> Add Daily Progress';
    document.getElementById('wiz-sec-demo').style.display = 'none'; 
    document.getElementById('wiz-sec-hist').style.display = 'none'; 
    document.getElementById('wiz-sec-fresh').style.display = 'block';
    document.getElementById('lbl-vitals').textContent = 'Updated Vitals';
    document.getElementById('btn-gen-plan').innerHTML = '<span class="ms sm">memory</span> Generate Progress Plan';
    renderCDSSTx();
  }

  document.querySelectorAll('#cdss-form .finp').forEach(el => {
    el.addEventListener('input', () => { _wardFormDirty = true; }, { once: true });
  });
}

function closeCDSSWiz() {
  if(_wardFormDirty && !confirm('You have unsaved changes. Discard and close?')) return;
  _wardFormDirty = false;
  document.getElementById('cdss-form').classList.remove('open');
}

const cdssLabOpts = {
  hemato: ['Hb (g/dL)', 'RBC (millions/µL)', 'WBC (cells/mm³)', 'Platelets (lakhs/µL)', 'MCV (fL)', 'MCH (pg)', 'MCHC (g/dL)', 'PCV/HCT (%)', 'ESR (mm/hr)', 'Neutrophils (%)', 'Lymphocytes (%)', 'INR', 'aPTT (sec)'],
  biochem: ['Na+ (mEq/L)', 'K+ (mEq/L)', 'Cl- (mEq/L)', 'HCO3- (mEq/L)', 'BUN (mg/dL)', 'Ca2+ (mg/dL)', 'Mg2+ (mg/dL)', 'PO4 (mg/dL)', 'Uric Acid (mg/dL)', 'Albumin (g/dL)', 'Globulin (g/dL)', 'Total Protein (g/dL)', 'RBS (mg/dL)', 'FBS (mg/dL)', 'HbA1c (%)', 'Lactic Acid (mmol/L)', 'Procalcitonin (ng/mL)'],
  cardio: ['Troponin (ng/mL)', 'BNP (pg/mL)', 'PT (sec)']
};

function updLabParams() {
  const sys = document.getElementById('lab-sys').value, paramSelect = document.getElementById('lab-param');
  paramSelect.innerHTML = '<option value="">-- Parameter --</option>';
  if (sys && cdssLabOpts[sys]) cdssLabOpts[sys].forEach(p => { paramSelect.innerHTML += `<option value="${esc(p)}">${esc(p)}</option>`; });
}

function addLabTag() {
  const param = document.getElementById('lab-param').value, val = document.getElementById('lab-val').value;
  if (!param || !val) { toast('Select a parameter and enter a value.', 'warn'); return; }
  cdssTempLabs.push({ param, val }); document.getElementById('lab-val').value = ''; renderCDSSLabs(); hap(10);
  _wardFormDirty = true;
}
function renderCDSSLabs() { document.getElementById('lab-tags').innerHTML = cdssTempLabs.map((l, i) => `<div class="rx-tag">${esc(l.param)}: <b>${esc(l.val)}</b> <button class="rx-del" onclick="remLabTag(${i});hap(10);"><span class="ms xs">close</span></button></div>`).join(''); }
function remLabTag(i) { cdssTempLabs.splice(i, 1); renderCDSSLabs(); }

function addTxTag() {
  const drug = document.getElementById('tx-drug').value, dose = document.getElementById('tx-dose').value, freq = document.getElementById('tx-freq').value, route = document.getElementById('tx-route').value;
  if (!drug) { toast('Drug name is required.', 'warn'); return; }
  cdssTempTx.push({ drug, dose, freq, route });
  document.getElementById('tx-drug').value = ''; document.getElementById('tx-dose').value = ''; document.getElementById('tx-freq').value = ''; document.getElementById('tx-route').value = '';
  renderCDSSTx(); hap(10); _wardFormDirty = true;
}
function editTxTag(i) { const t = cdssTempTx[i]; document.getElementById('tx-drug').value = t.drug || ''; document.getElementById('tx-dose').value = t.dose || ''; document.getElementById('tx-freq').value = t.freq || ''; document.getElementById('tx-route').value = t.route || ''; remTxTag(i); }
function renderCDSSTx() { document.getElementById('tx-tags').innerHTML = cdssTempTx.map((t, i) => `<div class="rx-tag" style="justify-content:space-between; width:100%;">${esc(t.drug)} - ${esc(t.dose)} ${esc(t.freq)} (${esc(t.route)}) <div><button class="rx-del" style="color:var(--text); margin-right:8px;" onclick="editTxTag(${i});hap(10);"><span class="ms xs">edit</span></button><button class="rx-del" onclick="remTxTag(${i});hap(10);"><span class="ms xs">close</span></button></div></div>`).join(''); }
function remTxTag(i) { cdssTempTx.splice(i, 1); renderCDSSTx(); }

function renderSparkline(data, color) {
  if(data.length < 2) return '';
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`).join(' ');
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:60px;height:24px;overflow:visible;"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ══ AI ENGINE & BUNDLING ══ */
let activeCaseId = null;
let dcRxList = [];

function openCDSSFile(id) {
  activeCaseId = id;
  const pt = wardPatients.find(p => p.id === id);
  if(!pt) return;
  document.getElementById('cdss-dash').style.display = 'none';
  document.getElementById('cdss-file').classList.add('open');
  document.getElementById('f-pt-name').textContent = pt.name || 'Unknown';
  document.getElementById('f-pt-bed').textContent = pt.bedId || '—';
  
  let sparkHTML = '';
  if (pt.vitalsHistory && pt.vitalsHistory.length > 0) {
    const bps = pt.vitalsHistory.map(v => parseInt((v.bp||'').split('/')[0])).filter(n => !isNaN(n));
    const hrs = pt.vitalsHistory.map(v => parseInt(v.hr)).filter(n => !isNaN(n));
    sparkHTML = `
      <div style="margin-bottom:20px;">
        <div style="font-size:0.75rem; color:var(--muted); text-transform:uppercase; font-weight:700; letter-spacing:0.05em; margin-bottom:8px;">Trend Analysis</div>
        ${bps.length>1 ? `<div class="spark-row"><span class="spark-lbl">SBP (mmHg)</span>${renderSparkline(bps, 'var(--warn)')}<span class="spark-val">${bps[bps.length-1]}</span></div>` : ''}
        ${hrs.length>1 ? `<div class="spark-row"><span class="spark-lbl">HR (bpm)</span>${renderSparkline(hrs, 'var(--danger)')}<span class="spark-val">${hrs[hrs.length-1]}</span></div>` : ''}
      </div>
    `;
  }
  
  const timelineEl = document.getElementById('pt-timeline');
  timelineEl.innerHTML = sparkHTML + (pt.htmlTimeline || '<div style="color:var(--muted); text-align:center; padding:20px;">No AI reports generated yet.</div>');
  timelineEl.scrollTop = 0; 
  
  const fa = document.getElementById('file-actions');
  if(pt.status === 'closed') {
    fa.innerHTML = `<button class="btn-block sec" onclick="reopenCase('${esc(id)}')"><span class="ms sm">lock_open</span> Reopen Case</button>`;
    fa.style.display = 'flex';
  } else {
    fa.innerHTML = `<button class="btn-block sec" onclick="qDoseCheck('${esc(id)}')"><span class="ms sm">vaccines</span> Dose Check</button><button class="btn-block sec" onclick="openCDSSWiz('progress');hap(10);"><span class="ms sm">edit_note</span> Add Progress</button><button class="btn-block" onclick="openDischargeModal();hap(10);" style="background:var(--danger); color:#fff; box-shadow:none;"><span class="ms sm">logout</span> Close Case</button>`;
    fa.style.display = 'flex';
  }
}

function reopenCase(id) { const pt = wardPatients.find(p => p.id === id); if(pt) { pt.status = 'active'; saveWardData(); openCDSSFile(id); toast('Case reopened', 'ok'); } }
function closeCDSSFile() { activeCaseId = null; document.getElementById('cdss-file').classList.remove('open'); document.getElementById('cdss-dash').style.display = 'block'; renderWardList(); }
function openDischargeModal() { dcRxList = []; renderDcRx(); document.getElementById('discharge-modal').classList.add('open'); }

function renderDcRx() { document.getElementById('dc-rx-list').innerHTML = dcRxList.map((r,i) => `<div class="rx-tag">${esc(r)}<button class="rx-del" onclick="remDcRx(${i})"><span class="ms xs">close</span></button></div>`).join(''); }
function remDcRx(i) { dcRxList.splice(i, 1); renderDcRx(); }
function addDcRx() { const v = document.getElementById('dc-rx-inp').value.trim(); if(!v) return; dcRxList.push(v); document.getElementById('dc-rx-inp').value = ''; renderDcRx(); }
function processDischarge() { openM('dc-confirm-modal'); }

async function execProcessDischarge() {
  const outcome = document.getElementById('dc-outcome').value,
        notes = document.getElementById('dc-notes').value,
        dod = document.getElementById('dc-dod') ? document.getElementById('dc-dod').value : '';
  closeM('dc-confirm-modal');
  const btn = document.querySelector('#discharge-modal .btn-block');
  const ogText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Finalizing...';
  try {
    let pt = wardPatients.find(p => p.id === activeCaseId); if(pt) pt.status = 'closed';
    if(outcome === 'discharge' && dcRxList.length > 0) {
      const lang = document.getElementById('dc-lang').value;
      const payload = { discharge_medications: dcRxList, clinical_notes: notes, dod: dod, patient_context: { social_history: pt?.hist?.soc, allergies: pt?.hist?.alg, age: pt?.demo?.age, sex: pt?.demo?.sex } };
      closeM('discharge-modal'); await callCDSSAI(payload, 'discharge', lang);
    } else {
      if(pt) { pt.htmlTimeline = pt.htmlTimeline || ''; pt.htmlTimeline = `<div class="cdss-report" style="border-left:4px solid var(--t2)"><div class="rep-hdr">Case Closed: ${esc(outcome.toUpperCase())} ${dod ? `<span style="float:right; color:var(--text); font-size:0.85rem;">DOD: ${esc(dod)}</span>` : ''}</div><p>${esc(notes)}</p></div>` + pt.htmlTimeline; }
      saveWardData(); closeM('discharge-modal'); openCDSSFile(activeCaseId); 
    }
  } finally { btn.disabled = false; btn.innerHTML = ogText; }
}

function openADRModal() {
  const pt = wardPatients.find(p => p.id === activeCaseId);
  if(pt) document.getElementById('adr-pt').value = `${pt.name} (${pt.bedId})`;
  document.getElementById('adr-drug').value = ''; document.getElementById('adr-desc').value = ''; document.getElementById('adr-date').value = '';
  openM('adr-modal');
}

function generateADR() {
  const ptInfo = document.getElementById('adr-pt').value;
  const drug = document.getElementById('adr-drug').value;
  const desc = document.getElementById('adr-desc').value;
  if(!drug || !desc) { toast('Please fill suspected drug and description.', 'warn'); return; }
  const r = `PvPI Adverse Drug Reaction Report\nDate: ${new Date().toLocaleDateString()}\nPatient: ${ptInfo}\nSuspected Drug: ${drug}\nOnset Date: ${document.getElementById('adr-date').value}\nReaction Description: ${desc}\nAction Taken: ${document.getElementById('adr-action').value}\nReporter: ${uName} (Clinical Pharmacist)\n\nNote: Submit this report at pvpi.gov.in or via VigiFlow for official pharmacovigilance recording.`;

  /* FIX: save ADR report to the patient's timeline before attempting clipboard copy.
     Previously the report was clipboard-only — if writeText() was rejected (permission
     denied, iframe, focus loss) the modal closed silently and the report was lost. */
  const pt = wardPatients.find(p => p.id === activeCaseId);
  if(pt) {
    pt.htmlTimeline = `<div class="cdss-report" style="border-left:4px solid var(--warn);">
      <div class="rep-hdr"><span class="ms sm">warning</span> ADR Report — ${esc(drug)} (${new Date().toLocaleDateString()})</div>
      <pre style="font-size:0.8rem;white-space:pre-wrap;color:var(--text);font-family:var(--font-sans);">${esc(r)}</pre>
    </div>` + (pt.htmlTimeline || '');
    saveWardData();
  }

  /* FIX: added .catch() so a clipboard failure shows a message instead of silent data loss */
  navigator.clipboard.writeText(r)
    .then(() => {
      toast('Report copied & saved to timeline. Submit at pvpi.gov.in', 'ok', 5000);
      closeM('adr-modal');
    })
    .catch(() => {
      toast('Report saved to patient timeline. Copy manually if needed.', 'warn', 6000);
      closeM('adr-modal');
    });
}

async function genCarePlan() {
  const isUpdate = (currentWardMode === 'progress');
  let pt = activeCaseId ? wardPatients.find(p => p.id === activeCaseId) : null;
  const currentDOA = document.getElementById('w-doa') ? document.getElementById('w-doa').value : '';
  const payload = {
    isUpdate: isUpdate,
    demographics: isUpdate && pt && pt.demo ? pt.demo : { doa: currentDOA, name: document.getElementById('w-name').value, id: document.getElementById('w-id').value, age: document.getElementById('w-age').value, sex: document.getElementById('w-sex').value, wt: document.getElementById('w-wt').value, ht: document.getElementById('w-ht') ? document.getElementById('w-ht').value : '', preg: document.getElementById('w-preg') ? document.getElementById('w-preg').value : '' },
    history: isUpdate && pt && pt.hist ? pt.hist : { dx: document.getElementById('w-dx') ? document.getElementById('w-dx').value : '', cc: document.getElementById('w-cc').value, pmh: document.getElementById('w-pmh').value, pmx: document.getElementById('w-pmx') ? document.getElementById('w-pmx').value : '', alg: document.getElementById('w-alg').value, soc: document.getElementById('w-soc').value, fam: document.getElementById('w-fam').value },
    updates: { fresh: document.getElementById('w-fresh').value },
    vitals: { bp: document.getElementById('v-bp').value, hr: document.getElementById('v-hr').value, rr: document.getElementById('v-rr').value, temp: document.getElementById('v-temp').value, spo2: document.getElementById('v-spo2').value, cns: document.getElementById('v-cns').value, resp: document.getElementById('v-resp').value },
    labs: { anchors: { scr: document.getElementById('l-scr').value, ast: document.getElementById('l-ast').value, alt: document.getElementById('l-alt').value, bil: document.getElementById('l-bil').value }, specifics: cdssTempLabs, urine: document.getElementById('l-urine').value, img: document.getElementById('l-img').value },
    treatment: cdssTempTx
  };

  let age = parseFloat(payload.demographics.age), wt = parseFloat(payload.demographics.wt), scr = parseFloat(payload.labs.anchors.scr), sex = payload.demographics.sex, ht = parseFloat(payload.demographics.ht);
  if (!isNaN(age) && !isNaN(wt) && !isNaN(scr) && scr > 0) {
    /* Use Adjusted Body Weight for obese patients (actual wt > 130% IBW) per CG guidance */
    let dosingWt = wt;
    if (!isNaN(ht) && ht > 0) {
      const hi = ht / 2.54; /* cm to inches */
      const ibw = sex === 'F' ? 45.5 + 2.3 * (hi - 60) : 50 + 2.3 * (hi - 60);
      const ibwClamped = Math.max(0, ibw);
      if (wt > 1.3 * ibwClamped && ibwClamped > 0) {
        dosingWt = ibwClamped + 0.4 * (wt - ibwClamped); /* ABW */
      }
    }
    let crcl = ((140 - age) * dosingWt) / (72 * scr); if (sex === 'F') crcl *= 0.85;
    const wtNote = dosingWt !== wt ? ` (ABW used: ${dosingWt.toFixed(1)}kg — obese patient)` : '';
    payload.labs.calculated_CrCl_CG = crcl.toFixed(1) + " mL/min (Cockcroft-Gault, for drug dosing only)" + wtNote;
  }
  if(isUpdate && pt && pt.demo && pt.demo.doa) { payload.demographics.doa = pt.demo.doa; }

  const btn = document.getElementById('btn-gen-plan'); const ogText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Analyzing...';

  try {
    if(!isUpdate && !activeCaseId) {
      /* FIX: append a random suffix to prevent ID collision when two patients are
         admitted within the same millisecond (e.g. via rapid import or double-tap).
         Previously Date.now() alone could produce the same ID for both, causing the
         second patient to silently overwrite the first in Firestore. */
      activeCaseId = 'PT-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      pt = { id: activeCaseId, status: 'active', name: payload.demographics.name || 'Unknown', bedId: payload.demographics.id || 'TBD', age: payload.demographics.age, sex: payload.demographics.sex, weight: payload.demographics.wt, cc: payload.history.dx || payload.history.cc || 'No complaints', htmlTimeline: '', currentTx: cdssTempTx, demo: payload.demographics, hist: payload.history, vitalsHistory: [] };
      wardPatients.unshift(pt);
    } else if (pt) {
      pt.currentTx = cdssTempTx;
    }
    
    if(!pt) {
      toast('Patient record not found. Please re-admit.', 'err');
      btn.disabled = false; btn.innerHTML = ogText;
      return;
    }

    if(payload.vitals && (payload.vitals.bp || payload.vitals.hr)) { 
      pt.vitalsHistory = pt.vitalsHistory || [];
      pt.vitalsHistory.push({ date: new Date().toISOString(), bp: payload.vitals.bp, hr: payload.vitals.hr }); 
    }
    saveWardData();
    _wardFormDirty = false;
  } catch(e) { console.error("Save Error:", e); toast('Failed to save patient data.', 'err'); btn.disabled = false; btn.innerHTML = ogText; return; }
  
  btn.disabled = false; btn.innerHTML = ogText;
  closeCDSSWiz(); openCDSSFile(activeCaseId);
  await callCDSSAI(payload, isUpdate ? 'progress' : 'baseline');
}

async function callCDSSAI(payload, mode, lang = 'English') {
  if(!groqKey) { toast('API key not configured.', 'err'); return; }

  /* Demo limit gate — CDSS reports count the same as chat queries */
  if(!demoCheck()) { showLimitModal(); return; }

  const pt = wardPatients.find(p => p.id === activeCaseId); if(pt) pt.htmlTimeline = pt.htmlTimeline || '';

  let sysPrompt = "";
  if (mode === 'baseline' || mode === 'progress') {
    sysPrompt = `You are PharmAI, an elite Senior Clinical Pharmacist. Perform a rigorous, multi-variable Comprehensive Medication Review (CMR) and output it as a structured SOAP note.

UNIVERSAL CLINICAL RULES:
1. CUMULATIVE TOXICITY: Explicitly calculate and flag Anticholinergic burden, Serotonin Syndrome risk, combined CNS depression, QTc prolongation, and stacked bleeding risks.
2. RENAL/HEPATIC: Use 'calculated_CrCl_CG' from the payload for drug dose adjustments. This is a Cockcroft-Gault estimate for DRUG DOSING only — do NOT use it to stage CKD (CKD staging requires CKD-EPI eGFR which is not provided here).
3. PHARMACOKINETICS: Scan for enzyme inhibitors/inducers interacting with NTI drugs.
4. DRUG-DISEASE: Cross-reference all medications against active PMH, Diagnoses, AND Social History.
5. ALLERGIES: Categorize known allergies strictly as "Contraindication" (Severity: Critical).
6. NTI DRUGS: If ANY narrow therapeutic index drug is present ALWAYS flag in the monitoring column.
7. WEIGHT-BASED DOSING: Verify dose appropriateness for patient's actual body weight.

Sort drug_related_problems in descending severity: Critical first, then High, Moderate, Low.

Output ONLY valid JSON in this exact SOAP schema:
{
  "soap": {
    "S": {
      "chief_complaint": "Primary reason for admission or today's visit in one sentence.",
      "history": "Demographics (name, age, sex, weight, DOA), diagnosis, PMH, surgical/medication history, allergies (flag as RED FLAGS), social history, family history. For progress notes include patient-reported updates and symptom changes since last review."
    },
    "O": {
      "vitals": "All vitals with brief interpretation — flag abnormals explicitly (e.g. HR 112 — tachycardic, SpO2 94% — borderline hypoxic).",
      "labs": "All lab values with reference-range flags. State calculated_CrCl_CG explicitly. Note trends if progress note.",
      "current_therapy": [ { "drug": "Name", "dose": "Dose", "freq": "Frequency", "route": "Route", "indication": "Inferred Indication", "moa": "Brief MOA", "monitoring": "Required monitoring parameters", "side_effects": "Key adverse effects to watch" } ]
    },
    "A": {
      "clinical_correlations": ["Connect objective findings to medications — e.g. hyponatremia likely SIADH from sertraline."],
      "drug_related_problems": [ { "category": "Contraindication | Drug-Drug Interaction | Drug-Disease Interaction | Dosing Error | Polypharmacy | Adverse Effect | Untreated Indication | Unnecessary Drug", "drug_pair": "For Drug-Drug Interaction ONLY — exact names of both drugs e.g. 'Warfarin ↔ Fluconazole'. Null for all other categories.", "issue": "Specific, patient-contextualised clinical description including mechanism for DDIs.", "severity": "Critical | High | Moderate | Low", "actionable_solution": "Precise, implementable clinical intervention." } ]
    },
    "P": {
      "pharmacist_interventions": ["Numbered, prioritised actions directly addressing each DRP."],
      "monitoring_plan": ["Specific parameter, target value, and frequency — e.g. Serum K+ — target 3.5–5.0 mEq/L — recheck in 48h."],
      "follow_up": "Clear follow-up timeline and handoff instructions.",
      "references": ["Specific guideline or evidence source for each intervention."]
    }
  }
}`;
  } else if (mode === 'discharge') {
    sysPrompt = `You are an elite Patient Educator and Geriatric Care Specialist. Generate a highly specific, actionable discharge counseling card.
CRITICAL DIRECTIVES:
1. 5TH-GRADE READING LEVEL: Use short, direct sentences in ${lang}. Use active voice.
2. HYPER-SPECIFIC ADVICE: Specify EXACTLY how to take the drug.
3. CONTEXTUALIZE: Explicitly address any lifestyle/dietary factors in the patient's Social History.
4. RED FLAGS: Clearly list severe symptoms requiring immediate attention.
5. CULTURAL CONTEXT: When outputting in Hindi/Gujarati, use culturally relevant Indian dietary examples.
6. OUTPUT STRICT JSON ONLY.

Output ONLY valid JSON:
{
  "title": "Discharge Instructions",
  "diagnosis_simple": "A clear layman explanation.",
  "medications": [ { "name": "Medicine Name", "purpose": "Why you are taking this", "schedule": "Exact time/instructions", "warnings": "Specific side effects or diet interactions" } ],
  "lifestyle_and_diet": ["Actionable, patient-specific diet/lifestyle rule"],
  "when_to_call_doctor": ["Specific red flag symptom"]
}`;
  }

  const loaderId = 'load-' + Date.now();
  document.getElementById('pt-timeline').innerHTML = `<div id="${loaderId}" class="cdss-report"><span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> ${mode === 'discharge' ? 'Generating Patient Instructions...' : 'PharmAI is performing a CMR...'}</div>` + document.getElementById('pt-timeline').innerHTML;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: JSON.stringify(payload) }], temperature: 0.1, max_tokens: mode === 'discharge' ? 2000 : 3000, response_format: { type: 'json_object' } })
    });
    const data = await res.json();

    if(data.error) throw new Error(data.error.message || 'API error');
    if(!data.choices || !data.choices[0] || !data.choices[0].message) throw new Error('Empty response from AI service.');

    let rawContent = data.choices[0].message.content.trim().replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/g, '').trim();
    const result = JSON.parse(rawContent);

    /* Sort DRPs — now nested under soap.A */
    const soap = result.soap || {};
    const sA = soap.A || {};
    if(Array.isArray(sA.drug_related_problems)) {
      const sevOrder = { 'Critical': 1, 'High': 2, 'Moderate': 3, 'Low': 4 };
      sA.drug_related_problems.sort((a,b) => (sevOrder[a.severity] || 99) - (sevOrder[b.severity] || 99));
    }

    const loaderEl = document.getElementById(loaderId);
    if(loaderEl) loaderEl.remove();

    /* All AI-supplied fields escaped before innerHTML injection — see prior security note */
    let html = '';

    const safeDod = esc(payload.dod || '');
    const safeDoa = esc((payload.demographics && payload.demographics.doa) ? payload.demographics.doa : '');
    const dodDisplay = safeDod ? `<span style="float:right;color:var(--text);font-size:0.85rem;font-weight:600;">DOD: ${safeDod}</span>` : '';
    const doaDisplay = safeDoa ? `<span style="float:right;color:var(--text);font-size:0.85rem;font-weight:600;">DOA: ${safeDoa}</span>` : '';

    const aiDisclaimer = `<div style="margin-top:15px;padding:8px 12px;background:rgba(255,193,7,0.07);border:1px solid rgba(255,193,7,0.25);border-radius:8px;font-size:0.7rem;color:var(--muted);line-height:1.5;">
      <strong style="color:var(--warn);">&#9888; Clinical Decision Support Only:</strong> This AI-generated report is intended to assist a qualified clinical pharmacist. Always verify drug-related problems, doses, and recommendations against current formulary, local protocols, and the patient's full clinical picture before acting. Cited references are AI-suggested — verify independently.
    </div>`;

    /* ── SOAP section label helper ─────────────────────────────────────────── */
    const soapSection = (letter, label, color, icon, content) => `
      <div style="margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:30px;height:30px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="font-size:0.85rem;font-weight:700;color:#fff;font-family:monospace;">${letter}</span>
          </div>
          <div style="font-weight:700;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--text);">${label}</div>
          <span class="ms xs" style="color:var(--muted)">${icon}</span>
        </div>
        <div style="padding-left:40px;font-size:0.85rem;line-height:1.65;color:var(--text);">${content}</div>
      </div>`;

    if(mode === 'discharge') {
      /* Discharge mode is patient-facing — SOAP does not apply. Unchanged. */
      html = `<div class="cdss-report" style="border-left:4px solid var(--ok);background:rgba(16,185,129,0.05);">
        <div class="rep-hdr" style="color:var(--ok)"><span class="ms sm">home</span> ${esc(result.title || 'Discharge Instructions')} (${esc(lang)}) ${dodDisplay}</div>
        <p style="margin-bottom:15px;line-height:1.6;"><strong>Overview:</strong> ${esc(result.diagnosis_simple || '')}</p>
        <div style="font-weight:700;color:var(--ok);margin-bottom:8px;"><span class="ms sm">medication</span> Your Medications</div>
        <div style="width:100%;overflow-x:auto;margin-bottom:15px;border-radius:8px;border:1px solid var(--b);">
          <table class="rep-tbl" style="min-width:600px;margin:0;"><tr><th>Medicine</th><th>Purpose</th><th>How to Take</th><th>Specific Warnings</th></tr>
          ${(result.medications||[]).map(m=>`<tr>
            <td><strong>${esc(m.name||'-')}</strong></td>
            <td>${esc(m.purpose||'-')}</td>
            <td>${esc(m.schedule||'-')}</td>
            <td>${esc(m.warnings||'-')}</td>
          </tr>`).join('')}</table>
        </div>
        <div style="margin-top:15px;">
          <div style="font-weight:700;color:var(--text);margin-bottom:8px;"><span class="ms sm">restaurant_menu</span> Diet &amp; Lifestyle</div>
          <ul style="font-size:0.85rem;margin-left:20px;margin-bottom:15px;">${(result.lifestyle_and_diet||[]).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--b);">
          <div style="font-weight:700;color:var(--danger);margin-bottom:8px;"><span class="ms sm">warning</span> When to Call the Doctor</div>
          <ul style="font-size:0.85rem;margin-left:20px;">${(result.when_to_call_doctor||[]).map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
        </div>
        ${aiDisclaimer}
      </div>`;
    } else {
      /* ── SOAP note rendering ─────────────────────────────────────────────── */
      const sS = soap.S || {};
      const sO = soap.O || {};
      const sP = soap.P || {};

      /* S — Subjective */
      const sContent = `
        <div style="margin-bottom:6px;"><strong>Chief Complaint:</strong> ${esc(sS.chief_complaint || 'Not provided.')}</div>
        <div><strong>History:</strong> ${esc(sS.history || 'Not provided.')}</div>`;

      /* O — Objective: vitals + labs prose, then therapy table */
      const therapyRows = Array.isArray(sO.current_therapy) && sO.current_therapy.length > 0
        ? sO.current_therapy.map(c=>`<tr>
            <td><strong>${esc(c.drug||'-')}</strong></td>
            <td>${esc(c.dose||'-')}</td>
            <td>${esc(c.freq||'-')}</td>
            <td>${esc(c.route||'-')}</td>
            <td>${esc(c.indication||'-')}</td>
            <td>${esc(c.moa||'-')}</td>
            <td>${esc(c.monitoring||'-')}</td>
            <td>${esc(c.side_effects||'-')}</td>
          </tr>`).join('')
        : '<tr><td colspan="8" style="text-align:center;">No current therapy recorded.</td></tr>';

      const oContent = `
        <div style="margin-bottom:8px;"><strong>Vitals:</strong> ${esc(sO.vitals || 'Not provided.')}</div>
        <div style="margin-bottom:10px;"><strong>Labs:</strong> ${esc(sO.labs || 'Not provided.')}</div>
        <div style="font-weight:600;margin-bottom:6px;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Current Therapy</div>
        <div style="width:100%;overflow-x:auto;border-radius:8px;border:1px solid var(--b);">
          <table class="rep-tbl" style="min-width:860px;margin:0;">
            <tr><th>Drug</th><th>Dose</th><th>Freq</th><th>Route</th><th>Indication</th><th>MOA</th><th>Monitoring</th><th>Side Effects</th></tr>
            ${therapyRows}
          </table>
        </div>`;

      /* A — Assessment: correlations + DRPs */
      const correlationsHtml = Array.isArray(sA.clinical_correlations) && sA.clinical_correlations.length > 0
        ? `<div style="margin-bottom:10px;"><strong>Clinical Correlations:</strong>
            <ul style="margin:5px 0 0 18px;">${sA.clinical_correlations.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
           </div>` : '';

      const drpItems = Array.isArray(sA.drug_related_problems) && sA.drug_related_problems.length > 0
        ? sA.drug_related_problems.map(drp => {
            const badgeClass = (drp.severity === 'Critical' || drp.severity === 'High') ? 'dng' : 'warn';
            const badgeText  = esc(drp.severity ? drp.severity.toUpperCase() : 'UNKNOWN');
            /* Drug-pair badge — only rendered for Drug-Drug Interaction entries that
               have the drug_pair field populated. Shows as a prominent pill e.g.
               "Warfarin ↔ Fluconazole" so the specific interaction is immediately visible. */
            const isDDI = drp.category === 'Drug-Drug Interaction';
            const pairBadge = isDDI && drp.drug_pair
              ? `<div style="display:inline-flex;align-items:center;gap:6px;margin:6px 0 2px;padding:4px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);border-radius:6px;font-size:0.78rem;font-weight:700;color:var(--danger);letter-spacing:0.01em;">
                  <span style="font-size:13px;line-height:1;">⚡</span>${esc(drp.drug_pair)}
                </div>` : '';
            return `<div class="aalert ${badgeClass}" style="margin-bottom:8px;flex-direction:column;">
              <div style="font-weight:700;text-transform:uppercase;font-size:0.7rem;">${esc(drp.category||'Issue')} [${badgeText} RISK]</div>
              ${pairBadge}
              <div style="margin:4px 0;color:var(--text);"><strong>Issue:</strong> ${esc(drp.issue||'-')}</div>
              <div style="color:var(--text);"><strong>Intervention:</strong> ${esc(drp.actionable_solution||'-')}</div>
            </div>`;
          }).join('')
        : '<div style="color:var(--muted);font-size:0.85rem;">No drug-related problems identified.</div>';

      const aContent = correlationsHtml +
        `<div style="margin-top:8px;"><strong style="font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;">Drug-Related Problems</strong>
          <div style="margin-top:8px;">${drpItems}</div>
        </div>`;

      /* P — Plan */
      const interventionsHtml = (sP.pharmacist_interventions||['No interventions required at this time.']).map((i,idx)=>`<li><strong>${idx+1}.</strong> ${esc(i)}</li>`).join('');
      const monitoringHtml    = (sP.monitoring_plan||[]).map(m=>`<li>${esc(m)}</li>`).join('');
      const referencesHtml    = (sP.references||[]).map(r=>esc(r)).join('<br>');

      const pContent = `
        <div style="margin-bottom:10px;">
          <strong>Pharmacist Interventions:</strong>
          <ul style="margin:5px 0 0 18px;">${interventionsHtml}</ul>
        </div>
        ${monitoringHtml ? `<div style="margin-bottom:10px;">
          <strong>Monitoring Plan:</strong>
          <ul style="margin:5px 0 0 18px;">${monitoringHtml}</ul>
        </div>` : ''}
        <div style="margin-bottom:10px;">
          <strong>Follow-up:</strong> ${esc(sP.follow_up || 'Not specified.')}
        </div>
        <div style="font-size:0.72rem;color:var(--muted);border-top:1px dashed var(--b);padding-top:8px;margin-top:4px;">
          <strong>References:</strong><br>${referencesHtml || 'None cited.'}
        </div>`;

      html = `<div class="cdss-report">
        <div class="rep-hdr">
          <span class="ms sm">description</span>
          ${mode === 'baseline' ? 'Pharmacist SOAP — Admission CMR' : 'Pharmacist SOAP — Daily Progress'}
          &nbsp;&middot;&nbsp;${esc(new Date().toLocaleDateString())} ${ts()} ${doaDisplay}
        </div>
        <div style="border-top:1px solid var(--b);padding-top:14px;margin-top:4px;">
          ${soapSection('S', 'Subjective', '#6366f1', 'person', sContent)}
          <div style="border-top:1px solid var(--b);margin:2px 0 16px;"></div>
          ${soapSection('O', 'Objective', '#0ea5e9', 'biotech', oContent)}
          <div style="border-top:1px solid var(--b);margin:2px 0 16px;"></div>
          ${soapSection('A', 'Assessment', '#f59e0b', 'warning', aContent)}
          <div style="border-top:1px solid var(--b);margin:2px 0 16px;"></div>
          ${soapSection('P', 'Plan', '#10b981', 'check_circle', pContent)}
        </div>
        ${aiDisclaimer}
      </div>`;
    }

    if(pt) { pt.htmlTimeline = html + pt.htmlTimeline; saveWardData(); demoIncrement(); openCDSSFile(activeCaseId); }
  } catch(e) {
    const loaderEl = document.getElementById(loaderId);
    if(loaderEl) loaderEl.innerHTML = `<div class="aalert dng"><span class="ms sm">error</span><div><strong>Analysis Failed</strong><br>${esc(e.message || 'The AI returned an error. Please try again.')}</div></div>`;
  }
}

function qDoseCheck(id) {
  const pt = wardPatients.find(p=>p.id===id);
  if(!pt) return;
  if(!Array.isArray(pt.currentTx) || pt.currentTx.length === 0) {
    toast('No active treatments to check.', 'warn'); return;
  }
  const tx = pt.currentTx.map(t=>`${t.drug||''} ${t.dose||''} ${t.freq||''}`.trim()).filter(Boolean).join(', ');
  if(!tx) { toast('No valid treatments found.', 'warn'); return; }
  toggleAppMode();
  const q = `Patient: ${pt.age || '?'}y ${pt.sex || ''}, weight ${pt.weight || '?'}kg. Current Regimen: ${tx}. Check dose appropriateness. Suggest renal/hepatic adjustments if required based on these vitals and recent labs.`;
  insertAndSend(q);
}

/* ══ PRINT / PDF — REPORT ONLY ══
   Opens a clean print window containing only the patient header and SOAP timeline reports.
   All app chrome (sidebar, nav, buttons, sparklines, file actions) is excluded.
   The print dialog opens automatically; the window closes itself after printing. */
function printSOAP() {
  const pt = activeCaseId ? wardPatients.find(p => p.id === activeCaseId) : null;
  const timelineEl = document.getElementById('pt-timeline');
  if(!timelineEl || !pt) { toast('Open a patient file first.', 'warn'); return; }

  const reports = Array.from(timelineEl.querySelectorAll('.cdss-report'));
  if(!reports.length) { toast('No reports to print.', 'warn'); return; }

  const reportHTML = reports.map(el => el.outerHTML).join('');
  const printDate  = new Date().toLocaleString([], {dateStyle:'medium', timeStyle:'short'});
  const ptName     = esc(pt.name || 'Unknown');
  const ptBed      = esc(pt.bedId || '\u2014');
  const ptInfo     = esc(`${pt.age||'?'}y ${pt.sex||''} \u00B7 ${pt.weight||'?'} kg`);
  const reporter   = esc(uName || '');

  const win = window.open('', '_blank', 'width=900,height=700');
  if(!win) { toast('Pop-up blocked \u2014 allow pop-ups and try again.', 'warn', 5000); return; }

  win.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>PharmAI SOAP Report \u2014 ${ptName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 15mm 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
         font-size: 11px; color: #111; background: #fff; line-height: 1.55; }
  .print-hdr { display: flex; justify-content: space-between; align-items: flex-start;
               padding-bottom: 10px; border-bottom: 2px solid #111; margin-bottom: 18px; }
  .print-hdr-left h1 { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; }
  .print-hdr-left .sub { font-size: 11px; color: #555; margin-top: 3px; }
  .print-hdr-right { text-align: right; font-size: 10px; color: #555; line-height: 1.7; }
  .print-hdr-right strong { color: #111; }
  .cdss-report { border: 1px solid #ccc; border-radius: 6px; padding: 14px;
                 margin-bottom: 22px; page-break-inside: avoid; background: #fff;
                 border-left: 4px solid #333; }
  .rep-hdr { font-size: 12px; font-weight: 800; border-bottom: 1.5px solid #111;
             padding-bottom: 6px; margin-bottom: 10px; color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 10px;
          margin: 8px 0 12px; page-break-inside: auto; }
  th { background: #eee; color: #111; font-weight: 700; padding: 5px 7px;
       border: 1px solid #aaa; text-align: left;
       -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { padding: 5px 7px; border: 1px solid #ccc; color: #111; vertical-align: top; }
  tr:nth-child(even) td { background: #f9f9f9; }
  tr { page-break-inside: avoid; }
  .aalert { border: 1px solid #ccc; background: #f5f5f5; padding: 8px 10px;
            border-radius: 6px; margin-bottom: 6px; color: #111;
            display: flex; flex-direction: column; gap: 2px;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .aalert.dng { border-color: #e88; background: #fff0f0; }
  .aalert.warn { border-color: #e8c060; background: #fffbf0; }
  /* SOAP section badge fallbacks — CSS vars don't resolve in print popup */
  [style*="#6366f1"],[style*="6366f1"] { background-color: #6366f1 !important; }
  [style*="#0ea5e9"],[style*="0ea5e9"] { background-color: #0ea5e9 !important; }
  [style*="#f59e0b"],[style*="f59e0b"] { background-color: #f59e0b !important; }
  [style*="#10b981"],[style*="10b981"] { background-color: #10b981 !important; }
  [style*="var(--ok)"] { color: #10b981 !important; }
  [style*="var(--warn)"] { color: #f59e0b !important; }
  [style*="var(--danger)"] { color: #ef4444 !important; }
  [style*="var(--text)"] { color: #111 !important; }
  [style*="var(--muted)"] { color: #888 !important; }
  button, .ms { display: none !important; }
  ul { padding-left: 16px; }
  li { margin-bottom: 3px; }
  strong { font-weight: 700; }
  .print-footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ccc;
                  font-size: 9px; color: #888; display: flex;
                  justify-content: space-between; }
</style>
</head><body>
  <div class="print-hdr">
    <div class="print-hdr-left">
      <h1>PharmAI \u2014 Pharmacist SOAP Report</h1>
      <div class="sub">${ptName} &nbsp;\u00B7&nbsp; Bed ${ptBed} &nbsp;\u00B7&nbsp; ${ptInfo}</div>
    </div>
    <div class="print-hdr-right">
      <div><strong>Printed:</strong> ${printDate}</div>
      <div><strong>Pharmacist:</strong> ${reporter}</div>
      <div><strong>App:</strong> PharmAI Clinical Assistant</div>
    </div>
  </div>
  ${reportHTML}
  <div class="print-footer">
    <span>PharmAI \u2014 AI-assisted Clinical Decision Support. Verify all findings independently before acting.</span>
    <span>${printDate}</span>
  </div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
</body></html>`);
  win.document.close();
}
