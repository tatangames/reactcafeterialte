// Indicadores de carga reutilizables (spinner + texto) para listas, tablas y pantallas de detalle.

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
    return (
        <span role="status" aria-label="Cargando" className={`inline-block shrink-0 animate-spin rounded-full border-[3px] border-gray-200 border-t-brand-500 ${className}`} />
    );
}

/** Bloque centrado con spinner y texto, para secciones o listas. */
export default function Cargando({ texto = "Cargando...", className = "py-10" }: { texto?: string; className?: string }) {
    return (
        <div className={`flex flex-col items-center justify-center gap-3 text-sm text-gray-500 ${className}`}>
            <Spinner className="h-8 w-8" />
            <span>{texto}</span>
        </div>
    );
}

/** Fila de tabla que ocupa todas las columnas mientras llegan los datos. */
export function FilaCargando({ colSpan, texto = "Cargando..." }: { colSpan: number; texto?: string }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4">
                <Cargando texto={texto} />
            </td>
        </tr>
    );
}

/** Pantalla de detalle completa (cuando aún no hay nada que mostrar). */
export function CargandoPagina({ texto = "Cargando..." }: { texto?: string }) {
    return <Cargando texto={texto} className="min-h-[50vh]" />;
}

/**
 * Capa translúcida con spinner sobre un contenedor que ya tiene datos y se está recargando
 * (cambio de filtro, página...). El contenedor padre debe tener `relative`.
 */
export function CapaCargando({ visible }: { visible: boolean }) {
    if (!visible) return null;
    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 dark:bg-gray-900/40">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-md ring-1 ring-gray-200">
                <Spinner className="h-4 w-4 border-2" />
                Cargando...
            </div>
        </div>
    );
}
