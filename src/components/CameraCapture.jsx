import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const [err, setErr] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    const setup = async () => {
      try {
        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        }

        await new Promise((resolve) => {
          const v = videoRef.current;
          if (!v) return resolve();
          if (v.readyState >= 1) return resolve();
          const onLoaded = () => {
            v.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          v.addEventListener("loadedmetadata", onLoaded);
        });

        try {
          await videoRef.current?.play();
        } catch (e) {
          if (e.name === "AbortError") {
            await new Promise((r) => requestAnimationFrame(r));
            await videoRef.current?.play();
          } else throw e;
        }

        if (mountedRef.current) setReady(true);
      } catch (e) {
        console.error("Camera error:", e);
        if (mountedRef.current) setErr(e?.message || String(e));
      }
    };

    setup();

    return () => {
      mountedRef.current = false;
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => onCapture && onCapture(b), "image/jpeg", 0.8);
  };

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-xl bg-black/5 shadow-sm"
      />
      <button onClick={snap} className="btn w-full" disabled={!ready}>
        {ready ? "📸 Ambil Foto" : "Mengaktifkan Kamera…"}
      </button>
      {err && <p className="text-sm text-red-600">Kamera gagal: {err}</p>}
      <p className="text-xs text-gray-500">
        Jika kamera tidak menyala (iPhone/Safari), coba tap tombol sekali untuk
        memberi izin.
      </p>
    </div>
  );
}
