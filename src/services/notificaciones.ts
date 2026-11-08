// Notificaciones del usuario que inició sesión (stock bajo, stock negativo...)

import { api } from "./api";
import { PaginaInterface } from "../types/interfaces";

export type TipoNotificacion = "stock_bajo" | "stock_negativo";

export interface NotificacionInterface {
    id: number;
    tipo: TipoNotificacion;
    titulo: string;
    mensaje: string | null;
    enlace: string | null;
    producto_id: number | null;
    leida: boolean;
    fecha: string; // ISO
    sigue_en_alerta: boolean | null; // cómo está el producto hoy
}

// La campana escucha este evento para refrescar el contador al instante
export const EVENTO_NOTIFICACIONES = "notificaciones:cambio";
const avisarCambio = () => window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES));

export const getResumenNotificaciones = async () => {
    const { data } = await api.get("/notificaciones/resumen");
    return data as { no_leidas: number; recientes: NotificacionInterface[] };
};

export const getNotificaciones = async (filtros: { estado?: "" | "no_leidas" | "leidas"; page?: number }) => {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined));
    const { data } = await api.get("/notificaciones", { params });
    return data as PaginaInterface & { notificaciones: NotificacionInterface[]; no_leidas: number };
};

export const leerTodas = async () => {
    const { data } = await api.post("/notificaciones/leer-todas");
    avisarCambio();
    return data as { marcadas: number };
};

export const marcarLeida = async (id: number, leida = true) => {
    await api.patch(`/notificaciones/${id}/leer`, { leida });
    avisarCambio();
};

export const borrarNotificacion = async (id: number) => {
    await api.delete(`/notificaciones/${id}`);
    avisarCambio();
};

export const vaciarNotificaciones = async (soloLeidas: boolean) => {
    const { data } = await api.delete("/notificaciones", { params: soloLeidas ? { solo: "leidas" } : {} });
    avisarCambio();
    return data as { borradas: number; message: string };
};

// "hace 5 min", "hace 2 h", "ayer", "03-11-2026"
export const haceCuanto = (iso: string): string => {
    const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seg < 60) return "ahora";
    if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
    if (seg < 172800) return "ayer";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
