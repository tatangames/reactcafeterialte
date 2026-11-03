// Impresión en impresoras térmicas (Fase 4). El token lo agrega el interceptor de api.ts

import { api } from "./api";
import { mensajeError } from "../utils/formato";
import { PaginaInterface, ResultadoImpresionInterface, TrabajoImpresionInterface } from "../types/interfaces";

export const imprimirVentaServidor = async (
    ventaId: number,
    opciones: { caja_id?: number | null; copia?: boolean; comandas?: boolean } = {}
): Promise<ResultadoImpresionInterface> => {
    const { data } = await api.post(`/impresion/ventas/${ventaId}`, opciones);
    return data;
};

export const imprimirComandasPedido = async (pedidoId: number): Promise<ResultadoImpresionInterface> => {
    const { data } = await api.post(`/impresion/pedidos/${pedidoId}/comandas`);
    return data;
};

export const imprimirTurnoServidor = async (turnoId: number, cajaId?: number | null): Promise<ResultadoImpresionInterface> => {
    const { data } = await api.post(`/impresion/turnos/${turnoId}`, { caja_id: cajaId ?? undefined });
    return data;
};

export const abrirCajon = async (cajaId: number, motivo: string): Promise<ResultadoImpresionInterface> => {
    const { data } = await api.post("/impresion/cajon", { caja_id: cajaId, motivo });
    return data;
};

export const getTrabajosImpresion = async (
    filtros: { estado?: string; page?: number } = {}
): Promise<PaginaInterface & { trabajos: TrabajoImpresionInterface[]; con_error: number }> => {
    const { data } = await api.get("/impresion/trabajos", { params: filtros });
    return data;
};

export const reintentarTrabajo = async (id: number, impresoraId?: number): Promise<ResultadoImpresionInterface> => {
    const { data } = await api.post(`/impresion/trabajos/${id}/reintentar`, { impresora_id: impresoraId });
    return data;
};

export const probarImpresora = async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post(`/admin/impresora/${id}/test`);
    return data;
};

/**
 * Intenta imprimir en la térmica y devuelve si se logró y por qué no.
 * Nunca lanza: la pantalla decide si ofrece imprimir desde el navegador.
 */
export const intentarImpresion = async (
    accion: () => Promise<ResultadoImpresionInterface>
): Promise<{ impreso: boolean; mensaje: string; trabajoId?: number }> => {
    try {
        const res = await accion();
        const fallido = res.trabajos.find((t) => t.estado === "error");
        return { impreso: res.impreso, mensaje: res.message, trabajoId: fallido?.id };
    } catch (error) {
        return { impreso: false, mensaje: mensajeError(error, "No se pudo imprimir") };
    }
};
