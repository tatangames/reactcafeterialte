// Servicios de inventario (Fase 1). El token lo agrega el interceptor de api.ts

import { api } from "./api";
import {
    AlertaStockInterface,
    InventarioStockFiltros,
    InventarioStockInterface,
    KardexResponseInterface,
    MovimientosResponseInterface,
} from "../types/interfaces";

// Quita los filtros vacíos para no mandarlos en la URL
const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getStock = async (filtros: InventarioStockFiltros = {}): Promise<InventarioStockInterface[]> => {
    const { data } = await api.get("/inventario/stock", { params: limpiar(filtros) });
    return data;
};

export const actualizarStockMinimo = async (productoId: number, stockMinimo: number) => {
    const { data } = await api.put(`/inventario/stock-minimo/${productoId}`, { stock_minimo: stockMinimo });
    return data as { success: number; message: string; bajo_minimo: boolean };
};

export const getAlertasStock = async () => {
    const { data } = await api.get("/inventario/alertas");
    return data as { success: number; total: number; productos: AlertaStockInterface[] };
};

export const getKardex = async (
    productoId: number,
    filtros: { desde?: string; hasta?: string; page?: number; per_page?: number } = {}
): Promise<KardexResponseInterface> => {
    const { data } = await api.get(`/inventario/kardex/${productoId}`, { params: limpiar(filtros) });
    return data;
};

export const getMovimientos = async (
    filtros: { producto_id?: string; tipo?: string; desde?: string; hasta?: string; page?: number } = {}
): Promise<MovimientosResponseInterface> => {
    const { data } = await api.get("/inventario/movimientos", { params: limpiar(filtros) });
    return data;
};

// Ajuste por conteo físico: cada cantidad es lo contado (el stock final)
export const registrarConteo = async (payload: {
    fecha: string;
    descripcion: string;
    items: { producto_id: number; cantidad: number }[];
}) => {
    const { data } = await api.post("/inventario/entradas/registrar", { ...payload, tipo: "ajuste" });
    return data as { success: number; message: string; id: number };
};
