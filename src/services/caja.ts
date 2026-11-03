// Servicios de caja y turnos (Fase 2). El token lo agrega el interceptor de api.ts

import { api } from "./api";
import {
    CajaInterface,
    CatalogosCajaInterface,
    HistorialTurnosResponseInterface,
    MetodoPagoInterface,
    MovimientoCajaInterface,
    TurnoActualResponseInterface,
    TurnoDetalleInterface,
} from "../types/caja";

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

// Conteo de gaveta: por denominaciones o con el total directo
export interface ConteoPayload {
    denominaciones?: Record<string, number>;
    efectivo_contado?: number;
    observaciones?: string;
}

export const getCatalogosCaja = async (): Promise<CatalogosCajaInterface> => {
    const { data } = await api.get("/caja/catalogos");
    return data;
};

export const getTurnoActual = async (cajaId: number): Promise<TurnoActualResponseInterface> => {
    const { data } = await api.get("/caja/turno-actual", { params: { caja_id: cajaId } });
    return data;
};

export const abrirTurno = async (payload: {
    caja_id: number;
    fondo_inicial: number;
    denominaciones?: Record<string, number>;
    observaciones?: string;
}): Promise<TurnoDetalleInterface & { message: string }> => {
    const { data } = await api.post("/caja/turnos/abrir", payload);
    return data;
};

export const registrarMovimientoCaja = async (
    turnoId: number,
    payload: { uuid: string; tipo: "ingreso" | "egreso"; monto: number; concepto: string; metodo_pago_id?: number; referencia?: string }
) => {
    const { data } = await api.post(`/caja/turnos/${turnoId}/movimientos`, payload);
    return data as { success: number; message: string; movimiento: MovimientoCajaInterface };
};

export const anularMovimientoCaja = async (movimientoId: number, motivo: string) => {
    const { data } = await api.post(`/caja/movimientos/${movimientoId}/anular`, { motivo });
    return data as { success: number; message: string };
};

export const registrarArqueo = async (turnoId: number, payload: ConteoPayload) => {
    const { data } = await api.post(`/caja/turnos/${turnoId}/arqueos`, payload);
    return data as { success: number; message: string; total_contado: number; diferencia: number | null };
};

export const cerrarTurno = async (turnoId: number, payload: ConteoPayload): Promise<TurnoDetalleInterface & { message: string }> => {
    const { data } = await api.post(`/caja/turnos/${turnoId}/cerrar`, payload);
    return data;
};

export const reabrirTurno = async (turnoId: number, motivo: string): Promise<TurnoDetalleInterface & { message: string }> => {
    const { data } = await api.post(`/caja/turnos/${turnoId}/reabrir`, { motivo });
    return data;
};

export const getTurno = async (turnoId: number): Promise<TurnoDetalleInterface> => {
    const { data } = await api.get(`/caja/turnos/${turnoId}`);
    return data;
};

export const getHistorialTurnos = async (
    filtros: { desde?: string; hasta?: string; caja_id?: string; usuario_id?: string; estado?: string; page?: number } = {}
): Promise<HistorialTurnosResponseInterface> => {
    const { data } = await api.get("/caja/turnos", { params: limpiar(filtros) });
    return data;
};

// ── Configuración ───────────────────────────────────────────

export const getCajasConfig = async (): Promise<CajaInterface[]> => {
    const { data } = await api.get("/caja/cajas");
    return data;
};

export const guardarCaja = async (payload: { nombre: string; impresora_id?: number | null; activo?: boolean }, id?: number) => {
    const { data } = id ? await api.put(`/caja/cajas/${id}`, payload) : await api.post("/caja/cajas", payload);
    return data as { success: number; message: string };
};

export const getMetodosPagoConfig = async (): Promise<MetodoPagoInterface[]> => {
    const { data } = await api.get("/caja/metodos-pago");
    return data;
};

export const guardarMetodoPago = async (payload: Omit<MetodoPagoInterface, "id">, id?: number) => {
    const { data } = id ? await api.put(`/caja/metodos-pago/${id}`, payload) : await api.post("/caja/metodos-pago", payload);
    return data as { success: number; message: string };
};
