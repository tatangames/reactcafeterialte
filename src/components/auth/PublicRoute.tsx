// components/PublicRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "../../utils/auth";

const PublicRoute = () => {
  const token = getToken();

  // Si YA está logeado → mándalo al dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
