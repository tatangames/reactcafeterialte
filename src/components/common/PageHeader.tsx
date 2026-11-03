import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    backTo?: string;       // Muestra el botón "← Volver" hacia esta ruta
    actions?: ReactNode;   // Botones a la derecha
}

// Encabezado estándar de las pantallas de administración
export default function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3">
            {backTo && (
                <button
                    type="button"
                    onClick={() => navigate(backTo)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                    ← Volver
                </button>
            )}
            <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">{title}</h1>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
