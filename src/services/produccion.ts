// Servicios de Producción, recetas y mermas (Fase 8)

import { api } from "./api";
import {
    CatalogoProduccionInterface,
    MermaInterface,
    MotivoMerma,
    ProduccionInterface,
    RecetaInterface,
    ResumenProduccionInterface,
} from "../types/produccion";

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getCatalogoProduccion = async (): Promise<CatalogoProduccionInterface> => {
    const { data } = await api.get("/produccion/catalogo");
    return data;
};

// ── Recetas ────────────────────────────────────────────────
export interface RecetaPayload {
    producto_id: number;
    nombre?: string;
    rendimiento: number;
    notas?: string;
    ingredientes: { producto_id: number; unidad_medida_id: number; cantidad: number; merma_porcentaje?: number }[];
}

export const getRecetas = async (filtros: { buscar?: string; todas?: boolean } = {}): Promise<RecetaInterface[]> => {
    const { data } = await api.get("/produccion/recetas", { params: limpiar({ ...filtros, todas: filtros.todas ? 1 : undefined }) });
    return data.recetas;
};

export const getReceta = async (id: number): Promise<RecetaInterface> => {
    const { data } = await api.get(`/produccion/recetas/${id}`);
    return data.receta;
};

export const guardarReceta = async (payload: RecetaPayload, id?: number) => {
    const { data } = id ? await api.put(`/produccion/recetas/${id}`, payload) : await api.post("/produccion/recetas", payload);
    return data as { success: number; message: string; receta: RecetaInterface };
};

export const activarReceta = async (id: number, activa: boolean) => {
    const { data } = await api.post(`/produccion/recetas/${id}/activar`, { activa });
    return data as { success: number; message: string; receta: RecetaInterface };
};

// ── Producción ─────────────────────────────────────────────
export const getProducciones = async (filtros: { desde?: string; hasta?: string; producto_id?: number; estado?: string } = {}): Promise<ProduccionInterface[]> => {
    const { data } = await api.get("/produccion", { params: limpiar(filtros) });
    return data.producciones;
};

export const getProduccion = async (id: number): Promise<ProduccionInterface> => {
    const { data } = await api.get(`/produccion/${id}`);
    return data.produccion;
};

export const registrarProduccion = async (payload: {
    uuid: string; receta_id: number; fecha?: string; cantidad_planificada?: number; cantidad_producida: number;
    observaciones?: string; consumos?: { producto_id: number; cantidad_real: number }[];
}) => {
    const { data } = await api.post("/produccion", payload);
    return data as { success: number; message: string; produccion: ProduccionInterface };
};

export const anularProduccion = async (id: number, motivo: string) => {
    const { data } = await api.post(`/produccion/${id}/anular`, { motivo });
    return data as { success: number; message: string; produccion: ProduccionInterface };
};

export const getResumenProduccion = async (rango: { desde?: string; hasta?: string }): Promise<ResumenProduccionInterface> => {
    const { data } = await api.get("/produccion/resumen", { params: limpiar(rango) });
    return data.resumen;
};

// ── Mermas ─────────────────────────────────────────────────
export const getMermas = async (filtros: { desde?: string; hasta?: string; motivo?: string } = {}) => {
    const { data } = await api.get("/mermas", { params: limpiar(filtros) });
    return data as { mermas: MermaInterface[]; total: number };
};

export const registrarMermas = async (fecha: string, items: { uuid: string; producto_id: number; cantidad: number; motivo: MotivoMerma; detalle?: string }[]) => {
    const { data } = await api.post("/mermas", { fecha, items });
    return data as { success: number; message: string; mermas: MermaInterface[] };
};

export const anularMerma = async (id: number, motivo: string) => {
    const { data } = await api.post(`/mermas/${id}/anular`, { motivo });
    return data as { success: number; message: string; merma: MermaInterface };
};
