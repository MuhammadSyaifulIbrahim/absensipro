// src/pages/SignIn.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithGoogleSmart,
  getGoogleRedirectUser,
  ensureUserDoc,
} from "../lib/firebase";

export default function SignIn() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // proses hasil redirect (kalau login pakai redirect)
  useEffect(() => {
    (async () => {
      try {
        const user = await getGoogleRedirectUser();
        if (user) {
          setLoading(true);
          await ensureUserDoc(user);
          nav("/dashboard");
        }
      } catch (e) {
        console.error(e);
        setErr("Gagal memproses sesi login. Coba lagi ya.");
      } finally {
        setLoading(false);
      }
    })();
  }, [nav]);

  const go = async () => {
    setErr("");
    try {
      setLoading(true);
      const res = await signInWithGoogleSmart();
      // Jika popup berhasil, res ada; kalau redirect, res = null (ditangani useEffect)
      if (res?.user) {
        await ensureUserDoc(res.user);
        nav("/dashboard");
      }
    } catch (e) {
      console.error(e);
      setErr("Login gagal. Pastikan pakai akun Google kantor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Background pattern ringan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.12] bg-[radial-gradient(circle_at_1px_1px,_#000_1px,_transparent_0)] [background-size:14px_14px]"
      />
      {/* Accent blur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-[-10%] h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl"
      />

      {/* Container */}
      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo/title */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              {/* Minimal logo mark */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                className="opacity-90"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.92L18.18 22 12 18.77 5.82 22 7 14.19l-5-4.92 6.91-1.01L12 2z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                WS Absensi Pro
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Masuk dengan akun Google kantor
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-xl shadow-slate-800/5 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70">
            {/* Alert error */}
            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                {err}
              </div>
            )}

            <button
              onClick={go}
              disabled={loading}
              className="group relative inline-flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg shadow-slate-900/20 transition active:scale-[0.99] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900 dark:shadow-white/10 dark:hover:bg-slate-100"
            >
              {/* Google icon */}
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-white group-hover:scale-105 transition dark:bg-slate-900">
                <svg viewBox="0 0 48 48" className="h-4 w-4">
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.873 31.42 29.316 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.6 5.043 29.57 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.814C14.377 16.14 18.838 13 24 13c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.6 5.043 29.57 3 24 3 16.318 3 9.656 7.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 43c5.237 0 10.01-2.004 13.6-5.27l-6.275-5.308C29.257 34.464 26.76 35 24 35c-5.296 0-9.869-3.607-11.474-8.49l-6.49 5.004C8.323 38.738 15.561 43 24 43z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303A11.99 11.99 0 0 1 24 35c-5.296 0-9.869-3.607-11.474-8.49l-6.49 5.004C8.323 38.738 15.561 43 24 43c11.045 0 20-8.955 20-20 0-1.341-.138-2.651-.389-3.917z"
                  />
                </svg>
              </span>
              <span className="font-medium tracking-tight">
                Masuk dengan Google
              </span>

              {/* Loading spinner */}
              {loading && (
                <span className="absolute right-4 inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/50 border-t-white dark:border-slate-900/50 dark:border-t-slate-900" />
              )}
            </button>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
              <span>atau</span>
              <div className="h-px w-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Info teks */}
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Dengan masuk, kamu menyetujui{" "}
              <a
                href="#"
                className="font-medium text-slate-700 underline decoration-dotted hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
              >
                Kebijakan Privasi
              </a>{" "}
              dan{" "}
              <a
                href="#"
                className="font-medium text-slate-700 underline decoration-dotted hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
              >
                Syarat & Ketentuan
              </a>
              .
            </p>
          </div>

          {/* Footer kecil */}
          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} WS Workspace — Absensi Pro
          </div>
        </div>
      </div>
    </div>
  );
}
