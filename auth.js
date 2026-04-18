'use strict';

/* ══ FIREBASE INIT ══ */
const firebaseConfig = {
  apiKey: "AIzaSyAe1xX20eBj2Zb5HVZR3jsh7Aa1fp-mu_A",
  authDomain: "pharmai-38907.firebaseapp.com",
  projectId: "pharmai-38907",
  storageBucket: "pharmai-38907.firebasestorage.app",
  messagingSenderId: "1052723358649",
  appId: "1:1052723358649:web:612e0220af490ff6982468"
};

// Check prevents duplicate initialization
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

/* Await persistence before registering the auth state observer.
   Not awaiting caused the observer to never fire (Firebase buffers
   state changes until persistence is confirmed). */
(async () => {
  try {
    await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  } catch(e) {
    console.warn('setPersistence failed:', e);
  }

  auth.onAuthStateChanged(async(fbUser)=>{
    const loading_el=document.getElementById('auth-loading');
    
    if(fbUser){
      /* If the user has no display name (New Email Sign-up OR Guest), ask for it */
      if(!fbUser.displayName || fbUser.displayName.trim() === ''){
        _pendingFBUser=fbUser;
        loading_el.style.display='none';
        document.getElementById('lp').style.display='flex';
        document.getElementById('auth-step').style.display='none';
        document.getElementById('name-step').style.display='block';
        setTimeout(()=>document.getElementById('display-name').focus(),300);
        return;
      }
      
      /* Returning users with a saved name skip the dialog */
      loading_el.style.display='none';
      await enterApp(fbUser);
    } else {
      /* 🚨 FIRES IF USER LOGS OUT OR CLEARS BROWSER SITE DATA 🚨 */
      // 1. Wipe all sensitive data from active memory (variables exist in app.js)
      user=null; uName=''; groqKey=''; hist=[]; sessions=[]; currSess=null; wardPatients=[];
      
      // 2. Hide the app and show the login screen safely
      loading_el.style.display='none';
      document.getElementById('ap').style.display='none';
      document.getElementById('lp').style.display='flex';
      document.getElementById('auth-step').style.display='block';
      document.getElementById('name-step').style.display='none';
      setLoginLoading(false);
    }
  });
})();

/* ══ IDLE TIMEOUT — auto-logout after 30 min of inactivity ══ */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let _idleTimer = null;

function _resetIdleTimer() {
  clearTimeout(_idleTimer);
  if (!auth.currentUser) return;
  _idleTimer = setTimeout(async () => {
    if (auth.currentUser) {
      toast('Session expired due to inactivity.', 'warn', 6000);
      await doLogout();
    }
  }, IDLE_TIMEOUT_MS);
}

['mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
  document.addEventListener(evt, _resetIdleTimer, { passive: true });
});

let _enteringApp = false;

async function fsWrite(fn, label='') {
  try { await fn(); } catch(e) {
    if(e.code === 'unavailable') toast('Offline — changes saved locally.', 'warn');
    else toast(`Save failed: ${label}`, 'err');
  }
}

function clearErr(){document.getElementById('lerr').style.display='none';}
function showErr(msg){document.getElementById('err-text').innerText=msg;document.getElementById('lerr').style.display='flex';hap(40);}

function setLoginLoading(on) {
  const lb = document.getElementById('lbtn');
  const sb = document.getElementById('sbtn2');
  const gb = document.getElementById('google-btn');
  const guestB = document.getElementById('guest-btn');
  if(lb) {
      lb.disabled = on;
      lb.innerHTML = on ? '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Signing in...' : '<span class="ms sm">login</span> Sign In';
  }
  if(sb) sb.disabled = on;
  if(gb) gb.disabled = on;
  if(guestB) guestB.disabled = on;
}

function doLogin(){
  const email=document.getElementById('uname').value.trim();
  const pass=document.getElementById('ac').value.trim();
  if(!email){showErr('Please enter your email address.');return;}
  if(!pass){showErr('Please enter your password.');return;}
  setLoginLoading(true);
  auth.signInWithEmailAndPassword(email,pass).then(()=>{ Sounds.play('tick'); }).catch(e=>{
    setLoginLoading(false);
    const msgs={'auth/user-not-found':'No account found.','auth/wrong-password':'Incorrect password.'};
    showErr(msgs[e.code]||e.message);
  });
}

async function doSignUp(){
  const email=document.getElementById('uname').value.trim();
  const pass=document.getElementById('ac').value.trim();
  if(!email || !pass || pass.length<6){showErr('Valid email and 6+ char password required.');return;}
  
  setLoginLoading(true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    _pendingFBUser = cred.user;
    // Force transition immediately
    document.getElementById('auth-step').style.display = 'none';
    document.getElementById('name-step').style.display = 'block';
  } catch(e) {
    setLoginLoading(false);
    showErr(e.message);
  }
}

function signInWithGoogle(){
  setLoginLoading(true);
  const provider=new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e=>{
    setLoginLoading(false);
    showErr(e.message);
  });
}

async function signInAsGuest(){
  setLoginLoading(true);
  try {
    const cred = await auth.signInAnonymously();
    _pendingFBUser = cred.user;
    // Force transition immediately so Guest always sees name dialog
    document.getElementById('auth-step').style.display = 'none';
    document.getElementById('name-step').style.display = 'block';
  } catch(e) {
    setLoginLoading(false);
    showErr('Guest sign-in failed: ' + e.message);
  }
}

function forgotPassword(){
  const email=document.getElementById('uname').value.trim();
  if(!email){showErr('Please enter your email address above first.');return;}
  auth.sendPasswordResetEmail(email).then(()=>{toast('Reset email sent!','ok',5000);}).catch(e=>showErr(e.message));
}

async function saveName(){
  const name=document.getElementById('display-name').value.trim();
  const nerr=document.getElementById('name-err');
  if(!name){nerr.style.display='flex';return;}
  nerr.style.display='none';
  
  const fbUser=_pendingFBUser||auth.currentUser;
  if(!fbUser)return;
  
  try{
    await fbUser.updateProfile({displayName:name});
    // Save permanently for standard users, skip database bloat for guests
    if (!fbUser.isAnonymous) {
        await db.collection('users').doc(fbUser.uid).set({ name: name }, { merge: true });
    }
    
    _pendingFBUser=null;
    document.getElementById('lp').style.display='none';
    await enterApp(fbUser);
  } catch(e) {
    nerr.style.display='flex';
  }
}

async function enterApp(fbUser){
  if(_enteringApp) return;
  _enteringApp = true;
  try {
    user=fbUser.uid;
    uName=fbUser.displayName||(fbUser.email?fbUser.email.split('@')[0]:'Guest');
    try{
      const cfg=await db.collection('config').doc('keys').get();
      if(cfg.exists)groqKey=cfg.data().groq||'';
    }catch(e){
      const localKey = await localforage.getItem('pgroq');
      groqKey = localKey || '';
    }

    document.getElementById('ap').style.display='flex';
    document.getElementById('lp').style.display='none';
    const init=uName.charAt(0).toUpperCase();
    document.getElementById('hpc').textContent=init;
    document.getElementById('sbpc').textContent=init;
    document.getElementById('sbnm').textContent=uName;
    const provider=fbUser.isAnonymous?'Guest Session':(fbUser.providerData[0]?.providerId==='google.com'?'Google Account':fbUser.email);
    document.getElementById('sui').textContent=uName+' · '+provider;
    _resetIdleTimer();
    applyUI();
    await loadSettingsFromFirestore();
    if(!fbUser.isAnonymous){
      await loadWardData();
      await loadSessions();
    }
    await loadDemoUsage();
    applyGuestUI(fbUser.isAnonymous);
    _enteringApp = false;
    newChat();
    checkOnboarding();
  } catch(err) { _enteringApp = false; console.error('enterApp error:', err); }
}

function applyGuestUI(isGuest) {
  const label  = document.getElementById('si-delete-label');
  const desc   = document.getElementById('si-delete-desc');
  const btn    = document.getElementById('si-delete-btn');
  const exportBtn = document.querySelector('.bkbtn.exp');
  if(!label) return;
  if(isGuest) {
    label.textContent = 'Create a Full Account';
    label.style.color = 'var(--ok)';
    desc.textContent  = 'Your data is not saved — sign up to keep it.';
    btn.textContent   = 'Sign Up';
    btn.style.background = 'var(--ok)';
    btn.style.color = '#fff';
    btn.onclick = () => { closeM('sm'); doLogout(); };
    if(exportBtn) exportBtn.style.display = 'none';
  } else {
    label.textContent = 'Delete Account';
    label.style.color = 'var(--danger)';
    desc.textContent  = 'Permanently deletes your account & all data';
    btn.textContent   = 'Delete';
    btn.style.background = '';
    btn.style.color = '';
    btn.onclick = deleteAccount;
    if(exportBtn) exportBtn.style.display = '';
  }
}

async function doLogout(){
  clearTimeout(_idleTimer);
  const _currentFBUser = auth.currentUser;
  const _uid = user;
  
  /* 1. Delete Guest Accounts on Logout */
  if(_currentFBUser && _currentFBUser.isAnonymous){
    try { await _currentFBUser.delete(); } catch(e) { console.warn('Delete failed',e); }
  }
  
  /* 2. ALWAYS sign out to sever the session */
  try { await auth.signOut(); } catch(e) {}
  
  /* 3. Reset UI Forms so next user doesn't see old data */
  const nameInp = document.getElementById('display-name');
  const emailInp = document.getElementById('uname');
  const passInp = document.getElementById('ac');
  if (nameInp) nameInp.value = '';
  if (emailInp) emailInp.value = '';
  if (passInp) passInp.value = '';
  
  if(_uid) {
    await localforage.removeItem('pharmai_ward_' + _uid);
    await localforage.removeItem('psess_' + _uid);
  }
  await localforage.removeItem('pgroq');
  
  closeM('sm');
  hap(10);
}

async function deleteAccount(){
  if(!confirm('Permanently delete your account and all data? This cannot be undone.'))return;
  try{
    if(user){ 
      const wardDocs = await db.collection('users').doc(user).collection('ward').get();
      const sDocs = await db.collection('users').doc(user).collection('sessions').get();
      const batch = db.batch();
      wardDocs.forEach(doc => batch.delete(doc.ref));
      sDocs.forEach(doc => batch.delete(doc.ref));
      batch.delete(db.collection('users').doc(user));
      await batch.commit();
    }
    const uid = user;
    const fbUser=auth.currentUser;
    if(fbUser)await fbUser.delete();
    if(uid){ await localforage.removeItem('pharmai_ward_'+uid); await localforage.removeItem('psess_'+uid); }
    await localforage.removeItem('pgroq');
    toast('Account deleted.','info');
    closeM('sm');
  }catch(e){
    if(e.code==='auth/requires-recent-login'){toast('Please log out and sign in again before deleting.','warn',5000);}
    else toast('Delete failed: '+e.message,'err');
  }
}
