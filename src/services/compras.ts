// Servicios de Compras, proveedores y cuentas por pagar (Fase 7)

import { api } from "./api";
import {
    CompraInterface,
    ComprasResponseInterface,
    CuentasPagarResponseInterface,
    OrdenCompraInterface,
    PagoProveedorInterface,
    ProductoCompraInterface,
    ProveedorDetalleInterface,
    ProveedorInterface,
    TipoDocumentoCompra,
    UnidadCompraInterface,
} from "../types/compras";
import { PaginaInterface } from "../types/interfaces";

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

// Descarga un archivo protegido por token (PDF)
const descargar = async (url: string, nombre: string) => {
    const { data } = await api.get(url, { responseType: "blob" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
};

// ── Proveedores ────────────────────────────────────────────
export type ProveedorPayload = Partial<Omit<ProveedorInterface, "id" | "saldo" | "vencido">> & { nombre: string };

export const getProveedores = async (
    filtros: { buscar?: string; estado?: "activos" | "inactivos" | "todos"; con_saldo?: boolean } = {}
): Promise<ProveedorInterface[]> => {
    const { data } = await api.get("/compras/proveedores", { params: limpiar({ ...filtros, con_saldo: filtros.con_saldo ? 1 : undefined }) });
    return data.proveedores;
};

export const getProveedor = async (id: number): Promise<ProveedorDetalleInterface> => {
    const { data } = await api.get(`/compras/proveedores/${id}`);
    return data;
};

export const guardarProveedor = async (payload: ProveedorPayload, id?: number) => {
    const { data } = id ? await api.put(`/compras/proveedores/${id}`, payload) : await api.post("/compras/proveedores", payload);
    return data as { success: number; message: string; proveedor: ProveedorInterface };
};

// ── Catálogo para compras ──────────────────────────────────
export const getCatalogoCompras = async (): Promise<{ productos: ProductoCompraInterface[]; unidades: UnidadCompraInterface[] }> => {
    const { data } = await api.get("/compras/catalogo");
    return data;
};

export interface LineaCompraPayload {
    producto_id: number;
    unidad_medida_id?: number | null;
    cantidad: number;
    costo_unitario: number;
    orden_detalle_id?: number | null;
}

// ── Órdenes de compra ──────────────────────────────────────
export const getOrdenes = async (
    filtros: { estado?: string; proveedor_id?: number; page?: number } = {}
): Promise<PaginaInterface & { ordenes: OrdenCompraInterface[] }> => {
    const { data } = await api.get("/compras/ordenes", { params: limpiar(filtros) });
    return data;
};

export const getOrden = async (id: number): Promise<OrdenCompraInterface> => {
    const { data } = await api.get(`/compras/ordenes/${id}`);
    return data.orden;
};

export const guardarOrden = async (
    payload: { proveedor_id: number; fecha?: string; fecha_esperada?: string | null; observaciones?: string; items: LineaCompraPayload[] },
    id?: number
) => {
    const { data } = id ? await api.put(`/compras/ordenes/${id}`, payload) : await api.post("/compras/ordenes", payload);
    return data as { success: number; message: string; orden: OrdenCompraInterface };
};

export const accionOrden = async (id: number, accion: "enviar" | "cancelar" | "cerrar", motivo?: string) => {
    const { data } = await api.post(`/compras/ordenes/${id}/${accion}`, limpiar({ motivo }));
    return data as { success: number; message: string; orden: OrdenCompraInterface };
};

export const descargarOrdenPdf = (orden: OrdenCompraInterface) =>
    descargar(`/compras/ordenes/${orden.id}/pdf`, `orden-compra-${orden.numero}.pdf`);

// ── Compras ────────────────────────────────────────────────
export interface CompraPayload {
    uuid: string;
    proveedor_id: number;
    orden_compra_id?: number | null;
    fecha: string;
    tipo_documento: TipoDocumentoCompra;
    numero_documento?: string;
    condicion: "contado" | "credito";
    fecha_vencimiento?: string | null;
    impuesto?: number;
    observaciones?: string;
    items: LineaCompraPayload[];
    pago?: { origen: "caja" | "externo"; caja_id?: number | null; metodo_pago_id?: number; referencia?: string };
}

export const getCompras = async (
    filtros: { desde?: string; hasta?: string; proveedor_id?: number; estado?: string; condicion?: string; buscar?: string; page?: number } = {}
): Promise<ComprasResponseInterface> => {
    const { data } = await api.get("/compras", { params: limpiar(filtros) });
    return data;
};

export const getCompra = async (id: number): Promise<CompraInterface> => {
    const { data } = await api.get(`/compras/${id}`);
    return data.compra;
};

export const registrarCompra = async (payload: CompraPayload) => {
    const { data } = await api.post("/compras", payload);
    return data as { success: number; message: string; compra: CompraInterface };
};

export const anularCompra = async (id: number, motivo: string) => {
    const { data } = await api.post(`/compras/${id}/anular`, { motivo });
    return data as { success: number; message: string; compra: CompraInterface };
};

export const getHistorialProducto = async (productoId: number) => {
    const { data } = await api.get(`/compras/historial-producto/${productoId}`);
    return data as {
        producto: { id: number; nombre: string; costo_promedio: number };
        compras: { compra_id: number; compra: string; fecha: string; proveedor: string; cantidad: number; unidad: string | null; costo_unitario: number; costo_base: number }[];
    };
};

// ── Cuentas por pagar ──────────────────────────────────────
export const getCuentasPagar = async (
    filtros: { estado?: string; proveedor_id?: number; page?: number } = {}
): Promise<CuentasPagarResponseInterface> => {
    const { data } = await api.get("/cuentas-pagar", { params: limpiar(filtros) });
    return data;
};

export const getPagosProveedor = async (
    filtros: { desde?: string; hasta?: string; proveedor_id?: number; page?: number } = {}
): Promise<PaginaInterface & { pagos: PagoProveedorInterface[] }> => {
    const { data } = await api.get("/cuentas-pagar/pagos", { params: limpiar(filtros) });
    return data;
};

export const registrarPagoProveedor = async (
    proveedorId: number,
    payload: {
        uuid: string; monto: number; fecha?: string; origen: "caja" | "externo"; caja_id?: number | null;
        metodo_pago_id?: number; referencia?: string; aplicaciones?: { cuenta_pagar_id: number; monto: number }[];
    }
) => {
    const { data } = await api.post(`/cuentas-pagar/proveedores/${proveedorId}/pagos`, payload);
    return data as { success: number; message: string; pago: PagoProveedorInterface; proveedor: ProveedorInterface };
};

export const anularPagoProveedor = async (pagoId: number, motivo: string) => {
    const { data } = await api.post(`/cuentas-pagar/pagos/${pagoId}/anular`, { motivo });
    return data as { success: number; message: string; proveedor: ProveedorInterface };
};
