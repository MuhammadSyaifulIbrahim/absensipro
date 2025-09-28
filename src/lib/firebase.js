// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// ------- config dari .env -------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// ------- init aman HMR -------
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// persistence (opsional tapi disarankan)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// ------- provider Google -------
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Jika halaman ter-isolasi (COOP/COEP) atau Safari, redirect lebih stabil
const preferPopup = () => {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isolated = !!window.crossOriginIsolated;
  return !(isSafari || isolated);
};

// Login pintar: popup kalau bisa, redirect kalau perlu
export const signInWithGoogleSmart = async () => {
  if (preferPopup()) {
    return signInWithPopup(auth, provider); // { user, ... }
  } else {
    await signInWithRedirect(auth, provider); // kembali ke halaman ini
    return null;
  }
};

// Ambil hasil setelah redirect (null kalau belum ada)
export const getGoogleRedirectUser = async () => {
  const res = await getRedirectResult(auth);
  return res?.user || null;
};

// ----> INI YANG DIBUTUHKAN APP.JSX
export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const logOut = () => signOut(auth);

// Buat dokumen users/{uid} pertama kali login
export const ensureUserDoc = async (u) => {
  if (!u) return;
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      name: u.displayName,
      email: u.email,
      role: "staff",
      active: true,
      createdAt: serverTimestamp(),
    });
  }
};
