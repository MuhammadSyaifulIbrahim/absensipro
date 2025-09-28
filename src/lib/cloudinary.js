// src/lib/cloudinary.js
// Env (Vite):
// VITE_CLOUDINARY_CLOUD_NAME
// VITE_CLOUDINARY_UPLOAD_PRESET  -> preset UNSIGNED, Resource type: AUTO

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload ke Cloudinary via endpoint AUTO (auto pilih resource_type).
 * Return: secure_url (string).
 * flags=inline -> agar dokumen (PDF) default diserve inline.
 */
export async function uploadToCloudinary(
  file,
  { folder = "absensi/requests", tags = [], context = {}, inline = true } = {}
) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary env belum di-set. Pastikan VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_UPLOAD_PRESET."
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  if (folder) form.append("folder", folder);
  if (Array.isArray(tags) && tags.length) form.append("tags", tags.join(","));
  const ctx = Object.entries(context || {});
  if (ctx.length)
    form.append("context", ctx.map(([k, v]) => `${k}=${v}`).join("|"));
  if (inline) form.append("flags", "inline");

  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    const msg =
      json?.error?.message || `Cloudinary upload gagal (${res.status})`;
    throw new Error(msg);
  }
  const url = json.secure_url || json.url;
  if (!url) throw new Error("Upload berhasil tetapi URL kosong.");
  return url;
}

/** Ambil URL dari string atau object Cloudinary (untuk data lama). */
export function pickCloudinaryUrl(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.secure_url || x.url || null;
}

/**
 * Buat URL preview:
 * - Jika resource_type=raw (URL berisi /raw/upload/), sisipkan fl_inline agar PDF tampil inline.
 * - Untuk image/video atau URL lain, biarkan apa adanya.
 */
export function makePreviewUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p.includes("/raw/upload/") && !p.includes("/fl_inline/")) {
      u.pathname = p.replace("/raw/upload/", "/raw/upload/fl_inline/");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** Deteksi PDF sederhana dari ekstensi. */
export function isPdfUrl(url) {
  return !!url && /\.pdf($|\?)/i.test(url);
}
