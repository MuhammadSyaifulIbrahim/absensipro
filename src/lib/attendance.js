// src/lib/attendance.js
import { db } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getUserShift } from "./shifts";

export const todayYMD = () => new Date().toISOString().slice(0, 10);

/**
 * Hitung status berdasarkan shift & jam lokal device.
 * NB: Ini kalkulasi client-side (indikatif). Di tahap lanjut,
 *     bisa dipindah ke Cloud Function untuk anti-backdate 100%.
 */
function computeStatusForCheckIn(shift) {
  if (!shift?.start)
    return { status: "present", lateMinutes: 0, shiftId: null };
  const now = new Date();
  const [hh, mm] = shift.start.split(":").map(Number); // "09:00"
  const planned = new Date(now);
  planned.setHours(hh, mm || 0, 0, 0);

  const grace = Number(shift.graceMinutes || 0);
  const graceLimit = new Date(planned.getTime() + grace * 60 * 1000);

  if (now > graceLimit) {
    const lateMs = now.getTime() - planned.getTime();
    const lateMinutes = Math.max(0, Math.round(lateMs / 60000));
    return { status: "late", lateMinutes, shiftId: null };
  }
  return { status: "present", lateMinutes: 0, shiftId: null };
}

/**
 * Rekam attendance (checkin/checkout).
 * Tambahan: saat 'checkin' akan diisi status present/late + shiftId.
 */
export async function recordAttendance({
  uid,
  type, // 'checkin' | 'checkout'
  photoUrl = null,
  location = null,
}) {
  let status = undefined;
  let shiftId = undefined;
  let lateMinutes = undefined;

  if (type === "checkin") {
    const { shift } = await getUserShift(uid);
    const comp = computeStatusForCheckIn(shift);
    status = comp.status;
    lateMinutes = comp.lateMinutes;
    shiftId = shift?.id || null;
  }

  return addDoc(collection(db, "attendance"), {
    uid,
    type,
    photoUrl,
    location,
    ymd: todayYMD(),
    status: status || null, // "present" | "late" | null (untuk checkout)
    lateMinutes: lateMinutes ?? null,
    shiftId: shiftId ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function lastAttendanceToday(uid) {
  const q = query(
    collection(db, "attendance"),
    where("uid", "==", uid),
    where("ymd", "==", todayYMD()),
    orderBy("createdAt", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.docs[0]?.data() || null;
}
