// src/components/AttendanceTable.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export default function AttendanceTable({ adminView = false, pageSize = 50 }) {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pickPosition = (u) =>
    u.jabatan || u.position || u.title || u.role || "-";

  // Ambil data user → { name, position }
  useEffect(() => {
    (async () => {
      try {
        if (adminView) {
          const snap = await getDocs(collection(db, "users"));
          const map = {};
          snap.forEach((d) => {
            const u = d.data();
            map[d.id] = {
              name: u.name || u.displayName || u.email || d.id,
              position: pickPosition(u),
            };
          });
          setUsers(map);
        } else if (auth.currentUser) {
          const me = await getDoc(doc(db, "users", auth.currentUser.uid));
          if (me.exists()) {
            const u = me.data();
            setUsers({
              [auth.currentUser.uid]: {
                name:
                  u.name || u.displayName || u.email || auth.currentUser.uid,
                position: pickPosition(u),
              },
            });
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [adminView]);

  // Subscribe attendance
  useEffect(() => {
    if (!adminView && !auth.currentUser) {
      setLoading(false);
      return;
    }
    try {
      const base = collection(db, "attendance");
      const clauses = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (!adminView) clauses.unshift(where("uid", "==", auth.currentUser.uid));
      const q = query(base, ...clauses);

      const unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => {
            const x = d.data();
            return {
              id: d.id,
              ...x,
              ymd:
                x.ymd ||
                (x.createdAt?.toDate
                  ? x.createdAt.toDate().toISOString().slice(0, 10)
                  : "-"),
            };
          });
          setRows(data);
          setLoading(false);
        },
        (err) => {
          console.error(err);
          setError(err.message || "Gagal memuat data");
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error(e);
      setError(e.message || "Gagal memuat data");
      setLoading(false);
    }
  }, [adminView, pageSize]);

  // ---- Helpers ----
  const formatDateTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : null;
    if (!d) return "-";
    const pad = (n) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${dd} ${hh}:${mm}`;
  };

  // Check-in status: tepat waktu / terlambat
  const checkinStatus = (rec) => {
    if (rec.type !== "checkin") return "-";
    const date = rec.createdAt?.toDate ? rec.createdAt.toDate() : null;
    if (!date) return "-";
    const base = new Date(date);
    base.setHours(8, 0, 0, 0);
    const diffMin = Math.floor((date - base) / 60000);
    return diffMin > 0
      ? `Terlambat jam kerja (${diffMin} menit)`
      : "Hadir tepat waktu";
  };

  const isLate = (rec) => {
    if (rec.type !== "checkin") return false;
    const date = rec.createdAt?.toDate ? rec.createdAt.toDate() : null;
    if (!date) return false;
    const base = new Date(date);
    base.setHours(8, 0, 0, 0);
    return date > base;
  };

  // Checkout status: "Berhasil" jika ada foto (upload ok)
  const checkoutStatus = (rec) => {
    if (rec.type !== "checkout") return "-";
    return rec.photoUrl ? "Berhasil" : "-";
  };

  const prettyType = (t) =>
    t === "checkin" ? "Absen Masuk" : t === "checkout" ? "Absen Pulang" : t;

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          {adminView ? "Riwayat Absensi (Semua)" : "Riwayat Absensi"}
        </h3>
        <span className="text-sm text-gray-500">
          {loading ? "memuat…" : `${rows.length} data`}
        </span>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              {adminView && <th className="py-2 pr-4">User</th>}
              <th className="py-2 pr-4">Tanggal / Jam</th>
              <th className="py-2 pr-4">Tipe</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Foto</th>
              <th className="py-2 pr-4">Jabatan</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={adminView ? 6 : 5}>
                  Memuat data…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={adminView ? 6 : 5}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const statusText =
                  r.type === "checkin" ? checkinStatus(r) : checkoutStatus(r);
                const badgeClass =
                  r.type === "checkin"
                    ? isLate(r)
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"; // checkout 'Berhasil' → biru lembut

                return (
                  <tr key={r.id} className="border-t">
                    {adminView && (
                      <td className="py-2 pr-4">
                        {users[r.uid]?.name || r.uid}
                      </td>
                    )}
                    <td className="py-2 pr-4">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2 pr-4">{prettyType(r.type)}</td>
                    <td className="py-2 pr-4">
                      {statusText === "-" ? (
                        "-"
                      ) : (
                        <span
                          className={`rounded px-2 py-1 text-xs ${badgeClass}`}
                        >
                          {statusText}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {r.photoUrl ? (
                        <a
                          className="text-blue-600 underline"
                          href={r.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Lihat
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {users[r.uid]?.position || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
