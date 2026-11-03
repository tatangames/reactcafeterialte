import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getAlertasStock } from "../../services/inventario";
import { AlertaStockInterface } from "../../types/interfaces";
import { cantidad } from "../../utils/formato";

const INTERVALO_MS = 5 * 60 * 1000; // revisa cada 5 minutos

// Campana con los productos en o bajo su stock mínimo
export default function AlertasStockBell() {
    const { hasAnyPermission } = useAuth();
    const location = useLocation();
    const puedeVer = hasAnyPermission(["inventario.ver", "productos.gestionar"]);

    const [total, setTotal] = useState(0);
    const [productos, setProductos] = useState<AlertaStockInterface[]>([]);
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const cargar = useCallback(() => {
        getAlertasStock()
            .then((res) => {
                setTotal(res.total);
                setProductos(res.productos);
            })
            .catch(() => { /* sin conexión: se conserva lo último */ });
    }, []);

    useEffect(() => {
        if (!puedeVer) return;
        cargar();
        const timer = setInterval(cargar, INTERVALO_MS);
        return () => clearInterval(timer);
    }, [puedeVer, cargar]);

    // Al volver de inventario las cantidades pudieron cambiar
    useEffect(() => {
        if (puedeVer && location.pathname.startsWith("/admin/inventario")) cargar();
        setAbierto(false);
    }, [location.pathname]);

    useEffect(() => {
        const cerrar = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("mousedown", cerrar);
        return () => document.removeEventListener("mousedown", cerrar);
    }, []);

    if (!puedeVer) return null;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label={`Alertas de inventario: ${total}`}
                title="Alertas de inventario"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {total > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
                        {total > 99 ? "99+" : total}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">Stock bajo</p>
                        <p className="text-xs text-gray-500">
                            {total === 0 ? "Todo en orden" : `${total} producto(s) en o bajo su mínimo`}
                        </p>
                    </div>
                    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {productos.map((p) => (
                            <li key={p.producto_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <span className="text-sm text-gray-700">{p.producto}</span>
                                <span className={`whitespace-nowrap text-sm font-semibold ${p.stock_actual < 0 ? "text-red-600" : "text-amber-600"}`}>
                                    {cantidad(p.stock_actual, p.unidad)}
                                    <span className="font-normal text-gray-400"> / {cantidad(p.stock_minimo)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                    {total > 0 && (
                        <Link to="/admin/inventario" className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-blue-600 hover:bg-gray-50">
                            Ver inventario
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
