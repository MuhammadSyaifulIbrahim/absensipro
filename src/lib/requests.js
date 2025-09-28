// src/lib/requests.js
import { db } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Buat request:
 * - leave / sick / correction → butuh from & to
 * - overtime → butuh date, startTime, endTime
 */
export async function createRequest(payload) {
  const {
    uid,
    type,
    reason = "",
    attachment = null,
    from,
    to,
    date,
    startTime,
    endTime,
    durationMinutes,
  } = payload || {};

  if (!uid) throw new Error("uid wajib");
  if (!type) throw new Error("type wajib");

  const normType = String(type).toLowerCase().trim();

  const base = {
    uid,
    type: normType,
    reason,
    attachment: attachment || null,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  // ==== lembur ====
  if (normType === "overtime") {
    if (!date) throw new Error("tanggal lembur wajib");
    if (!startTime || !endTime)
      throw new Error("jam mulai/selesai lembur wajib");

    const toMin = (hm) => {
      const [h, m] = String(hm)
        .split(":")
        .map((x) => parseInt(x || "0", 10));
      return h * 60 + m;
    };
    const s = toMin(startTime);
    const e = toMin(endTime);
    if (!(s < e)) throw new Error("Jam selesai harus > jam mulai");

    const dur = typeof durationMinutes === "number" ? durationMinutes : e - s;

    await addDoc(collection(db, "requests"), {
      ...base,
      date,
      startTime,
      endTime,
      durationMinutes: dur,
    });
    return;
  }

  // ==== selain lembur ====
  if (!from || !to) throw new Error("tanggal from/to wajib");

  await addDoc(collection(db, "requests"), {
    ...base,
    from,
    to,
  });
}

/**
 * Update status request (admin).
 */
export async function setRequestStatus(requestId, approverUid, newStatus) {
  if (!requestId) throw new Error("requestId wajib");
  if (!approverUid) throw new Error("approverUid wajib");
  if (!["approved", "rejected", "pending"].includes(newStatus)) {
    throw new Error("status tidak valid");
  }
  const ref = doc(db, "requests", requestId);
  await updateDoc(ref, {
    status: newStatus,
    approverUid,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Ambil daftar request milik user (riwayat pribadi).
 */
export async function listMyRequests(uid, max = 100) {
  if (!uid) throw new Error("uid wajib");
  const q = query(
    collection(db, "requests"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Ambil daftar request by status (buat admin).
 */
export async function listRequestsByStatus(status, max = 100) {
  const q = query(
    collection(db, "requests"),
    where("status", "==", status),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
