// components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute() {
    const auth = getAuth();

    // Si NO está autenticado, redirigir al login
    if (!auth) {
        return <Navigate to="/" replace />;
    }

    // Si está autenticado, renderizar las rutas hijas
    return <Outlet />;
}