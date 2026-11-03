// Servicios de Gastos (Fase 9)

import { api } from "./api";
import { PaginaInterface } from "../types/interfaces";

export interface CategoriaGastoInterface {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    gastos: number;
}

export interface GastoInterface {
    id: number;
    numero: string;
    fecha: string;
    categoria_id: number;
    categoria: string | null;
    proveedor_id: number | null;
    proveedor: string | null;
    descripcion: string;
    monto: number;
    origen: "caja" | "externo";
    turno_id: number | null;
    metodo: string | null;
    referencia: string | null;
    numero_documento: string | null;
    tiene_comprobante: boolean;
    comprobante_tipo: string | null;
    usuario: string | null;
    turno?: string | null;
    registrado: string;
    anulado: boolean;
    anulado_por: string | null;
    motivo_anulacion: string | null;
}

export interface ResumenGastosInterface {
    desde: string;
    hasta: string;
    total: number;
    cantidad: number;
    desde_caja: number;
    fuera_de_caja: number;
    por_categoria: { categoria_id: number; categoria: string; cantidad: number; total: number; porcentaje: number }[];
    por_mes: { mes: string; cantidad: number; total: number }[];
    por_metodo: { metodo: string; total: number }[];
}

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getCategoriasGasto = async (todas = false): Promise<CategoriaGastoInterface[]> => {
    const { data } = await api.get("/gastos/categorias", { params: todas ? { todas: 1 } : {} });
    return data.categorias;
};

export const guardarCategoriaGasto = async (payload: { nombre: string; descripcion?: string | null; activo?: boolean }, id?: number) => {
    const { data } = id ? await api.put(`/gastos/categorias/${id}`, payload) : await api.post("/gastos/categorias", payload);
    return data as { success: number; message: string };
};

export const getGastos = async (
    filtros: { desde?: string; hasta?: string; categoria_id?: number | string; origen?: string; estado?: string; buscar?: string; page?: number } = {}
): Promise<PaginaInterface & { gastos: GastoInterface[]; total_monto: number }> => {
    const { data } = await api.get("/gastos", { params: limpiar(filtros) });
    return data;
};

export interface GastoPayload {
    uuid: string;
    fecha: string;
    categoria_id: number;
    proveedor_id?: number | null;
    descripcion: string;
    monto: number;
    origen: "caja" | "externo";
    caja_id?: number | null;
    metodo_pago_id?: number | null;
    referencia?: string;
    numero_documento?: string;
    comprobante?: File | null;
}

// Se envía como formulario para poder adjuntar el comprobante
export const registrarGasto = async (payload: GastoPayload) => {
    const form = new FormData();
    Object.entries(payload).forEach(([clave, valor]) => {
        if (valor === undefined || valor === null || valor === "") return;
        form.append(clave, valor instanceof File ? valor : String(valor));
    });
    const { data } = await api.post("/gastos", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data as { success: number; message: string; gasto: GastoInterface };
};

export const anularGasto = async (id: number, motivo: string) => {
    const { data } = await api.post(`/gastos/${id}/anular`, limpiar({ motivo }));
    return data as { success: number; message: string; gasto: GastoInterface };
};

// Abre el comprobante en otra pestaña (va con token, no como enlace directo)
export const verComprobante = async (gasto: GastoInterface) => {
    const { data, headers } = await api.get(`/gastos/${gasto.id}/comprobante`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([data], { type: headers["content-type"] as string }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const getResumenGastos = async (rango: { desde?: string; hasta?: string }): Promise<ResumenGastosInterface> => {
    const { data } = await api.get("/gastos/resumen", { params: limpiar(rango) });
    return data.resumen;
};
