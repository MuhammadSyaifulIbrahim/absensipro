// src/lib/users.js
import { db } from "../lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

export async function listUsersPage({ pageSize = 50, afterDoc = null }) {
  const base = [orderBy("createdAt", "desc"), limit(pageSize)];
  const q = afterDoc
    ? query(collection(db, "users"), ...base, startAfter(afterDoc))
    : query(collection(db, "users"), ...base);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data(), _ref: d }));
  return {
    rows,
    last: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.size === pageSize,
  };
}

export async function setUserRole(uid, role) {
  if (!["staff", "manager", "admin"].includes(role))
    throw new Error("role tidak valid");
  await updateDoc(doc(db, "users", uid), { role });
}

export async function setUserActive(uid, active) {
  await updateDoc(doc(db, "users", uid), { active: !!active });
}
