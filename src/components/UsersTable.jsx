// src/components/UsersTable.jsx
import { useEffect, useState } from "react";
import { listUsersPage, setUserRole, setUserActive } from "../lib/users";

export default function UsersTable() {
  const [rows, setRows] = useState([]);
  const [last, setLast] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState(null);
  const [err, setErr] = useState(null);

  const loadFirst = async () => {
    try {
      setLoading(true);
      setErr(null);
      const { rows, last, hasMore } = await listUsersPage({ pageSize: 50 });
      setRows(rows);
      setLast(last);
      setHasMore(hasMore);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Gagal memuat users");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!last) return;
    const res = await listUsersPage({ pageSize: 50, afterDoc: last });
    setRows((prev) => [...prev, ...res.rows]);
    setLast(res.last);
    setHasMore(res.hasMore);
  };

  useEffect(() => {
    loadFirst();
  }, []);

  const changeRole = async (uid, role) => {
    try {
      setBusyUid(uid);
      await setUserRole(uid, role);
      setRows((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah role");
    } finally {
      setBusyUid(null);
    }
  };

  const toggleActive = async (uid, active) => {
    try {
      setBusyUid(uid);
      await setUserActive(uid, active);
      setRows((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, active } : u))
      );
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah status aktif");
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="space-y-3">
      {err && (
        <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">Nama</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Aktif</th>
              <th className="py-2 pr-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={5}>
                  Memuat data…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="py-4 text-gray-500" colSpan={5}>
                  Tidak ada user
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-2 pr-4">{u.name || u.uid}</td>
                  <td className="py-2 pr-4">{u.email || "-"}</td>
                  <td className="py-2 pr-4 capitalize">
                    <select
                      className="input"
                      disabled={busyUid === u.uid}
                      value={u.role || "staff"}
                      onChange={(e) => changeRole(u.uid, e.target.value)}
                    >
                      <option value="staff">staff</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!u.active}
                        disabled={busyUid === u.uid}
                        onChange={(e) => toggleActive(u.uid, e.target.checked)}
                      />
                      <span>{u.active ? "Aktif" : "Nonaktif"}</span>
                    </label>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="text-xs text-gray-500">{u.uid}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {loading ? "memuat…" : `${rows.length} user`}
        </span>
        {hasMore && (
          <button className="btn" onClick={loadMore}>
            Muat lebih banyak
          </button>
        )}
      </div>
    </div>
  );
}
