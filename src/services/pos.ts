// Servicios del punto de venta (Fase 3). El token lo agrega el interceptor de api.ts

import { api } from "./api";
import {
    CatalogoPosInterface,
    PedidoInterface,
    TipoDescuento,
    VentaInterface,
    VentasResponseInterface,
} from "../types/pos";

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export interface ItemVentaPayload {
    producto_id: number;
    cantidad: number;
    descuento_tipo?: TipoDescuento | null;
    descuento_valor?: number;
    notas?: string;
    modificadores?: number[];
    ajustes?: { producto_id: number; cantidad: number }[];
}

export interface VentaPayload {
    uuid: string;
    caja_id: number;
    items: ItemVentaPayload[];
    descuento_global?: { tipo: TipoDescuento; valor: number } | null;
    pagos: { metodo_pago_id: number; monto: number; referencia?: string }[];
    pedido_id?: number | null;
    cliente_id?: number | null;
    observaciones?: string;
}


export const getCatalogoPos = async (): Promise<CatalogoPosInterface> => {
    const { data } = await api.get("/pos/catalogo", { timeout: 10000 });
    return data;
};

export const registrarVenta = async (payload: VentaPayload) => {
    // Con tiempo límite: si el servidor no responde, el POS pasa a vender sin conexión
    const { data } = await api.post("/pos/ventas", payload, { timeout: 10000 });
    return data as { success: number; message: string; venta: VentaInterface };
};

export const getVentas = async (
    filtros: { desde?: string; hasta?: string; turno_id?: number | string; cliente_id?: number; estado?: string; buscar?: string; page?: number } = {}
): Promise<VentasResponseInterface> => {
    const { data } = await api.get("/pos/ventas", { params: limpiar(filtros) });
    return data;
};

export const getVenta = async (id: number): Promise<VentaInterface> => {
    const { data } = await api.get(`/pos/ventas/${id}`);
    return data.venta;
};

export const anularVenta = async (id: number, motivo: string) => {
    const { data } = await api.post(`/pos/ventas/${id}/anular`, { motivo });
    return data as { success: number; message: string; venta: VentaInterface };
};

export const devolverVenta = async (
    id: number,
    payload: {
        uuid: string;
        caja_id: number;
        motivo: string;
        metodo_pago_id?: number;
        items: { venta_detalle_id: number; cantidad: number; reingresa_inventario: boolean }[];
    }
) => {
    const { data } = await api.post(`/pos/ventas/${id}/devoluciones`, payload);
    return data as { success: number; message: string; devolucion: { id: number; numero: string; total: number }; venta: VentaInterface };
};

// ── Precuentas ──────────────────────────────────────────────

export const getPrecuentas = async (): Promise<PedidoInterface[]> => {
    const { data } = await api.get("/pos/pedidos", { params: { estado: "abierto" } });
    return data.pedidos;
};

export const guardarPrecuenta = async (
    payload: { uuid?: string; caja_id?: number | null; nombre: string; observaciones?: string; items: ItemVentaPayload[] },
    id?: number
) => {
    const { data } = id ? await api.put(`/pos/pedidos/${id}`, payload) : await api.post("/pos/pedidos", payload);
    return data as { success: number; message: string; pedido: PedidoInterface };
};

export const cancelarPrecuenta = async (id: number, motivo: string) => {
    const { data } = await api.post(`/pos/pedidos/${id}/cancelar`, { motivo });
    return data as { success: number; message: string };
};
