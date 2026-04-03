/* ══ FIREBASE INIT ══ */
const firebaseConfig={apiKey:"AIzaSyAe1xX20eBj2Zb5HVZR3jsh7Aa1fp-mu_A",authDomain:"pharmai-38907.firebaseapp.com",projectId:"pharmai-38907",storageBucket:"pharmai-38907.firebasestorage.app",messagingSenderId:"1052723358649",appId:"1:1052723358649:web:612e0220af490ff6982468"};
firebase.initializeApp(firebaseConfig);
const auth=firebase.auth();
const db=firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

async function fsWrite(fn, label='') {
  try { await fn(); } catch(e) {
    console.error(`Firestore write failed (${label}):`, e);
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
  if(lb) {
      lb.disabled = on;
      lb.innerHTML = on ? '<span class="ms sm" style="animation:spin 1s linear infinite">progress_activity</span> Signing in...' : '<span class="ms sm">login</span> Sign In';
  }
  if(sb) sb.disabled = on;
  if(gb) gb.disabled = on;
}

function doLogin(){
  const email=document.getElementById('uname').value.trim();
  const pass=document.getElementById('ac').value.trim();
  if(!email){showErr('Please enter your email address.');return;}
  if(!pass){showErr('Please enter your password.');return;}
  if(!email.includes('@')){showErr('Please enter a valid email address.');return;}
  setLoginLoading(true);
  auth.signInWithEmailAndPassword(email,pass).then(()=>{ Sounds.play('chime'); }).catch(e=>{
    setLoginLoading(false);
    const msgs={'auth/user-not-found':'No account found with this email.','auth/wrong-password':'Incorrect password.','auth/invalid-email':'Invalid email address.','auth/too-many-requests':'Too many attempts. Please try again later.'};
    showErr(msgs[e.code]||e.message);
  });
}

function doSignUp(){
  const email=document.getElementById('uname').value.trim();
  const pass=document.getElementById('ac').value.trim();
  if(!email){showErr('Please enter your email address.');return;}
  if(!pass){showErr('Please enter a password.');return;}
  if(!email.includes('@')){showErr('Please enter a valid email address.');return;}
  if(pass.length<6){showErr('Password must be at least 6 characters.');return;}
  setLoginLoading(true);
  auth.createUserWithEmailAndPassword(email,pass).catch(e=>{
    setLoginLoading(false);
    const msgs={'auth/email-already-in-use':'An account already exists with this email.','auth/invalid-email':'Invalid email address.','auth/weak-password':'Password is too weak.'};
    showErr(msgs[e.code]||e.message);
  });
}

function signInWithGoogle(){
  setLoginLoading(true);
  const provider=new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e=>{
    setLoginLoading(false);
    showErr(e.message);
  });
}

function forgotPassword(){
  const email=document.getElementById('uname').value.trim();
  if(!email||!email.includes('@')){showErr('Please enter your email address above first.');return;}
  auth.sendPasswordResetEmail(email).then(()=>{toast('Password reset email sent! Check your inbox.','ok',5000);}).catch(e=>showErr(e.message));
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
    _pendingFBUser=null;
    document.getElementById('lp').style.display='none';
    await enterApp(fbUser);
  }catch(e){nerr.style.display='flex';document.getElementById('name-err').querySelector('span:last-child')&&(document.getElementById('name-err').lastChild.textContent=e.message);}
}

async function enterApp(fbUser){
  user=fbUser.uid;
  uName=fbUser.displayName||(fbUser.email?fbUser.email.split('@')[0]:'User');
  try{
    const cfg=await db.collection('config').doc('keys').get();
    if(cfg.exists)groqKey=cfg.data().groq||'';
  }catch(e){
    // NEW: Async localforage check for the Groq API key
    const localKey = await localforage.getItem('pgroq');
    groqKey = localKey || '';
  }

  document.getElementById('ap').style.display='flex';
  document.getElementById('lp').style.display='none';
  const init=uName.charAt(0).toUpperCase();
  document.getElementById('hpc').textContent=init;
  document.getElementById('sbpc').textContent=init;
  document.getElementById('sbnm').textContent=uName;
  const provider=fbUser.providerData[0]?.providerId==='google.com'?'Google Account':fbUser.email;
  document.getElementById('sui').textContent=uName+' · '+provider;
  applyUI();
  await loadSettingsFromFirestore();
  await loadWardData(); 
  await loadSessions();
  newChat();
  checkOnboarding();
}

async function doLogout(){
  await auth.signOut();
  user=null;uName='';groqKey='';hist=[];sessions=[];currSess=null;
  document.getElementById('ap').style.display='none';
  document.getElementById('lp').style.display='flex';
  document.getElementById('auth-step').style.display='block';
  document.getElementById('name-step').style.display='none';
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
    const fbUser=auth.currentUser;
    if(fbUser)await fbUser.delete();
    toast('Account deleted.','info');
    user=null;uName='';groqKey='';hist=[];sessions=[];currSess=null;
    document.getElementById('ap').style.display='none';
    document.getElementById('lp').style.display='flex';
    document.getElementById('auth-step').style.display='block';
    document.getElementById('name-step').style.display='none';
    closeM('sm');
  }catch(e){
    if(e.code==='auth/requires-recent-login'){toast('Please log out and sign in again before deleting.','warn',5000);}
    else toast('Delete failed: '+e.message,'err');
  }
}