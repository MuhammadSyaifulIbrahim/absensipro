// src/lib/shifts.js
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";

/** Buat shift baru */
export async function createShift({
  name,
  start,
  end,
  graceMinutes = 0,
  breakMinutes = 0,
}) {
  return addDoc(collection(db, "shifts"), {
    name,
    start,
    end,
    graceMinutes,
    breakMinutes,
  });
}

/** List shifts */
export async function listShifts() {
  const snap = await getDocs(
    query(collection(db, "shifts"), orderBy("name", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Assign shift ke user (menulis ke users/{uid}.shiftId) */
export async function setUserShift(uid, shiftId) {
  await updateDoc(doc(db, "users", uid), { shiftId });
}

/** Ambil shift & user detail (helper untuk attendance) */
export async function getUserShift(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const user = userSnap.exists() ? userSnap.data() : null;
  if (!user?.shiftId) return { user, shift: null };
  const sRef = doc(db, "shifts", user.shiftId);
  const sSnap = await getDoc(sRef);
  return {
    user,
    shift: sSnap.exists() ? { id: sSnap.id, ...sSnap.data() } : null,
  };
}
