// src/components/RequestForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { uploadToCloudinary } from "../lib/cloudinary";
import { createRequest, listMyRequests } from "../lib/requests";

function prettyType(v) {
  if (v === "leave") return "Cuti";
  if (v === "sick") return "Sakit";
  if (v === "correction") return "Koreksi Absen";
  if (v === "overtime") return "Lembur";
  return v || "-";
}

function pickUrl(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.secure_url || x.url || null;
}

function fmtSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RequestForm() {
  const [type, setType] = useState("leave");
  const [reason, setReason] = useState("");

  // cuti/sakit/koreksi
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // lembur
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // lampiran
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // state
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // durasi lembur (menit)
  const overtimeMinutes = useMemo(() => {
    const toMin = (hm) => {
      const [h, m] = String(hm || "")
        .split(":")
        .map((x) => parseInt(x || "0", 10));
      return h * 60 + m;
    };
    const s = toMin(startTime);
    const e = toMin(endTime);
    if (!startTime || !endTime || e <= s) return 0;
    return e - s;
  }, [startTime, endTime]);

  // validasi bisa submit
  const canSubmit = useMemo(() => {
    const t = String(type).toLowerCase().trim();
    if (t === "overtime") {
      if (!date || !startTime || !endTime) return false;
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      if (Number.isNaN(sh) || Number.isNaN(eh)) return false;
      // jam selesai harus > jam mulai
      return eh > sh || (eh === sh && em > sm);
    } else {
      if (!from || !to) return false;
      return new Date(from) <= new Date(to);
    }
  }, [type, from, to, date, startTime, endTime]);

  // muat daftar request milik user
  useEffect(() => {
    (async () => {
      if (!auth.currentUser) {
        setRows([]);
        setLoadingList(false);
        return;
      }
      try {
        setLoadingList(true);
        const data = await listMyRequests(auth.currentUser.uid);
        setRows(data);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [submitting]);

  const onSubmit = async () => {
    setErrMsg("");
    if (!auth.currentUser) return alert("Harus login dulu");
    if (!canSubmit) {
      setErrMsg("Cek kembali data form (tanggal/jam).");
      return;
    }

    try {
      setSubmitting(true);

      // upload lampiran (opsional) → simpan URL string
      let attachment = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setErrMsg("Ukuran file maksimal 5MB");
          setSubmitting(false);
          return;
        }
        const res = await uploadToCloudinary(file);
        attachment = pickUrl(res);
      }

      const normType = String(type).toLowerCase().trim();
      const payload =
        normType === "overtime"
          ? {
              uid: auth.currentUser.uid,
              type: normType,
              reason,
              date,
              startTime,
              endTime,
              durationMinutes: overtimeMinutes, // biar kebaca admin/export
              attachment,
            }
          : {
              uid: auth.currentUser.uid,
              type: normType,
              reason,
              from,
              to,
              attachment,
            };

      await createRequest(payload);

      // reset
      setReason("");
      setFrom("");
      setTo("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      alert("Request terkirim ✅");
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || "Gagal mengirim request");
    } finally {
      setSubmitting(false);
    }
  };

  // UI helper: lihat label tanggal/lembur
  const isOvertime = type === "overtime";

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold">Ajukan Izin / Cuti / Sakit / Lembur</h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Jenis */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Jenis</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="leave">Cuti</option>
            <option value="sick">Sakit</option>
            <option value="correction">Koreksi Absen</option>
            <option value="overtime">Lembur</option>
          </select>
        </label>

        {/* Lampiran */}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">Lampiran (opsional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={[
              "image/*",
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ].join(",")}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
              <span className="rounded bg-gray-100 px-2 py-0.5">
                {file.name}
              </span>
              <span>• {fmtSize(file.size)}</span>
              <button
                className="text-blue-600 underline"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                hapus
              </button>
            </div>
          )}
        </label>

        {/* Jika lembur */}
        {isOvertime ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Tanggal</span>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Jam Mulai</span>
              <input
                type="time"
                className="input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Jam Selesai</span>
              <input
                type="time"
                className="input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Durasi:{" "}
                <b>{overtimeMinutes > 0 ? `${overtimeMinutes} menit` : "-"}</b>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Jika cuti/sakit/koreksi */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Dari Tanggal</span>
              <input
                type="date"
                className="input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-600">Sampai Tanggal</span>
              <input
                type="date"
                className="input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
      </div>

      {/* Alasan */}
      <label className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Alasan</span>
        <textarea
          className="input"
          rows={3}
          placeholder="Tulis alasan singkat"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      {/* Error kecil di bawah form */}
      {!isOvertime && from && to && new Date(from) > new Date(to) && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          Range tanggal tidak valid (From &gt; To)
        </div>
      )}
      {isOvertime && startTime && endTime && overtimeMinutes <= 0 && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          Jam selesai harus lebih besar dari jam mulai.
        </div>
      )}
      {errMsg && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      <button
        className="btn w-full"
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
      >
        {submitting ? "Mengirim..." : "Kirim Request"}
      </button>

      {/* Riwayat request milik user */}
      <div className="border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium">Riwayat Pengajuan</h4>
          <span className="text-xs text-gray-500">
            {loadingList ? "memuat…" : `${rows.length} data`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Jenis</th>
                <th className="py-2 pr-4">Tanggal</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Lampiran</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={4}>
                    Memuat…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={4}>
                    Belum ada pengajuan.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const url = pickUrl(r.attachment);
                  const isImg = url && /(png|jpe?g|webp|gif)$/i.test(url);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{prettyType(r.type)}</td>
                      <td className="py-2 pr-4">
                        {r.type === "overtime"
                          ? `${r.date} • ${r.startTime}–${r.endTime}${
                              r.durationMinutes
                                ? ` (${r.durationMinutes} mnt)`
                                : ""
                            }`
                          : `${r.from} — ${r.to}`}
                      </td>
                      <td className="py-2 pr-4">
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
                      </td>
                      <td className="py-2 pr-4">
                        {url ? (
                          <a
                            className="text-blue-600 underline"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            title={url}
                          >
                            {isImg ? "Lihat" : "Unduh"}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
