'use strict';

/* ══ FIRESTORE WRITE DEBOUNCER ══ */
const _fsQ = {};
function fsWrite(fn, key) {
  if (_fsQ[key]) clearTimeout(_fsQ[key]);
  return new Promise(resolve => {
    _fsQ[key] = setTimeout(async () => {
      try { resolve(await fn()); } catch(e) { resolve(null); }
    }, 800);
  });
}

/* ══ SHOW / HIDE APP vs LOGIN ══ */
function showApp(uid, name) {
  user  = uid;
  uName = name || 'Doctor';

  document.getElementById('lp').style.display           = 'none';
  document.getElementById('auth-loading').style.display = 'none';
  document.getElementById('ap').style.display           = 'block';

  const initial = uName.charAt(0).toUpperCase();
  document.getElementById('hpc').textContent   = initial;
  document.getElementById('sbpc').textContent  = initial;
  document.getElementById('sbnm').textContent  = uName;
  document.getElementById('sui').textContent   =
    firebase.auth().currentUser?.email || (firebase.auth().currentUser?.isAnonymous ? 'Guest' : '—');

  /* Hide delete-account row for anonymous guests */
  const isGuest = firebase.auth().currentUser?.isAnonymous;
  const delRow  = document.getElementById('si-delete-row');
  if (delRow) delRow.style.display = isGuest ? 'none' : 'flex';

  applyUI();
  renderWelcome();
  loadSessions();
  if (typeof loadWardData === 'function') loadWardData();
  loadDemoUsage();
  loadSettingsFromFirestore();
  checkOnboarding();
  Sounds.play('tick');
  hap(15);
}

function showLogin() {
  user = null; uName = '';
  document.getElementById('ap').style.display           = 'none';
  document.getElementById('auth-loading').style.display = 'none';
  document.getElementById('lp').style.display           = 'flex';
  /* Always reset to the email/pass step */
  document.getElementById('auth-step').style.display  = 'block';
  document.getElementById('name-step').style.display  = 'none';
}

/* ══ ERROR HELPERS ══ */
function clearErr() {
  document.getElementById('lerr').style.display      = 'none';
  document.getElementById('name-err').style.display  = 'none';
}
function showErr(msg) {
  const el = document.getElementById('lerr');
  document.getElementById('err-text').textContent = msg;
  el.style.display = 'flex';
}

/* ══ AUTH STATE — handles session restore AND auto-logout on data clear ══ */
firebase.auth().onAuthStateChanged(async fbUser => {
  document.getElementById('auth-loading').style.display = 'none';

  if (!fbUser) {
    /* Browser data cleared, sign-out, or never signed in → go to login */
    showLogin();
    return;
  }

  /* ── Guest with no name yet ── */
  if (fbUser.isAnonymous && (!fbUser.displayName || fbUser.displayName.trim() === '')) {
    _pendingFBUser = fbUser;
    document.getElementById('lp').style.display          = 'flex';
    document.getElementById('auth-step').style.display   = 'none';
    document.getElementById('name-step').style.display   = 'block';
    return;
  }

  /* ── Fetch stored name from Firestore ── */
  try {
    const doc  = await db.collection('users').doc(fbUser.uid).get();
    const name = (doc.exists && doc.data().name)
      ? doc.data().name
      : (fbUser.displayName || fbUser.email?.split('@')[0] || 'Doctor');

    /* New email sign-up — no name stored yet → show name dialog */
    if (!doc.exists || !doc.data().name) {
      _pendingFBUser = fbUser;
      document.getElementById('lp').style.display          = 'flex';
      document.getElementById('auth-step').style.display   = 'none';
      document.getElementById('name-step').style.display   = 'block';
      /* Pre-fill from Google display name if available */
      const nameInp = document.getElementById('display-name');
      if (nameInp && fbUser.displayName) nameInp.value = fbUser.displayName;
      return;
    }

    showApp(fbUser.uid, name);
  } catch(e) {
    /* Offline — use whatever we have */
    showApp(fbUser.uid, fbUser.displayName || 'Doctor');
  }
});

/* ══ EMAIL SIGN IN ══ */
async function doLogin() {
  const email = document.getElementById('uname').value.trim();
  const pass  = document.getElementById('ac').value;
  if (!email || !pass) { showErr('Please enter your email and password.'); return; }

  const btn = document.getElementById('lbtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="auth-spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';

  try {
    await firebase.auth().signInWithEmailAndPassword(email, pass);
    /* onAuthStateChanged fires → showApp() */
  } catch(e) {
    const m = {
      'auth/user-not-found'      : 'No account found for this email.',
      'auth/wrong-password'      : 'Incorrect password.',
      'auth/invalid-email'       : 'Invalid email address.',
      'auth/invalid-credential'  : 'Invalid email or password.',
      'auth/too-many-requests'   : 'Too many attempts — try again later.',
    };
    showErr(m[e.code] || e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="ms sm">login</span> Sign In';
  }
}

/* ══ EMAIL SIGN UP ══ */
async function doSignUp() {
  const email = document.getElementById('uname').value.trim();
  const pass  = document.getElementById('ac').value;
  if (!email || !pass) { showErr('Please enter your email and password.'); return; }
  if (pass.length < 6) { showErr('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('sbtn2');
  btn.disabled = true;
  btn.innerHTML = '<div class="auth-spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';

  try {
    const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
    _pendingFBUser = cred.user;
    document.getElementById('auth-step').style.display = 'none';
    document.getElementById('name-step').style.display = 'block';
  } catch(e) {
    const m = {
      'auth/email-already-in-use' : 'An account already exists for this email.',
      'auth/invalid-email'        : 'Invalid email address.',
      'auth/weak-password'        : 'Password is too weak (min 6 chars).',
    };
    showErr(m[e.code] || e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="ms sm">person_add</span> Sign Up';
  }
}

/* ══ GOOGLE SIGN IN ══ */
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    /* onAuthStateChanged fires → showApp() or name dialog */
  } catch(e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      showErr('Google sign-in failed. Please try again.');
    }
  }
}

/* ══ GUEST SIGN IN → name dialog ══ */
async function signInAsGuest() {
  const btn = document.getElementById('guest-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="auth-spinner" style="width:20px;height:20px;border-width:2px;margin:0;border-top-color:var(--bg)"></div> Please wait…';

  try {
    const cred     = await firebase.auth().signInAnonymously();
    _pendingFBUser = cred.user;

    /* Show "What should I call you?" step */
    document.getElementById('auth-step').style.display = 'none';
    document.getElementById('name-step').style.display = 'block';
  } catch(e) {
    showErr('Guest sign-in failed. Please try again.');
    btn.disabled = false;
    btn.innerHTML = '<span class="ms sm">visibility</span> Continue as Guest';
  }
}

/* ══ SAVE NAME (new sign-up, Google, OR guest) ══ */
async function saveName() {
  const nameInp = document.getElementById('display-name');
  const name    = nameInp ? nameInp.value.trim() : '';

  if (!name) {
    document.getElementById('name-err').style.display = 'flex';
    return;
  }

  const fbUser = _pendingFBUser || firebase.auth().currentUser;
  if (!fbUser) { showLogin(); return; }

  try {
    await fbUser.updateProfile({ displayName: name });
    await db.collection('users').doc(fbUser.uid).set({ name }, { merge: true });
  } catch(e) {
    /* Offline — carry on anyway */
  }

  _pendingFBUser = null;
  showApp(fbUser.uid, name);
}

/* ══ FORGOT PASSWORD ══ */
async function forgotPassword() {
  const email = document.getElementById('uname').value.trim();
  if (!email) { showErr('Enter your email address above first.'); return; }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    toast('Password reset email sent!', 'ok', 4000);
  } catch(e) {
    showErr('Could not send reset email — check the address.');
  }
}

/* ══ LOGOUT ══ */
async function doLogout() {
  try {
    await firebase.auth().signOut();
    sessions      = [];
    hist          = [];
    currSess      = null;
    if (typeof wardPatients !== 'undefined') wardPatients = [];
    await localforage.clear();
    closeM('sm');
    toast('Signed out successfully.', 'ok');
    /* onAuthStateChanged fires → showLogin() */
  } catch(e) {
    toast('Sign-out failed.', 'err');
  }
}

/* ══ DELETE ACCOUNT ══ */
async function deleteAccount() {
  if (!confirm('⚠️ Permanently delete your account and ALL data?\n\nThis cannot be undone.')) return;

  const fbUser = firebase.auth().currentUser;
  if (!fbUser) return;

  try {
    /* Delete subcollections */
    const batch = db.batch();
    const [sessSnap, wardSnap] = await Promise.all([
      db.collection('users').doc(fbUser.uid).collection('sessions').get(),
      db.collection('users').doc(fbUser.uid).collection('ward').get(),
    ]);
    sessSnap.forEach(d => batch.delete(d.ref));
    wardSnap.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('users').doc(fbUser.uid));
    await batch.commit();
  } catch(e) { /* continue even if Firestore fails */ }

  try {
    await localforage.clear();
    await fbUser.delete();
    toast('Account permanently deleted.', 'ok');
  } catch(e) {
    if (e.code === 'auth/requires-recent-login') {
      toast('Please sign out and sign back in, then try again.', 'warn', 6000);
    } else {
      toast('Failed to delete account: ' + e.message, 'err');
    }
  }
}

/* ══ WARD / CHAT MODE TOGGLE ══ */
let wardModeActive = false;

function toggleAppMode() {
  wardModeActive = !wardModeActive;
  const view    = document.getElementById('cdss-view');
  const overlay = document.getElementById('ward-overlay');
  const icon    = document.getElementById('navIcon');

  if (wardModeActive) {
    view.classList.add('open');
    overlay.classList.add('open');
    icon.textContent = 'chat';
    if (typeof renderWardList === 'function') renderWardList();
  } else {
    closeWardMode();
  }
}

function closeWardMode() {
  wardModeActive = false;
  document.getElementById('cdss-view').classList.remove('open');
  document.getElementById('ward-overlay').classList.remove('open');
  document.getElementById('navIcon').textContent = 'local_hospital';
}
