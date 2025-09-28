// src/App.jsx
import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { onAuth, logOut, db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const unsub = onAuth(async (u) => {
      setUser(u || null);
      try {
        if (u) {
          const snap = await getDoc(doc(db, "users", u.uid));
          setRole(snap.exists() ? snap.data().role : "staff");
        } else {
          setRole(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logOut();
    nav("/signin");
  };

  // label & style badge role
  const roleBadge = useMemo(() => {
    if (!role) return null;
    const label =
      role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Staff";
    const cls =
      role === "admin"
        ? "bg-rose-100 text-rose-700 border-rose-200"
        : role === "manager"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-slate-100 text-slate-700 border-slate-200";
    return (
      <span
        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}
      >
        {label}
      </span>
    );
  }, [role]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="container-pro flex h-14 items-center justify-between">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-600 text-white shadow shadow-blue-600/20">
              {/* logo kecil */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="opacity-95"
              >
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.92L18.18 22 12 18.77 5.82 22 7 14.19l-5-4.92 6.91-1.01L12 2z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="transition-colors group-hover:text-slate-900">
              Absensi Pro
            </span>
            {roleBadge && (
              <span className="ml-1 hidden sm:inline-flex">{roleBadge}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <NavItem to="/dashboard">Dashboard</NavItem>
            {role === "admin" && <NavItem to="/admin">Admin</NavItem>}

            {/* User area */}
            {loading ? (
              <div className="ml-2 h-9 w-28 animate-pulse rounded-lg bg-slate-200" />
            ) : user ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-slate-50"
                >
                  <img
                    src={user.photoURL || "easyinaja"}
                    alt="avatar"
                    className="h-7 w-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left leading-tight">
                    <div className="font-medium text-slate-800 line-clamp-1">
                      {user.displayName || "User"}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-1">
                      {user.email}
                    </div>
                  </div>
                  <svg
                    className={`h-4 w-4 text-slate-400 transition ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <div className="px-3 py-2 text-xs text-slate-500">
                      Masuk sebagai
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <img
                        src={user.photoURL || "https://i.pravatar.cc/40"}
                        alt="avatar"
                        className="h-8 w-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {user.displayName || "User"}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <svg
                        className="h-4 w-4 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M16 13v-2H7V8l-5 4 5 4v-3h9z" />
                        <path d="M20 3h-8v2h8v14h-8v2h8a2 2 0 002-2V5a2 2 0 00-2-2z" />
                      </svg>
                      Keluar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/signin" className="btn">
                Masuk
              </Link>
            )}
          </nav>

          {/* Mobile toggles */}
          <div className="md:hidden">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            ) : user ? (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white"
              >
                <img
                  src={user.photoURL || "https://i.pravatar.cc/40"}
                  alt="avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ) : (
              <Link to="/signin" className="btn h-9 px-3 text-sm">
                Masuk
              </Link>
            )}
          </div>
        </div>

        {/* Mobile sheet */}
        <MobileMenu
          open={menuOpen}
          setOpen={setMenuOpen}
          role={role}
          user={user}
          onLogout={handleLogout}
        />
      </header>

      {/* Main content */}
      <main className="container-pro py-6">
        {/* Skeleton untuk halaman saat auth loading */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-10 w-56 animate-pulse rounded-lg bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
            </div>
          </div>
        ) : (
          <Outlet context={{ user, role }} />
        )}
      </main>
    </div>
  );
}

/** Item nav dengan state aktif */
function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "rounded-xl px-3 py-1.5 text-sm font-medium transition " +
        (isActive
          ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
          : "text-slate-700 hover:bg-slate-100")
      }
    >
      {children}
    </NavLink>
  );
}

/** Mobile menu sederhana */
function MobileMenu({ open, setOpen, role, user, onLogout }) {
  if (!open) return null;
  return (
    <div className="md:hidden border-t border-slate-200 bg-white px-4 pb-3 pt-2">
      <div className="flex items-center gap-3 py-2">
        <img
          src={user?.photoURL || "https://i.pravatar.cc/40"}
          alt="avatar"
          className="h-10 w-10 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">
            {user?.displayName || "User"}
          </div>
          <div className="truncate text-xs text-slate-500">{user?.email}</div>
        </div>
        {role && (
          <span className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
            {role}
          </span>
        )}
      </div>

      <div className="mt-2 grid gap-2">
        <NavLink
          to="/dashboard"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            "rounded-lg px-3 py-2 text-sm " +
            (isActive
              ? "bg-slate-900 text-white"
              : "bg-slate-50 text-slate-700")
          }
        >
          Dashboard
        </NavLink>
        {role === "admin" && (
          <NavLink
            to="/admin"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              "rounded-lg px-3 py-2 text-sm " +
              (isActive
                ? "bg-slate-900 text-white"
                : "bg-slate-50 text-slate-700")
            }
          >
            Admin
          </NavLink>
        )}
        <button
          onClick={() => {
            setOpen(false);
            onLogout();
          }}
          className="rounded-lg bg-rose-50 px-3 py-2 text-left text-sm text-rose-700"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
