// components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute() {
    // Se suscribe a la sesión: si se cierra (en esta u otra pestaña, o expira), se vuelve a
    // evaluar y manda al login en vez de quedarse en una pantalla sin usuario
    useAuth();
    const auth = getAuth();

    // Si NO está autenticado, redirigir al login
    if (!auth) {
        return <Navigate to="/" replace />;
    }

    // Si está autenticado, renderizar las rutas hijas
    return <Outlet />;
}
