import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <span className="text-sm">加载中…</span>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <>{children}</>;
};
