import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "./AuthContext";
import { enviarVentasOffline, esErrorDeRed, ping, VentaOfflinePayload } from "../services/sync";
import { guardarEnCola, leerCola, quitarDeCola } from "../utils/offlineDb";
import { VentaInterface } from "../types/pos";

// Venta hecha sin conexión, guardada en el dispositivo hasta sincronizarla
export interface VentaEnCola {
    uuid: string;
    payload: VentaOfflinePayload;
    ticket: VentaInterface;       // para reimprimirla mientras espera
    creado: string;
    estado: "pendiente" | "error";
    error?: string;
    intentos: number;
}

interface ConexionContextType {
    enLinea: boolean;
    cola: VentaEnCola[];
    sincronizando: boolean;
    encolar: (venta: VentaEnCola) => Promise<void>;
    sincronizar: () => Promise<void>;
    reportarErrorDeRed: () => void;
}

const ConexionContext = createContext<ConexionContextType | undefined>(undefined);

const INTERVALO_PING = 15_000;   // sin conexión: cada cuánto se vuelve a intentar
const INTERVALO_SYNC = 60_000;   // con conexión y ventas en cola: reintento periódico
const LOTE = 50;

export const ConexionProvider = ({ children }: { children: ReactNode }) => {
    const { user, hasPermission } = useAuth();
    const activo = !!user && hasPermission("pos.vender");

    const [enLinea, setEnLinea] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
    const [cola, setCola] = useState<VentaEnCola[]>([]);
    const [sincronizando, setSincronizando] = useState(false);
    const enCurso = useRef(false);

    const recargarCola = useCallback(async () => {
        const items = await leerCola<VentaEnCola>();
        items.sort((a, b) => a.creado.localeCompare(b.creado));
        setCola(items);
        return items;
    }, []);

    useEffect(() => { recargarCola(); }, [recargarCola]);

    const sincronizar = useCallback(async () => {
        if (enCurso.current || !activo) return;
        enCurso.current = true;
        setSincronizando(true);

        let creadas = 0;
        let conConflicto = 0;
        let errores = 0;

        try {
            const items = await recargarCola();
            for (let i = 0; i < items.length; i += LOTE) {
                const lote = items.slice(i, i + LOTE);
                const resultados = await enviarVentasOffline(lote.map((v) => v.payload));
                setEnLinea(true);

                for (const r of resultados) {
                    const item = lote.find((v) => v.uuid === r.uuid);
                    if (!item) continue;

                    if (r.estado === "creada" || r.estado === "ya_existia") {
                        await quitarDeCola(r.uuid);
                        if (r.estado === "creada") creadas++;
                        if (r.conflictos?.length) conConflicto++;
                    } else {
                        errores++;
                        await guardarEnCola({ ...item, estado: "error", error: r.message, intentos: item.intentos + 1 });
                    }
                }
            }

            if (creadas) {
                toast.success(`${creadas} venta(s) sin conexión sincronizada(s)` + (conConflicto ? ` · ${conConflicto} con observaciones` : ""));
            }
            if (errores) {
                toast.error(`${errores} venta(s) no se pudieron sincronizar. Revisa el detalle en el indicador de conexión.`);
            }
        } catch (error) {
            if (esErrorDeRed(error)) setEnLinea(false);
        } finally {
            await recargarCola();
            enCurso.current = false;
            setSincronizando(false);
        }
    }, [activo, recargarCola]);

    const encolar = useCallback(async (venta: VentaEnCola) => {
        await guardarEnCola(venta);
        await recargarCola();
    }, [recargarCola]);

    const reportarErrorDeRed = useCallback(() => setEnLinea(false), []);

    // Eventos del navegador (cable desconectado, Wi-Fi apagado)
    useEffect(() => {
        const alPerder = () => setEnLinea(false);
        const alRecuperar = async () => setEnLinea(await ping());
        window.addEventListener("offline", alPerder);
        window.addEventListener("online", alRecuperar);
        return () => {
            window.removeEventListener("offline", alPerder);
            window.removeEventListener("online", alRecuperar);
        };
    }, []);

    // Sin conexión: se pregunta al servidor cada 15 s si ya volvió
    useEffect(() => {
        if (!activo || enLinea) return;
        const timer = setInterval(async () => {
            if (await ping()) setEnLinea(true);
        }, INTERVALO_PING);
        return () => clearInterval(timer);
    }, [activo, enLinea]);

    // Al volver la conexión (o al entrar) se envía lo pendiente; luego se reintenta cada minuto
    const pendientes = cola.length;
    useEffect(() => {
        if (!activo || !enLinea || pendientes === 0) return;
        sincronizar();
        const timer = setInterval(sincronizar, INTERVALO_SYNC);
        return () => clearInterval(timer);
    }, [activo, enLinea, pendientes > 0, sincronizar]);

    return (
        <ConexionContext.Provider value={{ enLinea, cola, sincronizando, encolar, sincronizar, reportarErrorDeRed }}>
            {children}
        </ConexionContext.Provider>
    );
};

export const useConexion = () => {
    const context = useContext(ConexionContext);
    if (context === undefined) {
        throw new Error("useConexion must be used within a ConexionProvider");
    }
    return context;
};
