// src/pages/Dashboard.jsx
import { useMemo } from "react";
import { useOutletContext, Navigate } from "react-router-dom";
import CheckInCard from "../components/CheckInCard";
import AttendanceTable from "../components/AttendanceTable";
import RequestForm from "../components/RequestForm";

export default function Dashboard() {
  const { user } = useOutletContext();
  if (!user) return <Navigate to="/signin" replace />;

  // fallback avatar & sapaan ringan
  const avatar = user.photoURL || "https://i.pravatar.cc/80?img=1";
  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 18) return "Selamat sore";
    return "Selamat malam";
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Kolom kiri: info user + absensi */}
      <div className="space-y-6">
        <div className="card flex items-center gap-3">
          <img
            src={avatar}
            alt={user.displayName || "User"}
            className="h-12 w-12 rounded-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="truncate font-semibold">
              {user.displayName || "User"}
            </div>
            <div className="truncate text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400">{greet} 👋</div>
          </div>
        </div>

        <CheckInCard />
      </div>

      {/* Kolom kanan: tabel absensi + form request */}
      <div className="space-y-6 lg:col-span-2">
        <AttendanceTable />
        {/* Form izin/cuti/sakit/lembur */}
        <RequestForm />
      </div>
    </div>
  );
}
