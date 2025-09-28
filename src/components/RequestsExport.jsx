// src/components/RequestsExport.jsx
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { exportToCSV, exportToExcel } from "../lib/exporter";

function prettyType(v) {
  if (v === "leave") return "Cuti";
  if (v === "sick") return "Sakit";
  if (v === "correction") return "Koreksi Absen";
  if (v === "overtime") return "Lembur";
  return v || "-";
}

export default function RequestsExport() {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(""); // yyyy-mm-dd
  const [to, setTo] = useState(""); // yyyy-mm-dd
  const [status, setStatus] = useState("all"); // all|pending|approved|rejected

  // UID -> Nama user
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((d) => {
        const u = d.data();
        map[d.id] = u.name || u.displayName || u.email || d.id;
      });
      setUsersMap(map);
    })();
  }, []);

  const exportData = async (format) => {
    if (!from || !to) return alert("Isi rentang tanggal dulu");
    if (from > to) return alert("Tanggal 'Dari' harus ≤ 'Sampai'");

    setLoading(true);
    try {
      // Filter primary by createdAt (paling aman untuk semua tipe)
      const start = Timestamp.fromDate(new Date(`${from}T00:00:00`));
      const end = Timestamp.fromDate(new Date(`${to}T23:59:59`));

      let q = query(
        collection(db, "requests"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
        orderBy("createdAt", "asc")
      );
      if (status !== "all") {
        q = query(
          collection(db, "requests"),
          where("createdAt", ">=", start),
          where("createdAt", "<=", end),
          where("status", "==", status),
          orderBy("createdAt", "asc")
        );
      }

      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => {
        const x = d.data();
        const user = usersMap[x.uid] || x.uid;
        const approver = usersMap[x.approverUid] || x.approverUid || "-";
        const lampiran =
          typeof x.attachment === "string"
            ? x.attachment
            : x.attachment?.secure_url || x.attachment?.url || "";

        if (x.type === "overtime") {
          return {
            user,
            jenis: prettyType(x.type),
            tanggal: x.date || "",
            jam_mulai: x.startTime || "",
            jam_selesai: x.endTime || "",
            durasi_menit: x.durationMinutes || 0,
            alasan: x.reason || "-",
            status: x.status,
            approver,
            lampiran,
            dibuat: x.createdAt?.toDate
              ? x.createdAt.toDate().toISOString()
              : "",
          };
        }

        // tipe lain (leave/sick/correction)
        return {
          user,
          jenis: prettyType(x.type),
          dari: x.from || "",
          sampai: x.to || "",
          alasan: x.reason || "-",
          status: x.status,
          approver,
          lampiran,
          dibuat: x.createdAt?.toDate ? x.createdAt.toDate().toISOString() : "",
        };
      });

      if (rows.length === 0) {
        alert("Tidak ada data di rentang ini");
        return;
      }

      const fname = `requests_${from}_${to}${
        status !== "all" ? "_" + status : ""
      }`;
      if (format === "csv") {
        exportToCSV(`${fname}.csv`, rows);
      } else {
        exportToExcel(`${fname}.xlsx`, rows);
      }
    } catch (e) {
      console.error(e);
      alert("Gagal export data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h3 className="font-semibold">Export Requests</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Dari</span>
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Sampai</span>
          <input
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Status</span>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Semua</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            className="btn"
            disabled={loading}
            onClick={() => exportData("csv")}
          >
            {loading ? "Mengambil…" : "Export CSV"}
          </button>
          <button
            className="btn"
            disabled={loading}
            onClick={() => exportData("excel")}
          >
            {loading ? "Mengambil…" : "Export Excel"}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Catatan: filter berdasarkan <em>waktu dibuat</em> (createdAt) agar
        konsisten untuk semua tipe request.
      </p>
    </div>
  );
}
