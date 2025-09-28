// src/components/CheckInCard.jsx
import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { uploadToCloudinary } from "../lib/cloudinary";
import { recordAttendance, lastAttendanceToday } from "../lib/attendance";
import CameraCapture from "./CameraCapture";

// helper ambil nilai URL dari hasil upload (string atau object)
function pickUrl(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.secure_url || x.url || null;
}

function prettyType(t) {
  return t === "checkin"
    ? "Absen Masuk"
    : t === "checkout"
    ? "Absen Pulang"
    : t;
}

export default function CheckInCard() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // "checkin" | "checkout"
  const [preview, setPreview] = useState(null); // dataURL untuk preview
  const [blobFile, setBlobFile] = useState(null); // Blob terakhir
  const [last, setLast] = useState(null); // last attendance today
  const [errMsg, setErrMsg] = useState("");

  // load last attendance untuk menentukan nextType
  useEffect(() => {
    (async () => {
      if (!auth.currentUser) return;
      try {
        const l = await lastAttendanceToday(auth.currentUser.uid);
        setLast(l || null);
        setStatus(l?.type || null);
      } catch (e) {
        // silent
      }
    })();
  }, []);

  const nextType = useMemo(
    () => (last?.type === "checkin" ? "checkout" : "checkin"),
    [last]
  );

  const getLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });

  // dipanggil CameraCapture saat ambil foto
  const onCapture = async (blob) => {
    setErrMsg("");
    setBlobFile(blob || null);
    // buat preview supaya user bisa cek dulu
    if (blob) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(blob);
    } else {
      setPreview(null);
    }
  };

  const submit = async () => {
    setErrMsg("");
    if (!auth.currentUser) return alert("Harus login dulu");
    if (!blobFile) return alert("Ambil foto dulu ya");

    try {
      setLoading(true);

      // 1) upload foto -> url string
      const file = new File([blobFile], `absen-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      const uploaded = await uploadToCloudinary(file);
      const photoUrl = pickUrl(uploaded);
      if (!photoUrl) throw new Error("Gagal mendapatkan URL foto");

      // 2) lokasi (opsional)
      const location = await getLocation();

      // 3) tanggal ymd (yyyy-mm-dd)
      const now = new Date();
      const ymd = now.toISOString().slice(0, 10);

      // 4) hitung terlambat (> 08:00)
      const workStart = new Date(now);
      workStart.setHours(8, 0, 0, 0);
      let statusText = "-";
      let lateMinutes = 0;

      if (nextType === "checkin") {
        const diff = Math.floor((now - workStart) / 60000); // menit
        if (diff > 0) {
          statusText = "late"; // simpan kode ringkas; render UI yang ramah di table/export
          lateMinutes = diff;
        } else {
          statusText = "ontime";
        }
      }

      // 5) simpan attendance
      await recordAttendance({
        uid: auth.currentUser.uid,
        type: nextType, // "checkin" | "checkout"
        photoUrl,
        location,
        ymd,
        status: statusText, // "ontime" | "late" | "-"
        lateMinutes, // number
      });

      // 6) refresh last & state
      const l = await lastAttendanceToday(auth.currentUser.uid);
      setLast(l || { type: nextType });
      setStatus(nextType);
      setPreview(null);
      setBlobFile(null);

      alert(`Berhasil ${prettyType(nextType)}`);
    } catch (e) {
      console.error(e);
      // hint error umum dari rules
      if (String(e).includes("Missing or insufficient permissions")) {
        setErrMsg(
          "Gagal menyimpan ke Firestore (permissions). Cek Firestore Rules untuk koleksi attendance: field wajib (uid,type,photoUrl,location,ymd,status,lateMinutes,createdAt) & createdAt pakai serverTimestamp()."
        );
      } else {
        setErrMsg(e.message || "Gagal menyimpan absensi");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPreview = () => {
    setPreview(null);
    setBlobFile(null);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Ambil Absensi</h3>
        <span className="text-xs text-gray-500">
          Berikutnya: <b>{prettyType(nextType)}</b>
        </span>
      </div>

      {/* Kamera atau Preview */}
      {preview ? (
        <div className="space-y-3">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-xl border object-contain"
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={resetPreview} className="btn">
              Ambil Ulang
            </button>
            <button
              onClick={submit}
              className="btn bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? "Menyimpan…" : `Kirim ${prettyType(nextType)}`}
            </button>
          </div>
        </div>
      ) : (
        <>
          <CameraCapture onCapture={onCapture} />
          <button className="btn w-full" disabled>
            Foto wajib sebagai bukti
          </button>
        </>
      )}

      {loading && <p className="text-sm text-gray-500">Menyimpan…</p>}
      {status && (
        <p className="text-sm text-green-700">
          Status hari ini: <b>{prettyType(status)}</b>
        </p>
      )}
      {errMsg && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {errMsg}
        </div>
      )}
      <p className="text-xs text-gray-500">
        Tips: aktifkan lokasi agar admin bisa melihat titik absen.
      </p>
    </div>
  );
}
