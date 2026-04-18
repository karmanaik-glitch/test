/* ══ ALL 12 CALCULATORS — FIXED ══ */

/* CKD-EPI 2021 (race-free) — Reference: Inker LA et al. NEJM 2021; 385:1737-1749 */
function calcCKD(){
  const a=+document.getElementById('ckd-age').value,
        s=+document.getElementById('ckd-scr').value,
        sex=document.getElementById('ckd-sex').value,
        el=document.getElementById('r-ckd');
  if(!a||!s||!sex){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const k=sex==='F'?0.7:0.9;
  const al=sex==='F'?-0.241:-0.302;
  const m=Math.min(s/k,1);
  const mx=Math.max(s/k,1);
  let e=142*Math.pow(m,al)*Math.pow(mx,-1.200)*Math.pow(0.9938,a);
  if(sex==='F')e*=1.012;
  let stage='',stageColor='';
  if(e>=90){stage='G1 (Normal/High)';stageColor='var(--ok)';}
  else if(e>=60){stage='G2 (Mildly \u2193)';stageColor='var(--ok)';}
  else if(e>=45){stage='G3a (Mildly-Moderately \u2193)';stageColor='var(--warn)';}
  else if(e>=30){stage='G3b (Moderately-Severely \u2193)';stageColor='var(--warn)';}
  else if(e>=15){stage='G4 (Severely \u2193)';stageColor='var(--danger)';}
  else{stage='G5 (Kidney Failure)';stageColor='var(--danger)';}
  el.style.color=stageColor;
  el.innerHTML=`eGFR: ${e.toFixed(1)} mL/min/1.73m\u00B2<br><small style="font-size:0.72rem;opacity:0.85">Stage ${stage} &bull; CKD-EPI 2021</small>`;
}

function calcCrCl(){
  const a=+document.getElementById('c-age').value,
        w=+document.getElementById('c-wt').value,
        s=+document.getElementById('c-scr').value,
        sex=document.getElementById('c-sex').value,
        el=document.getElementById('r-crcl');
  if(!a||!w||!s||!sex){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  let v=((140-a)*w)/(72*s);
  if(sex==='F')v*=.85;
  v=Math.max(0,v);
  let stage='';
  if(v>=60)stage='Normal';
  else if(v>=30)stage='Moderate impairment';
  else stage='Severe impairment \u2014 dose-adjust renally cleared drugs';
  el.style.color=v>=60?'var(--ok)':v>=30?'var(--warn)':'var(--danger)';
  el.innerHTML=`${v.toFixed(1)} mL/min<br><small style="font-size:0.72rem;opacity:0.85">${stage}</small>`;
}

function calcPed(){
  const w=+document.getElementById('p-wt').value,
        d=+document.getElementById('p-dose').value,
        el=document.getElementById('r-ped');
  if(!w||!d){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  el.style.color='var(--ok)';
  el.textContent=`${(w*d).toFixed(2)} mg total dose`;
}

function calcBSA(){
  const h=+document.getElementById('bsa-ht').value,
        w=+document.getElementById('bsa-wt').value,
        el=document.getElementById('r-bsa');
  if(!h||!w){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  el.style.color='var(--ok)';
  el.textContent=`${Math.sqrt((h*w)/3600).toFixed(2)} m\u00B2`;
}

function calcIBW(){
  const h=+document.getElementById('ibw-ht').value,
        aw=+document.getElementById('ibw-wt').value,
        sex=document.getElementById('ibw-sex').value,
        el=document.getElementById('r-ibw');
  if(!h||!aw||!sex){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const hi=h/2.54;
  const ibw=sex==='M'?50+2.3*(hi-60):45.5+2.3*(hi-60);
  const ibwClamped=Math.max(0,ibw);
  const abw=aw>ibwClamped?ibwClamped+0.4*(aw-ibwClamped):aw;
  el.style.color='var(--ok)';
  el.innerHTML=`IBW: ${ibwClamped.toFixed(1)} kg &bull; ABW: ${abw.toFixed(1)} kg<br><small style="font-size:0.72rem;opacity:0.85">Devine formula &bull; Height entered in cm</small>`;
}

function calcCa(){
  const ca=+document.getElementById('ca-ca').value,
        alb=+document.getElementById('ca-alb').value,
        el=document.getElementById('r-ca');
  if(!ca||!alb){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const corr=ca+0.8*(4.0-alb);
  el.style.color=corr>=8.5&&corr<=10.5?'var(--ok)':corr<8.5?'var(--warn)':'var(--danger)';
  el.textContent=`Corrected Ca: ${corr.toFixed(2)} mg/dL`;
}

function calcCP(){
  const bil=+document.getElementById('cp-bil').value,
        alb=+document.getElementById('cp-alb').value,
        inr=+document.getElementById('cp-inr').value,
        asc=+document.getElementById('cp-asc').value,
        enc=+document.getElementById('cp-enc').value,
        el=document.getElementById('r-cp');
  if(!bil||!alb||!inr||!asc||!enc){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  let sc=0;
  sc+=bil<2?1:bil<=3?2:3;
  sc+=alb>3.5?1:alb>=2.8?2:3;
  sc+=inr<1.7?1:inr<=2.3?2:3;
  sc+=+asc;sc+=+enc;
  const cls=sc<=6?'A (5\u20136)':sc<=9?'B (7\u20139)':'C (10\u201315)';
  el.style.color=sc<=6?'var(--ok)':sc<=9?'var(--warn)':'var(--danger)';
  el.textContent=`Score: ${sc} \u2014 Class ${cls}`;
}

function calcOp(){
  const fr=+document.getElementById('op-from').value,
        dose=+document.getElementById('op-dose').value,
        to=+document.getElementById('op-to').value,
        el=document.getElementById('r-op');
  if(!fr||!dose||!to){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const raw=(dose*fr)/to;
  el.style.color='var(--warn)';
  el.innerHTML=`Equiv: ${raw.toFixed(2)} mg<br><small style="font-size:0.75rem;color:var(--muted)">After 25% reduction: ${(raw*.75).toFixed(2)} mg</small>`;
}

/* FIX #11: MELD-Na — Na-clamp warning when input is outside 125-137 */
function calcMELD(){
  const b=+document.getElementById('meld-bil').value,
        i=+document.getElementById('meld-inr').value,
        s=+document.getElementById('meld-scr').value,
        n=+document.getElementById('meld-na').value,
        el=document.getElementById('r-meld');
  if(!b||!i||!s||!n){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const sc=Math.max(1,s),bc=Math.max(1,b),ic=Math.max(1,i);
  let m=3.78*Math.log(bc)+11.2*Math.log(ic)+9.57*Math.log(sc)+6.43;
  m=Math.round(m);
  const naC=Math.max(125,Math.min(n,137));
  /* FIX: Show warning when Na is out of the UNOS formula range */
  const naClampNote=(n<125||n>137)
    ?`<br><small style="color:var(--warn);font-size:0.7rem">&#9888; Na clamped to ${naC} mEq/L (UNOS formula range: 125\u2013137 mEq/L)</small>`
    :'';
  if(m>11){m=m+1.32*(137-naC)-(0.033*m*(137-naC));}
  el.style.color='var(--warn)';
  el.innerHTML=`MELD-Na Score: ${Math.round(m)}${naClampNote}`;
}

function calcVanc(){
  const d=+document.getElementById('vanc-dose').value,
        c=+document.getElementById('vanc-crcl').value,
        el=document.getElementById('r-vanc');
  if(!d||!c){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const clVanc=(c*0.06)*0.8;
  const auc=d/clVanc;
  el.style.color=auc>=400&&auc<=600?'var(--ok)':'var(--warn)';
  el.innerHTML=`Est. AUC24: ${Math.round(auc)} mg\u00B7h/L
    <br><small style="color:var(--muted);font-size:0.7rem">Target: 400-600 &bull; Simplified estimate only</small>
    <br><small style="color:var(--danger);font-size:0.68rem">&#9888; ASHP/IDSA 2020: Use Bayesian tool or two-level AUC monitoring for clinical decisions. Do not dose-adjust solely from this result.</small>`;
}

function calcPheny(){
  const o=+document.getElementById('ph-obs').value,
        a=+document.getElementById('ph-alb').value,
        el=document.getElementById('r-pheny');
  if(!o||!a){el.style.color='var(--danger)';el.textContent='Fill all fields.';return;}
  const c=o/((0.2*a)+0.1);
  el.style.color='var(--warn)';
  el.innerHTML=`Corrected: ${c.toFixed(1)} mcg/mL`;
}

function calcCurb(){
  let s=0;
  if(document.getElementById('cb-c').checked)s++;
  if(document.getElementById('cb-u').checked)s++;
  if(document.getElementById('cb-r').checked)s++;
  if(document.getElementById('cb-b').checked)s++;
  if(document.getElementById('cb-65').checked)s++;
  const el=document.getElementById('r-curb');
  el.style.color=s<=1?'var(--ok)':s===2?'var(--warn)':'var(--danger)';
  const m=s<=1?'Low risk \u2014 Outpatient':s===2?'Moderate risk \u2014 Consider Ward':'High risk \u2014 Consider ICU';
  el.textContent=`Score: ${s} \u2014 ${m}`;
}

/* FIX #6: Wells — removed dead `risk` variable; consistent label & colour for all three tiers */
function calcWells(){
  let s=0;
  document.querySelectorAll('.w-chk').forEach(c=>{if(c.checked)s++;});
  const alt=document.getElementById('w-alt');
  if(alt&&alt.checked)s-=2;
  const el=document.getElementById('r-wells');
  /* Single source of truth — no dead variable */
  const label=s>=3?'High':s>=2?'Moderate':'Low';
  const color=s>=3?'var(--danger)':s>=2?'var(--warn)':'var(--ok)';
  el.style.color=color;
  el.innerHTML=`Score: ${s} \u2014 ${s>=2
    ?`<strong>${label} probability DVT</strong>`
    :'Low probability DVT'}
    <br><small style="font-size:0.72rem;opacity:0.85">${s>=2
      ?'Consider duplex ultrasound &bull; D-dimer alone insufficient'
      :'D-dimer alone may be sufficient to rule out'}</small>`;
}
