/* ══ WARD DASHBOARD & CDSS LOGIC ══ */
let isWardMode = false;
let wardPatients = [];
let activeTab = 'active';
let cdssTempLabs = [];
let cdssTempTx = [];
let currentWardMode = 'admit';

// ══ WARD MIGRATION (Async with localforage) ══
async function loadWardData() {
  if (!user) return;
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
        const batch = db.batch();
        wardPatients.forEach(pt => {
          batch.set(db.collection('users').doc(user).collection('ward').doc(pt.id.toString()), pt);
        });
        await batch.commit();
        localforage.setItem('pharmai_ward_' + user, wardPatients);
      }
    }
  } catch(e) { console.warn("Failed to load ward data", e); }
}

let wardSaveTimer = null;
function saveWardData() {
  if(!user) return;
  localforage.setItem('pharmai_ward_' + user, wardPatients);
  renderWardList();
  clearTimeout(wardSaveTimer);
  wardSaveTimer = setTimeout(async () => {
    try { 
      const batch = db.batch();
      wardPatients.forEach(pt => {
        batch.set(db.collection('users').doc(user).collection('ward').doc(pt.id.toString()), pt);
      });
      await batch.commit();
    } catch(e) {}
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

  container.innerHTML = filtered.map(p => `
    <div class="pat-card ${p.status}" onclick="openCDSSFile('${p.id}');hap(10);">
      <div class="pc-head">
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-badge">${esc(p.bedId)}</div>
      </div>
      <div class="pc-details">
        <span>${p.age}y ${p.sex}</span>
        <span>${p.weight} kg</span>
        <span>CC: ${esc(p.cc.substring(0, 30))}...</span>
      </div>
    </div>
  `).join('');
}

function clearCDSSForm() {
  const inputs = document.querySelectorAll('#cdss-form .finp');
  inputs.forEach(inp => { if (inp.tagName === 'SELECT') inp.selectedIndex = 0; else inp.value = ''; });
  document.getElementById('w-bmi').textContent = '--'; document.getElementById('w-bmi').style.color = 'var(--t2)';
  document.getElementById('w-preg-fg').style.display = 'none';
  cdssTempLabs = []; cdssTempTx = [];
  renderCDSSLabs(); renderCDSSTx();
}

function calcBMI() {
  const w = parseFloat(document.getElementById('w-wt').value), h = parseFloat(document.getElementById('w-ht').value), bmiEl = document.getElementById('w-bmi');
  if (w && h) { const bmi = (w / ((h/100) * (h/100))).toFixed(1); bmiEl.textContent = bmi + ' kg/m²'; bmiEl.style.color = (bmi < 18.5 || bmi >= 25) ? 'var(--warn)' : 'var(--ok)'; } 
  else { bmiEl.textContent = '--'; bmiEl.style.color = 'var(--t2)'; }
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
}

function closeCDSSWiz() { document.getElementById('cdss-form').classList.remove('open'); }

const cdssLabOpts = {
  hemato: ['Hb (g/dL)', 'RBC (millions/µL)', 'WBC (cells/mm³)', 'Platelets (lakhs/µL)', 'MCV (fL)', 'MCH (pg)', 'MCHC (g/dL)', 'PCV/HCT (%)', 'ESR (mm/hr)', 'Neutrophils (%)', 'Lymphocytes (%)', 'INR', 'aPTT (sec)'],
  biochem: ['Na+ (mEq/L)', 'K+ (mEq/L)', 'Cl- (mEq/L)', 'HCO3- (mEq/L)', 'BUN (mg/dL)', 'Ca2+ (mg/dL)', 'Mg2+ (mg/dL)', 'PO4 (mg/dL)', 'Uric Acid (mg/dL)', 'Albumin (g/dL)', 'Globulin (g/dL)', 'Total Protein (g/dL)', 'RBS (mg/dL)', 'FBS (mg/dL)', 'HbA1c (%)', 'Lactic Acid (mmol/L)', 'Procalcitonin (ng/mL)'],
  cardio: ['Troponin (ng/mL)', 'BNP (pg/mL)', 'PT (sec)']
};

function updLabParams() {
  const sys = document.getElementById('lab-sys').value, paramSelect = document.getElementById('lab-param');
  paramSelect.innerHTML = '<option value="">-- Parameter --</option>';
  if (sys && cdssLabOpts[sys]) cdssLabOpts[sys].forEach(p => { paramSelect.innerHTML += `<option value="${p}">${p}</option>`; });
}

function addLabTag() {
  const param = document.getElementById('lab-param').value, val = document.getElementById('lab-val').value;
  if (!param || !val) { toast('Select a parameter and enter a value.', 'warn'); return; }
  cdssTempLabs.push({ param, val }); document.getElementById('lab-val').value = ''; renderCDSSLabs(); hap(10);
}
function renderCDSSLabs() { document.getElementById('lab-tags').innerHTML = cdssTempLabs.map((l, i) => `<div class="rx-tag">${l.param}: <b>${esc(l.val)}</b> <button class="rx-del" onclick="remLabTag(${i});hap(10);"><span class="ms xs">close</span></button></div>`).join(''); }
function remLabTag(i) { cdssTempLabs.splice(i, 1); renderCDSSLabs(); }

function addTxTag() {
  const drug = document.getElementById('tx-drug').value, dose = document.getElementById('tx-dose').value, freq = document.getElementById('tx-freq').value, route = document.getElementById('tx-route').value;
  if (!drug) { toast('Drug name is required.', 'warn'); return; }
  cdssTempTx.push({ drug, dose, freq, route });
  document.getElementById('tx-drug').value = ''; document.getElementById('tx-dose').value = ''; document.getElementById('tx-freq').value = ''; document.getElementById('tx-route').value = '';
  renderCDSSTx(); hap(10);
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
  activeCaseId = id; const pt = wardPatients.find(p => p.id === id); if(!pt) return;
  document.getElementById('cdss-dash').style.display = 'none'; document.getElementById('cdss-file').classList.add('open');
  document.getElementById('f-pt-name').textContent = pt.name; document.getElementById('f-pt-bed').textContent = pt.bedId;
  
  let sparkHTML = '';
  if (pt.vitalsHistory && pt.vitalsHistory.length > 0) {
    const bps = pt.vitalsHistory.map(v => parseInt(v.bp.split('/')[0])).filter(n => !isNaN(n));
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
  if(pt.status === 'closed') { fa.innerHTML = `<button class="btn-block sec" onclick="reopenCase('${id}')"><span class="ms sm">lock_open</span> Reopen Case</button>`; fa.style.display = 'flex'; } 
  else { fa.innerHTML = `<button class="btn-block sec" onclick="qDoseCheck('${id}')"><span class="ms sm">vaccines</span> Dose Check</button><button class="btn-block sec" onclick="openCDSSWiz('progress');hap(10);"><span class="ms sm">edit_note</span> Add Progress</button><button class="btn-block" onclick="openDischargeModal();hap(10);" style="background:var(--danger); color:#fff; box-shadow:none;"><span class="ms sm">logout</span> Close Case</button>`; fa.style.display = 'flex'; }
}

function reopenCase(id) { const pt = wardPatients.find(p => p.id === id); if(pt) { pt.status = 'active'; saveWardData(); openCDSSFile(id); toast('Case reopened', 'ok'); } }
function closeCDSSFile() { activeCaseId = null; document.getElementById('cdss-file').classList.remove('open'); document.getElementById('cdss-dash').style.display = 'block'; renderWardList(); }
function openDischargeModal() { dcRxList = []; renderDcRx(); document.getElementById('discharge-modal').classList.add('open'); }
function renderDcRx() { document.getElementById('dc-rx-list').innerHTML = dcRxList.map((r,i) => `<div class="rx-tag">${esc(r)}<button class="rx-del" onclick="remDcRx(${i})"><span class="ms xs">close</span></button></div>`).join(''); }
function remDcRx(i) { dcRxList.splice(i, 1); renderDcRx(); }
function addDcRx() { const v = document.getElementById('dc-rx-inp').value.trim(); if(!v) return; dcRxList.push(v); document.getElementById('dc-rx-inp').value = ''; renderDcRx(); }
function processDischarge() { openM('dc-confirm-modal'); }

async function execProcessDischarge() {
  const outcome = document.getElementById('dc-outcome').value, notes = document.getElementById('dc-notes').value, dod = document.getElementById('dc-dod') ? document.getElementById('dc-dod').value : '';
  closeM('dc-confirm-modal'); const btn = document.querySelector('#discharge-modal .btn-block'); const ogText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Finalizing...';
  try {
    let pt = wardPatients.find(p => p.id === activeCaseId); if(pt) pt.status = 'closed';
    if(outcome === 'discharge' && dcRxList.length > 0) {
      const lang = document.getElementById('dc-lang').value;
      const payload = { discharge_medications: dcRxList, clinical_notes: notes, dod: dod, patient_context: { social_history: pt?.hist?.soc, allergies: pt?.hist?.alg, age: pt?.demo?.age, sex: pt?.demo?.sex } };
      closeM('discharge-modal'); await callCDSSAI(payload, 'discharge', lang);
    } else {
      if(pt) { pt.htmlTimeline = pt.htmlTimeline || ''; pt.htmlTimeline = `<div class="cdss-report" style="border-left:4px solid var(--t2)"><div class="rep-hdr">Case Closed: ${outcome.toUpperCase()} ${dod ? `<span style="float:right; color:var(--text); font-size:0.85rem;">DOD: ${dod}</span>` : ''}</div><p>${esc(notes)}</p></div>` + pt.htmlTimeline; }
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
  const r = `**PvPI Adverse Drug Reaction Report**\nDate: ${new Date().toLocaleDateString()}\nPatient: ${ptInfo}\nSuspected Drug: ${drug}\nOnset Date: ${document.getElementById('adr-date').value}\nReaction Description: ${desc}\nAction Taken: ${document.getElementById('adr-action').value}\nReporter: ${uName} (Clinical Pharmacist)`;
  navigator.clipboard.writeText(r).then(() => { toast('Report Copied to Clipboard!', 'ok'); closeM('adr-modal'); });
}

async function genCarePlan() {
  const isUpdate = (currentWardMode === 'progress'); let pt = activeCaseId ? wardPatients.find(p => p.id === activeCaseId) : null;
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

  let age = parseFloat(payload.demographics.age), wt = parseFloat(payload.demographics.wt), scr = parseFloat(payload.labs.anchors.scr), sex = payload.demographics.sex;
  if (!isNaN(age) && !isNaN(wt) && !isNaN(scr) && scr > 0) {
    let crcl = ((140 - age) * wt) / (72 * scr); if (sex === 'F') crcl *= 0.85;
    payload.labs.calculated_CrCl = crcl.toFixed(1) + " mL/min";
  }
  if(isUpdate && pt && pt.demo && pt.demo.doa) { payload.demographics.doa = pt.demo.doa; }

  const btn = document.getElementById('btn-gen-plan'); const ogText = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Analyzing...';

  try {
    if(!isUpdate && !activeCaseId) {
      activeCaseId = 'PT-' + Date.now();
      pt = { id: activeCaseId, status: 'active', name: payload.demographics.name || 'Unknown', bedId: payload.demographics.id || 'TBD', age: payload.demographics.age, sex: payload.demographics.sex, weight: payload.demographics.wt, cc: payload.history.dx || payload.history.cc || 'No complaints', htmlTimeline: '', currentTx: cdssTempTx, demo: payload.demographics, hist: payload.history, vitalsHistory: [] };
      wardPatients.unshift(pt);
    } else if (pt) { pt.currentTx = cdssTempTx; }
    
    if(payload.vitals && (payload.vitals.bp || payload.vitals.hr)) { 
      pt.vitalsHistory = pt.vitalsHistory || [];
      pt.vitalsHistory.push({ date: new Date().toISOString(), bp: payload.vitals.bp, hr: payload.vitals.hr }); 
    }
    saveWardData(); 
  } catch(e) { console.error("Save Error:", e); toast('Failed to save patient data.', 'err'); btn.disabled = false; btn.innerHTML = ogText; return; }
  
  btn.disabled = false; btn.innerHTML = ogText;
  closeCDSSWiz(); openCDSSFile(activeCaseId);
  await callCDSSAI(payload, isUpdate ? 'progress' : 'baseline');
}

async function callCDSSAI(payload, mode, lang = 'English') {
  if(!groqKey) { toast('API key not configured.', 'err'); return; }
  const pt = wardPatients.find(p => p.id === activeCaseId); if(pt) pt.htmlTimeline = pt.htmlTimeline || '';

  let sysPrompt = "";
  if (mode === 'baseline' || mode === 'progress') {
    sysPrompt = `You are PharmAI, an elite Senior Clinical Pharmacist. Perform a rigorous, multi-variable Comprehensive Medication Review (CMR).
UNIVERSAL CLINICAL RULES:
1. CUMULATIVE TOXICITY: Explicitly calculate and flag Anticholinergic burden, Serotonin Syndrome risk, combined CNS depression, QTc prolongation, and stacked bleeding risks. IF multiple agents stack risk, trigger "Polypharmacy / Cumulative Risk".
2. RENAL/HEPATIC: The calculated CrCl has been pre-computed and is provided in the payload as 'calculated_CrCl'. Use ONLY this value for all renal dosing assessments.
3. PHARMACOKINETICS: Scan for enzyme inhibitors/inducers interacting with NTI drugs.
4. DRUG-DISEASE: Cross-reference all medications against active PMH, Diagnoses, AND Social History.
5. ALLERGIES: Categorize known allergies strictly as "Contraindication" (Severity: Critical).
6. NTI DRUGS: If ANY narrow therapeutic index drug is present ALWAYS flag in the monitoring column.
7. WEIGHT-BASED DOSING: Verify that the prescribed dose is appropriate for the patient's actual body weight.

Sort all drug_related_problems in descending severity order: Critical first, then High, then Moderate, then Low.

Output ONLY valid JSON matching this exact structure:
{
  "patient_demographics_history": "Exact demographics, DOA, diagnosis, chief complaints, social history, and PMH. Highlight Red Flags.",
  "baseline_vitals_labs": "Exact baseline vitals and labs. Explicitly state the calculated CrCl and evaluate hemodynamic stability.",
  "current_therapy": [ { "drug": "Name", "dose": "Dose", "freq": "Freq", "indication": "Inferred Indication", "moa": "Brief MOA", "monitoring": "Params", "side_effects": "Key SEs" } ],
  "clinical_correlations": ["Correlate symptoms/labs with medications."],
  "drug_related_problems": [ { "category": "Contraindication | Drug-Drug Interaction | Drug-Disease Interaction | Dosing Error | Polypharmacy | Adverse Effect", "issue": "Specific clinical description", "severity": "Critical | High | Moderate | Low", "actionable_solution": "Precise clinical intervention" } ],
  "pharmacist_interventions": ["Specific steps addressing the DRPs."],
  "references": ["Cite specific guidelines"]
}`;
  } else if (mode === 'discharge') {
    sysPrompt = `You are an elite Patient Educator and Geriatric Care Specialist. Generate a highly specific, actionable discharge counseling card.
CRITICAL DIRECTIVES:
1. 5TH-GRADE READING LEVEL: Use short, direct sentences in ${lang}. Use active voice.
2. HYPER-SPECIFIC ADVICE: Specify EXACTLY how to take the drug.
3. CONTEXTUALIZE: You MUST explicitly address any lifestyle/dietary factors mentioned in the patient's Social History.
4. RED FLAGS: Clearly list severe symptoms requiring immediate attention.
5. CULTURAL CONTEXT: When outputting in Hindi/Gujarati, use culturally relevant Indian dietary examples (e.g. palak for Vit K).
6. OUTPUT STRICT JSON ONLY.

Output ONLY valid JSON matching this exact structure:
{
  "title": "Discharge Instructions",
  "diagnosis_simple": "A clear layman explanation.",
  "medications": [ { "name": "Medicine Name", "purpose": "Why you are taking this", "schedule": "Exact time/instructions", "warnings": "Specific side effects or diet interactions" } ],
  "lifestyle_and_diet": ["Actionable, patient-specific diet/lifestyle rule #1"],
  "when_to_call_doctor": ["Specific red flag symptom #1"]
}`;
  }

  const loaderId = 'load-' + Date.now();
  document.getElementById('pt-timeline').innerHTML = `<div id="${loaderId}" class="cdss-report"><span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> ${mode === 'discharge' ? 'Generating Patient Instructions...' : 'PharmAI is performing a CMR...'}</div>` + document.getElementById('pt-timeline').innerHTML;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({ model: GROQ_MODEL, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: JSON.stringify(payload) }], temperature: 0.1, max_tokens: mode === 'discharge' ? 2000 : 3000, response_format: { type: 'json_object' } })
    });
    const data = await res.json();
    let rawContent = data.choices[0].message.content.trim().replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/g, '').trim();
    const result = JSON.parse(rawContent);

    if(Array.isArray(result.drug_related_problems)) {
      const sevOrder = { 'Critical': 1, 'High': 2, 'Moderate': 3, 'Low': 4 };
      result.drug_related_problems.sort((a,b) => (sevOrder[a.severity] || 99) - (sevOrder[b.severity] || 99));
    }
    
    document.getElementById(loaderId).remove();
    let html = '';
    const dodDisplay = payload.dod ? `<span style="float:right; color:var(--text); font-size:0.85rem; font-weight:600;">DOD: ${payload.dod}</span>` : '';
    const doaDisplay = payload.demographics && payload.demographics.doa ? `<span style="float:right; color:var(--text); font-size:0.85rem; font-weight:600;">DOA: ${payload.demographics.doa}</span>` : '';

    if(mode === 'discharge') {
      html = `<div class="cdss-report" style="border-left:4px solid var(--ok); background:rgba(16,185,129,0.05);">
        <div class="rep-hdr" style="color:var(--ok)"><span class="ms sm">home</span> ${result.title} (${lang}) ${dodDisplay}</div>
        <p style="margin-bottom:15px; line-height:1.6;"><strong>Overview:</strong> ${result.diagnosis_simple}</p>
        <div style="font-weight:700; color:var(--ok); margin-bottom:8px;"><span class="ms sm">medication</span> Your Medications</div>
        <div style="width:100%; overflow-x:auto; margin-bottom:15px; border-radius:8px; border:1px solid var(--b);">
          <table class="rep-tbl" style="min-width: 600px; margin:0;"><tr><th>Medicine</th><th>Purpose</th><th>How to Take</th><th>Specific Warnings</th></tr>
          ${(result.medications||[]).map(m => `<tr><td><strong>${m.name||'-'}</strong></td><td>${m.purpose||'-'}</td><td>${m.schedule||'-'}</td><td>${m.warnings||'-'}</td></tr>`).join('')}</table>
        </div>
        <div style="margin-top:15px;">
          <div style="font-weight:700; color:var(--text); margin-bottom:8px;"><span class="ms sm">restaurant_menu</span> Diet & Lifestyle</div>
          <ul style="font-size:0.85rem; margin-left:20px; margin-bottom:15px;">${(result.lifestyle_and_diet||[]).map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
        <div style="margin-top:15px; padding-top:15px; border-top: 1px solid var(--b);">
          <div style="font-weight:700; color:var(--danger); margin-bottom:8px;"><span class="ms sm">warning</span> When to Call the Doctor</div>
          <ul style="font-size:0.85rem; margin-left:20px;">${(result.when_to_call_doctor||[]).map(w => `<li>${w}</li>`).join('')}</ul>
        </div>
      </div>`;
    } else {
      const hasDRPs = Array.isArray(result.drug_related_problems) && result.drug_related_problems.length > 0;
      let drpHtml = '';
      if(hasDRPs) {
        drpHtml = `<div style="margin-top:15px; border-top: 1px solid var(--b); padding-top: 15px;">
          <div style="color:var(--danger); font-weight:700; margin-bottom:8px;"><span class="ms sm">warning</span> Drug-Related Problems (DRPs)</div>
          ${result.drug_related_problems.map(drp => {
            let badgeClass = drp.severity === 'Critical' || drp.severity === 'High' ? 'dng' : 'warn';
            let badgeText = drp.severity ? drp.severity.toUpperCase() : 'UNKNOWN';
            return `<div class="aalert ${badgeClass}" style="margin-bottom:8px; flex-direction:column;">
              <div style="font-weight:700; text-transform:uppercase; font-size:0.7rem;">${drp.category || 'Issue'} [${badgeText} RISK]</div>
              <div style="margin:4px 0; color:var(--text);"><strong>Issue:</strong> ${drp.issue || '-'}</div>
              <div style="color:var(--text);"><strong>Intervention:</strong> ${drp.actionable_solution || '-'}</div>
            </div>`}).join('')}
        </div>`;
      }
      const currentTherapyHtml = Array.isArray(result.current_therapy) && result.current_therapy.length > 0 ? 
        result.current_therapy.map(c => `<tr><td><strong>${c.drug || '-'}</strong></td><td>${c.dose || '-'}</td><td>${c.freq || '-'}</td><td>${c.indication || '-'}</td><td>${c.moa || '-'}</td><td>${c.monitoring || '-'}</td><td>${c.side_effects || '-'}</td></tr>`).join('') 
        : '<tr><td colspan="7" style="text-align:center;">No current therapy active.</td></tr>';
      const correlationsHtml = Array.isArray(result.clinical_correlations) && result.clinical_correlations.length > 0 ?
        `<div style="font-size:0.85rem; color:var(--text); margin-bottom:12px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;"><strong>Clinical Correlations:</strong><ul style="margin:5px 0 0 20px;">${result.clinical_correlations.map(c=>`<li>${c}</li>`).join('')}</ul></div>` : '';

      html = `<div class="cdss-report">
        <div class="rep-hdr">${mode === 'baseline' ? 'Admission CMR Report' : 'Daily Progress CMR'} - ${new Date().toLocaleDateString()} at ${ts()} ${doaDisplay}</div>
        <div style="font-size:0.85rem; color:var(--text); margin-bottom:12px; line-height: 1.5;">
          <strong>Demographics & History:</strong> ${result.patient_demographics_history || 'Not provided.'}<br><br>
          <strong>Baseline Vitals & Labs:</strong> ${result.baseline_vitals_labs || 'Not provided.'}
        </div>
        <div style="font-weight:700; color:var(--text); margin-bottom:8px;"><span class="ms sm">medication</span> Current Therapy Assessment</div>
        <div style="width:100%; overflow-x:auto; margin-bottom:15px; border-radius:8px; border:1px solid var(--b);">
          <table class="rep-tbl" style="min-width: 800px; margin:0;">
            <tr><th>Drug</th><th>Dose</th><th>Freq</th><th>Indication</th><th>MOA</th><th>Monitoring</th><th>Side Effects</th></tr>
            ${currentTherapyHtml}
          </table>
        </div>
        ${correlationsHtml} ${drpHtml}
        <div style="margin-top:15px; padding-top:15px; border-top: 1px solid var(--b);">
           <div style="font-weight:700; color:var(--ok); margin-bottom:8px;"><span class="ms sm">check_circle</span> Pharmacist Interventions</div>
           <ul style="font-size:0.85rem; margin-left:20px;">${(result.pharmacist_interventions||['No interventions required at this time.']).map(i=>`<li>${i}</li>`).join('')}</ul>
        </div>
        <div style="margin-top:15px; font-size:0.7rem; color:var(--muted); border-top: 1px dashed var(--b); padding-top:10px;">
          <strong>Evidence-Based References:</strong><br>${(result.references||[]).join('<br>')}
        </div>
      </div>`;
    }
    if(pt) { pt.htmlTimeline = html + pt.htmlTimeline; saveWardData(); openCDSSFile(activeCaseId); }
  } catch(e) { document.getElementById(loaderId).innerHTML = `<div class="aalert dng"><span class="ms sm">error</span><div><strong>Analysis Failed</strong><br>The AI returned improperly formatted data. Please try generating the plan again.</div></div>`; }
}
function qDoseCheck(id) {
  const pt = wardPatients.find(p=>p.id===id);
  if(!pt) return;
  const tx = pt.currentTx.map(t=>`${t.drug} ${t.dose} ${t.freq}`).join(', ');
  if(!tx) { toast('No active treatments to check.', 'warn'); return; }
  toggleAppMode();
  const q = `Patient: ${pt.age}y ${pt.sex}, weight ${pt.weight}kg. Current Regimen: ${tx}. Check dose appropriateness. Suggest renal/hepatic adjustments if required.`;
  insertAndSend(q);
}