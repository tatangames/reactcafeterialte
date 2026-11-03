import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "./AuthContext";
import { getCatalogosCaja, getTurnoActual } from "../services/caja";
import { getCajaDispositivo, setCajaDispositivo } from "../utils/cajaDispositivo";
import { guardarCache, leerCache } from "../utils/offlineDb";
import { esErrorDeRed } from "../services/sync";
import { CatalogosCajaInterface, TurnoActualResponseInterface } from "../types/caja";

// Permisos que dan acceso a la caja del dispositivo (la caja y, más adelante, el POS)
export const PERMISOS_CAJA = ["caja.abrir", "caja.movimientos", "caja.arqueo", "caja.cerrar", "pos.vender"];

interface CajaContextType {
    cajaId: number | null;
    elegirCaja: (cajaId: number | null) => void;
    catalogos: CatalogosCajaInterface | null;
    actual: TurnoActualResponseInterface | null; // turno abierto de la caja (o turno: null)
    cargando: boolean;
    refrescar: () => Promise<void>;
}

const CajaContext = createContext<CajaContextType | undefined>(undefined);

export const CajaProvider = ({ children }: { children: ReactNode }) => {
    const { user, hasAnyPermission } = useAuth();
    const puedeUsarCaja = !!user && hasAnyPermission(PERMISOS_CAJA);

    const [cajaId, setCajaId] = useState<number | null>(getCajaDispositivo);
    const [catalogos, setCatalogos] = useState<CatalogosCajaInterface | null>(null);
    const [actual, setActual] = useState<TurnoActualResponseInterface | null>(null);
    const [cargando, setCargando] = useState(false);

    const refrescar = useCallback(async () => {
        if (!puedeUsarCaja) return;
        setCargando(true);
        try {
            const cats = await getCatalogosCaja();
            setCatalogos(cats);
            guardarCache("caja_catalogos", cats);

            // Con una sola caja activa no hace falta elegir
            let id = cajaId;
            if (!id && cats.cajas.length === 1) {
                id = cats.cajas[0].id;
                setCajaDispositivo(id);
                setCajaId(id);
            }
            // La caja guardada ya no existe o fue desactivada
            if (id && !cats.cajas.some((c) => c.id === id)) {
                id = null;
                setCajaDispositivo(null);
                setCajaId(null);
            }

            const turno = id ? await getTurnoActual(id) : null;
            setActual(turno);
            if (id) guardarCache(`caja_turno_${id}`, turno);
        } catch (error) {
            // Sin servidor: se trabaja con la última copia guardada en el dispositivo
            if (esErrorDeRed(error)) {
                const cats = await leerCache<CatalogosCajaInterface>("caja_catalogos");
                if (cats) setCatalogos(cats.valor);
                if (cajaId) {
                    const turno = await leerCache<TurnoActualResponseInterface>(`caja_turno_${cajaId}`);
                    if (turno) setActual(turno.valor);
                }
            } else {
                console.error("Error al cargar la caja:", error);
            }
        } finally {
            setCargando(false);
        }
    }, [puedeUsarCaja, cajaId]);

    useEffect(() => {
        if (puedeUsarCaja) {
            refrescar();
        } else {
            setCatalogos(null);
            setActual(null);
        }
    }, [puedeUsarCaja, cajaId]);

    const elegirCaja = (id: number | null) => {
        setCajaDispositivo(id);
        setCajaId(id);
        setActual(null);
    };

    return (
        <CajaContext.Provider value={{ cajaId, elegirCaja, catalogos, actual, cargando, refrescar }}>
            {children}
        </CajaContext.Provider>
    );
};

export const useCaja = () => {
    const context = useContext(CajaContext);
    if (context === undefined) {
        throw new Error("useCaja must be used within a CajaProvider");
    }
    return context;
};
