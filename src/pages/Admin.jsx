// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { setRequestStatus } from "../lib/requests";
import AttendanceTable from "../components/AttendanceTable";
import UsersTable from "../components/UsersTable";
import AttendanceExport from "../components/AttendanceExport";
import RequestsExport from "../components/RequestsExport";
import ShiftAdmin from "../components/ShiftAdmin";
import { pickCloudinaryUrl, makePreviewUrl } from "../lib/cloudinary";

function prettyType(v) {
  if (v === "leave") return "Cuti";
  if (v === "sick") return "Sakit";
  if (v === "correction") return "Koreksi Absen";
  if (v === "overtime") return "Lembur";
  return v || "-";
}
const pickPosition = (u) => u.jabatan || u.position || u.title || u.role || "-";

// util kecil buat amankan tampilan tanggal rentang
const rangeOrDash = (a, b) => {
  if (!a && !b) return "-";
  if (a && !b) return a;
  if (!a && b) return b;
  return `${a} — ${b}`;
};

export default function Admin() {
  const { user, role } = useOutletContext();
  if (!user) return <Navigate to="/signin" replace />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "users" | "shifts"

  // ===== Users map (UID -> {name, position}) =====
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const map = {};
      snap.forEach((doc) => {
        const u = doc.data();
        map[doc.id] = {
          name: u.name || u.displayName || u.email || doc.id,
          position: pickPosition(u),
        };
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

  // ===== Requests state =====
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const baseQuery = useMemo(() => {
    const c = collection(db, "requests");
    return query(
      c,
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(30)
    );
  }, [status]);

  useEffect(() => {
    if (activeTab !== "requests") return;

    setLoading(true);
    setErr(null);
    setLastDoc(null);

    const unsub = onSnapshot(
      baseQuery,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(data);
        setLoading(false);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.size === 30);
      },
      (e) => {
        console.error(e);
        setErr(e.message || "Gagal memuat data");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [baseQuery, activeTab]);

  const loadMore = async () => {
    if (!lastDoc) return;
    const q = query(
      collection(db, "requests"),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(30)
    );
    const snap = await getDocs(q);
    const more = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setRows((prev) => [...prev, ...more]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.size === 30);
  };

  const act = async (id, newStatus) => {
    try {
      if (!confirm(`Yakin ${newStatus.toUpperCase()} request ini?`)) return;
      await setRequestStatus(id, user.uid, newStatus);
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status");
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          className={
            "btn " + (activeTab === "requests" ? "bg-blue-600 text-white" : "")
          }
          onClick={() => setActiveTab("requests")}
        >
          Requests
        </button>
        <button
          className={
            "btn " + (activeTab === "users" ? "bg-blue-600 text-white" : "")
          }
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
        <button
          className={
            "btn " + (activeTab === "shifts" ? "bg-blue-600 text-white" : "")
          }
          onClick={() => setActiveTab("shifts")}
        >
          Shifts
        </button>
      </div>

      {/* Panel Requests / Users / Shifts */}
      {activeTab === "users" ? (
        <div className="card">
          <h2 className="mb-3 font-semibold">Manajemen User</h2>
          <UsersTable />
        </div>
      ) : activeTab === "shifts" ? (
        <div className="card">
          <h2 className="mb-3 font-semibold">Manajemen Shift</h2>
          <ShiftAdmin />
        </div>
      ) : (
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Requests</h2>
              <p className="text-sm text-gray-600">
                Kelola izin/cuti/sakit/lembur
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status:</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {err && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Jabatan</th>
                  <th className="py-2 pr-4">Jenis</th>
                  <th className="py-2 pr-4">Tanggal / Jam</th>
                  <th className="py-2 pr-4">Alasan</th>
                  <th className="py-2 pr-4">Lampiran</th>
                  <th className="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={7}>
                      Memuat data…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={7}>
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const rawUrl = pickCloudinaryUrl(r.attachment);
                    const href = makePreviewUrl(rawUrl);

                    return (
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-4">
                          {usersMap[r.uid]?.name || r.uid}
                        </td>
                        <td className="py-2 pr-4">
                          {usersMap[r.uid]?.position || "-"}
                        </td>
                        <td className="py-2 pr-4">{prettyType(r.type)}</td>
                        <td className="py-2 pr-4">
                          {r.type === "overtime"
                            ? `${r.date || "-"} • ${r.startTime || "-"}–${
                                r.endTime || "-"
                              } (${r.durationMinutes || 0} menit)`
                            : rangeOrDash(r.from, r.to)}
                        </td>
                        <td className="max-w-[24rem] py-2 pr-4">
                          <span className="line-clamp-2">
                            {r.reason || "-"}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {rawUrl ? (
                            <a
                              className="text-blue-600 underline"
                              href={href}
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
                          {status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                className="btn bg-green-600 text-white"
                                onClick={() => act(r.id, "approved")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn bg-red-600 text-white"
                                onClick={() => act(r.id, "rejected")}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span
                              className={
                                "rounded px-2 py-1 text-xs " +
                                (r.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : r.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700")
                              }
                            >
                              {r.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {loading ? "memuat…" : `${rows.length} data`}
            </span>
            {hasMore && (
              <button className="btn" onClick={loadMore}>
                Muat lebih banyak
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel Absensi (semua karyawan) */}
      <div className="card">
        <h2 className="mb-3 font-semibold">Absensi (Semua Karyawan)</h2>
        <AttendanceTable adminView pageSize={50} />
      </div>

      {/* Panel Export */}
      <AttendanceExport />
      <RequestsExport />
    </div>
  );
}
