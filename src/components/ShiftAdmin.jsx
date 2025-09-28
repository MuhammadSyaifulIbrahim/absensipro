// src/components/ShiftAdmin.jsx
import { useEffect, useState } from "react";
import { createShift, listShifts, setUserShift } from "../lib/shifts";
import { listUsersPage } from "../lib/users";

export default function ShiftAdmin() {
  const [shifts, setShifts] = useState([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [grace, setGrace] = useState(15);
  const [breakMin, setBreakMin] = useState(60);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const load = async () => setShifts(await listShifts());

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      const { rows } = await listUsersPage({ pageSize: 100 });
      setUsers(rows);
      setLoadingUsers(false);
    })();
  }, []);

  const add = async () => {
    if (!name || !start || !end) return alert("Lengkapi nama/start/end");
    await createShift({
      name,
      start,
      end,
      graceMinutes: Number(grace || 0),
      breakMinutes: Number(breakMin || 0),
    });
    setName("");
    setStart("09:00");
    setEnd("18:00");
    setGrace(15);
    setBreakMin(60);
    await load();
  };

  const assign = async (uid, shiftId) => {
    await setUserShift(uid, shiftId || null);
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, shiftId } : u))
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Buat shift */}
      <div className="card space-y-3">
        <h3 className="font-semibold">Buat Shift</h3>
        <input
          className="input"
          placeholder="Nama shift (mis. Shift Pagi)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Start</span>
            <input
              className="input"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">End</span>
            <input
              className="input"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Grace (menit)</span>
            <input
              className="input"
              type="number"
              value={grace}
              onChange={(e) => setGrace(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Break (menit)</span>
            <input
              className="input"
              type="number"
              value={breakMin}
              onChange={(e) => setBreakMin(e.target.value)}
            />
          </label>
        </div>
        <button className="btn w-full" onClick={add}>
          Simpan Shift
        </button>

        <div className="border-t pt-3">
          <h4 className="font-medium mb-2">Daftar Shift</h4>
          <ul className="list-disc pl-5 space-y-1">
            {shifts.map((s) => (
              <li key={s.id}>
                <b>{s.name}</b> — {s.start}–{s.end} (grace {s.graceMinutes || 0}
                m)
              </li>
            ))}
            {shifts.length === 0 && (
              <li className="text-gray-500">Belum ada shift</li>
            )}
          </ul>
        </div>
      </div>

      {/* Assign ke user */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Assign Shift ke User</h3>
          <span className="text-xs text-gray-500">
            {loadingUsers ? "memuat…" : `${users.length} user`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Shift</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={3}>
                    Memuat…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={3}>
                    Tidak ada user
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 pr-4">{u.name || u.uid}</td>
                    <td className="py-2 pr-4">{u.email || "-"}</td>
                    <td className="py-2 pr-4">
                      <select
                        className="input"
                        value={u.shiftId || ""}
                        onChange={(e) => assign(u.uid, e.target.value || null)}
                      >
                        <option value="">— pilih shift —</option>
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.start})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
