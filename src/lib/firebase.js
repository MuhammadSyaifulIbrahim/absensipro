// src/lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
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

// ------- Config dari .env -------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  // storageBucket opsional untuk proyek ini (pakai Cloudinary)
};

// ------- Init app (aman terhadap HMR) -------
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ------- Auth: gunakan initializeAuth (agar bisa set persistence & resolver) -------
let _auth;
if (typeof window !== "undefined") {
  // Di browser: coba initializeAuth sekali.
  try {
    _auth = initializeAuth(app, {
      persistence: [
        // urutan fallback: IndexedDB -> LocalStorage -> SessionStorage
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // Kalau sudah pernah di-init (HMR), ambil instance yang ada
    _auth = getAuth(app);
  }
} else {
  // Di SSR/Node (jika ada), cukup getAuth
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);

// ------- Provider Google -------
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Login pintar: coba popup, fallback ke redirect jika popup tidak bisa
export async function signInWithGoogleSmart() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // Fallback yang umum di Safari / iOS / env yang memblokir popup
    if (
      e?.code === "auth/popup-blocked" ||
      e?.code === "auth/popup-closed-by-user" ||
      e?.code === "auth/operation-not-supported-in-this-environment" ||
      e?.code === "auth/unauthorized-domain"
    ) {
      await signInWithRedirect(auth, provider);
      return null; // hasil user akan diambil lewat getGoogleRedirectUser()
    }
    throw e;
  }
}

// Ambil hasil user setelah redirect (null kalau tidak ada)
export async function getGoogleRedirectUser() {
  try {
    const res = await getRedirectResult(auth);
    return res?.user ?? null;
  } catch {
    return null;
  }
}

// Listener auth
export const onAuth = (cb) => onAuthStateChanged(auth, cb);
export const logOut = () => signOut(auth);

// Buat dokumen users/{uid} saat login pertama
export async function ensureUserDoc(u) {
  if (!u) return;
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: u.uid,
      name: u.displayName,
      email: u.email,
      photoURL: u.photoURL ?? null,
      role: "staff", // default
      active: true,
      createdAt: serverTimestamp(),
    });
  }
}
