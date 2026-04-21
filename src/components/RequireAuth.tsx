import { useApp } from "@/data/store";
import { Navigate, useLocation } from "react-router-dom";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const user = useApp((s) => s.currentUser);
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
};
