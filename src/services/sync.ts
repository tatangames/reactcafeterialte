// Comunicación del POS sin conexión (Fase 5). El token lo agrega el interceptor de api.ts

import axios from "axios";
import { api } from "./api";
import { TipoDescuento } from "../types/pos";

// La venta tal como se envía al sincronizar (precio y hora del dispositivo incluidos)
export interface VentaOfflinePayload {
    uuid: string;
    caja_id: number;
    turno_id: number | null;
    numero_provisional: string;
    fecha_venta: string;
    items: { producto_id: number; cantidad: number; precio_unitario: number; descuento_tipo?: TipoDescuento | null; descuento_valor?: number }[];
    descuento_global?: { tipo: TipoDescuento; valor: number } | null;
    pagos: { metodo_pago_id: number; monto: number; referencia?: string }[];
    cliente_id?: number;
}

export interface ResultadoSync {
    uuid: string;
    estado: "creada" | "ya_existia" | "error";
    numero?: string;
    venta_id?: number;
    conflictos?: string[];
    message?: string;
}

// Sin respuesta del servidor (apagado, Wi-Fi caído, tiempo agotado): no es un error de negocio
export const esErrorDeRed = (error: unknown): boolean =>
    axios.isAxiosError(error) && !error.response;

export const ping = async (): Promise<boolean> => {
    try {
        await api.get("/pos/ping", { timeout: 4000 });
        return true;
    } catch (error) {
        // Si respondió (aunque sea con error), hay conexión
        return !esErrorDeRed(error);
    }
};

export const enviarVentasOffline = async (ventas: VentaOfflinePayload[]): Promise<ResultadoSync[]> => {
    const { data } = await api.post("/pos/sync", { ventas }, { timeout: 30000 });
    return data.resultados;
};
