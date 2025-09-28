import { useEffect, useState } from "react";
import { onAuth } from "../lib/firebase";
import { Navigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProtectedRoute({ children, requireRole }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuth(async (u) => {
      setUser(u || null);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        setRole(snap.exists() ? snap.data().role : "staff");
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div>Loading…</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (requireRole && role !== requireRole)
    return <Navigate to="/dashboard" replace />;
  return children;
}
