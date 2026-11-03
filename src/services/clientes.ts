// Servicios de Clientes, cuentas por cobrar y pedidos especiales (Fase 6)

import { api } from "./api";
import {
    AbonoInterface,
    CarteraResponseInterface,
    ClienteDetalleInterface,
    ClienteInterface,
    ClientesResponseInterface,
    EstadoCuentaInterface,
    PedidoEspecialInterface,
} from "../types/clientes";
import { ItemVentaPayload } from "./pos";

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

// ── Clientes ───────────────────────────────────────────────
export interface ClientePayload {
    nombre: string;
    documento?: string | null;
    telefono?: string | null;
    correo?: string | null;
    direccion?: string | null;
    limite_credito?: number;
    dias_credito?: number;
    notas?: string | null;
    activo?: boolean;
}

export const getClientes = async (
    filtros: { buscar?: string; estado?: "activos" | "inactivos" | "todos"; con_saldo?: boolean; page?: number; per_page?: number } = {}
): Promise<ClientesResponseInterface> => {
    const { data } = await api.get("/clientes", {
        params: limpiar({ ...filtros, con_saldo: filtros.con_saldo ? 1 : undefined }),
    });
    return data;
};

export const getCliente = async (id: number): Promise<ClienteDetalleInterface> => {
    const { data } = await api.get(`/clientes/${id}`);
    return data;
};

export const guardarCliente = async (payload: ClientePayload, id?: number) => {
    const { data } = id ? await api.put(`/clientes/${id}`, payload) : await api.post("/clientes", payload);
    return data as { success: number; message: string; cliente: ClienteInterface };
};

// ── Estado de cuenta y abonos ──────────────────────────────
export const getEstadoCuenta = async (id: number, rango: { desde?: string; hasta?: string }) => {
    const { data } = await api.get(`/clientes/${id}/estado-cuenta`, { params: limpiar(rango) });
    return data as { success: number; cliente: ClienteInterface; estado: EstadoCuentaInterface };
};

// Descarga el PDF con el token (no se puede abrir como enlace directo)
export const descargarEstadoCuentaPdf = async (id: number, rango: { desde?: string; hasta?: string }, nombreCliente: string) => {
    const { data } = await api.get(`/clientes/${id}/estado-cuenta/pdf`, { params: limpiar(rango), responseType: "blob" });
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `estado-cuenta-${nombreCliente.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const registrarAbono = async (
    clienteId: number,
    payload: { uuid: string; caja_id: number; monto: number; metodo_pago_id?: number; referencia?: string }
) => {
    const { data } = await api.post(`/clientes/${clienteId}/abonos`, payload);
    return data as { success: number; message: string; abono: AbonoInterface; cliente: ClienteInterface };
};

export const anularAbono = async (abonoId: number, motivo: string) => {
    const { data } = await api.post(`/clientes/abonos/${abonoId}/anular`, limpiar({ motivo }));
    return data as { success: number; message: string; cliente: ClienteInterface };
};

export const getCartera = async (
    filtros: { estado?: "pendiente" | "vencidas" | "pagada"; buscar?: string; page?: number } = {}
): Promise<CarteraResponseInterface> => {
    const { data } = await api.get("/cuentas-cobrar", { params: limpiar(filtros) });
    return data;
};

// ── Pedidos especiales ─────────────────────────────────────
export interface PedidoEspecialPayload {
    uuid?: string;
    caja_id?: number | null;
    cliente_id?: number | null;
    nombre?: string;
    telefono?: string;
    fecha_entrega: string;
    observaciones?: string;
    items: ItemVentaPayload[];
    anticipo?: number;
    metodo_pago_id?: number;
    referencia?: string;
}

export const getPedidosEspeciales = async (
    filtros: { estado?: string; desde?: string; hasta?: string; buscar?: string } = {}
): Promise<PedidoEspecialInterface[]> => {
    const { data } = await api.get("/pedidos-especiales", { params: limpiar(filtros) });
    return data.pedidos;
};

export const getPedidoEspecial = async (id: number): Promise<PedidoEspecialInterface> => {
    const { data } = await api.get(`/pedidos-especiales/${id}`);
    return data.pedido;
};

export const guardarPedidoEspecial = async (payload: PedidoEspecialPayload, id?: number) => {
    const { data } = id ? await api.put(`/pedidos-especiales/${id}`, payload) : await api.post("/pedidos-especiales", payload);
    return data as { success: number; message: string; pedido: PedidoEspecialInterface };
};

export const registrarAnticipo = async (
    id: number,
    payload: { caja_id: number; monto: number; metodo_pago_id?: number; referencia?: string }
) => {
    const { data } = await api.post(`/pedidos-especiales/${id}/anticipos`, payload);
    return data as { success: number; message: string; pedido: PedidoEspecialInterface };
};

export const cancelarPedidoEspecial = async (
    id: number,
    payload: { motivo: string; devolver_anticipo?: boolean; caja_id?: number | null; metodo_pago_id?: number }
) => {
    const { data } = await api.post(`/pedidos-especiales/${id}/cancelar`, payload);
    return data as { success: number; message: string; pedido: PedidoEspecialInterface };
};
