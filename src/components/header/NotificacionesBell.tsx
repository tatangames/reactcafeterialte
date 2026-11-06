import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    EVENTO_NOTIFICACIONES,
    getResumenNotificaciones,
    haceCuanto,
    leerTodas,
    marcarLeida,
    NotificacionInterface,
} from "../../services/notificaciones";
import { mensajeError } from "../../utils/formato";

const INTERVALO_MS = 2 * 60 * 1000; // revisa cada 2 minutos

// Punto de color según el tipo de aviso
export const colorTipo = (n: Pick<NotificacionInterface, "tipo">) =>
    n.tipo === "stock_negativo" ? "bg-red-500" : "bg-amber-500";

// Campana con las notificaciones del usuario: el número es lo que no ha visto
export default function NotificacionesBell() {
    const location = useLocation();
    const navigate = useNavigate();

    const [noLeidas, setNoLeidas] = useState(0);
    const [recientes, setRecientes] = useState<NotificacionInterface[]>([]);
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const cargar = useCallback(() => {
        getResumenNotificaciones()
            .then((res) => {
                setNoLeidas(res.no_leidas);
                setRecientes(res.recientes);
            })
            .catch(() => { /* sin conexión: se conserva lo último */ });
    }, []);

    // La primera carga la hace el efecto de la ruta (abajo)
    useEffect(() => {
        const timer = setInterval(cargar, INTERVALO_MS);
        window.addEventListener(EVENTO_NOTIFICACIONES, cargar);
        window.addEventListener("focus", cargar);
        return () => {
            clearInterval(timer);
            window.removeEventListener(EVENTO_NOTIFICACIONES, cargar);
            window.removeEventListener("focus", cargar);
        };
    }, [cargar]);

    // Al cambiar de pantalla pudo moverse el inventario (venta, entrada, ajuste)
    useEffect(() => {
        cargar();
        setAbierto(false);
    }, [location.pathname, cargar]);

    useEffect(() => {
        const cerrar = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("mousedown", cerrar);
        return () => document.removeEventListener("mousedown", cerrar);
    }, []);

    const marcarTodas = () => {
        leerTodas()
            .then(() => toast.success("Listo, todas marcadas como vistas"))
            .catch((e) => toast.error(mensajeError(e, "No se pudieron marcar")));
    };

    const abrir = (n: NotificacionInterface) => {
        if (!n.leida) marcarLeida(n.id).catch(() => null);
        setAbierto(false);
        if (n.enlace) navigate(n.enlace);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label={`Notificaciones sin ver: ${noLeidas}`}
                title="Notificaciones"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {noLeidas > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                        {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-gray-800">Notificaciones</p>
                            <p className="text-xs text-gray-500">
                                {noLeidas === 0 ? "Estás al día" : `${noLeidas} sin ver`}
                            </p>
                        </div>
                        {noLeidas > 0 && (
                            <button
                                type="button"
                                onClick={marcarTodas}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            >
                                Marcar todas como vistas
                            </button>
                        )}
                    </div>

                    <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
                        {recientes.length === 0 && (
                            <li className="px-4 py-8 text-center text-sm text-gray-500">No tienes notificaciones</li>
                        )}
                        {recientes.map((n) => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => abrir(n)}
                                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 ${n.leida ? "" : "bg-blue-50/40"}`}
                                >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.leida ? "bg-gray-300" : colorTipo(n)}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-sm ${n.leida ? "text-gray-600" : "font-semibold text-gray-800"}`}>{n.titulo}</span>
                                        {n.mensaje && <span className="block text-xs text-gray-500">{n.mensaje}</span>}
                                        <span className="mt-0.5 block text-[11px] text-gray-400">
                                            {haceCuanto(n.fecha)}
                                            {n.sigue_en_alerta === false && <span className="ml-1.5 text-green-600">· ya repuesto</span>}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <Link
                        to="/notificaciones"
                        className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-gray-50"
                    >
                        Ver todas
                    </Link>
                </div>
            )}
        </div>
    );
}
