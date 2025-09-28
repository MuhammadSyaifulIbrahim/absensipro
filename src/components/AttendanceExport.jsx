// src/components/AttendanceExport.jsx
import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { exportToCSV, exportToExcel } from "../lib/exporter";

function prettyType(type) {
  if (type === "checkin") return "Absen Masuk";
  if (type === "checkout") return "Absen Pulang";
  return type || "-";
}

/**
 * Hitung status & menit terlambat.
 * Prefer data yang sudah tersimpan (status/lateMinutes).
 * Jika kosong, fallback hitung dari createdAt vs cutoff 08:00 pada hari ymd.
 * - Non-checkin => status "-" dan late=0
 */
function deriveStatus(rec) {
  // Bukan check-in => tidak ada status kehadiran
  if (rec.type !== "checkin") {
    return { statusText: "-", lateMinutes: 0 };
  }

  // Jika DB sudah menyimpan status ringkas & lateMinutes, hormati itu
  if (rec.status === "late") {
    const lm = typeof rec.lateMinutes === "number" ? rec.lateMinutes : 0;
    return { statusText: `Terlambat jam kerja (${lm} menit)`, lateMinutes: lm };
  }
  if (rec.status === "ontime") {
    return { statusText: "Hadir tepat waktu", lateMinutes: 0 };
  }
  if (typeof rec.lateMinutes === "number") {
    const lm = rec.lateMinutes;
    return lm > 0
      ? { statusText: `Terlambat jam kerja (${lm} menit)`, lateMinutes: lm }
      : { statusText: "Hadir tepat waktu", lateMinutes: 0 };
  }

  // Fallback: hitung dari createdAt dibanding cutoff 08:00 pada hari `ymd`
  // Gunakan `ymd` supaya patokan hari konsisten (lokal).
  const createdAt =
    rec.createdAt && typeof rec.createdAt.toDate === "function"
      ? rec.createdAt.toDate()
      : null;

  if (!createdAt) {
    // Tidak bisa hitung tanpa createdAt → anggap ontime
    return { statusText: "Hadir tepat waktu", lateMinutes: 0 };
  }

  // Bentuk tanggal cutoff dari ymd (YYYY-MM-DD) agar tepat di lokal
  // Jika ymd kosong, jatuhkan ke tanggal dari createdAt
  const ymd = rec.ymd || createdAt.toISOString().slice(0, 10);
  const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
  const cutoff = new Date(y, (m || 1) - 1, d || 1, 8, 0, 0, 0); // 08:00 lokal

  if (createdAt > cutoff) {
    const lateMinutes = Math.floor(
      (createdAt.getTime() - cutoff.getTime()) / 60000
    );
    return {
      statusText: `Terlambat jam kerja (${lateMinutes} menit)`,
      lateMinutes,
    };
  }
  return { statusText: "Hadir tepat waktu", lateMinutes: 0 };
}

export default function AttendanceExport() {
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // UID -> Nama User
  const [usersMap, setUsersMap] = useState({});
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((doc) => {
        const u = doc.data();
        map[doc.id] = u.name || u.displayName || u.email || doc.id;
      });
      setUsersMap(map);
    })();
  }, []);

  const exportData = async (format) => {
    if (!from || !to) return alert("Isi rentang tanggal dulu");
    if (from > to) return alert("Tanggal 'Dari' harus ≤ 'Sampai'");

    setLoading(true);
    try {
      // Query berdasarkan ymd (string 'YYYY-MM-DD') sehingga range by date simpel
      const q = query(
        collection(db, "attendance"),
        where("ymd", ">=", from),
        where("ymd", "<=", to),
        orderBy("ymd", "asc")
      );
      const snap = await getDocs(q);

      const rows = snap.docs.map((d) => {
        const x = d.data();
        const lokasi = x.location ? `${x.location.lat},${x.location.lng}` : "-";
        const { statusText, lateMinutes } = deriveStatus(x);

        return {
          user: usersMap[x.uid] || x.uid, // Nama user
          tanggal: x.ymd, // YYYY-MM-DD
          tipe: prettyType(x.type), // Absen Masuk / Absen Pulang
          status: statusText, // Hadir tepat waktu / Terlambat ...
          keterlambatan_menit: lateMinutes, // angka menit
          lokasi,
        };
      });

      if (rows.length === 0) {
        alert("Tidak ada data di rentang ini");
        return;
      }

      if (format === "csv") {
        exportToCSV(`attendance_${from}_${to}.csv`, rows);
      } else {
        exportToExcel(`attendance_${from}_${to}.xlsx`, rows);
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
      <h3 className="font-semibold">Export Absensi</h3>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div className="flex gap-2">
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
  );
}
