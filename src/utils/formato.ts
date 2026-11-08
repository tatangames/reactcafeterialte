// Formatos comunes de montos, cantidades y fechas

import { ClaseProducto, TipoMovimiento } from "../types/interfaces";

export const dinero = (valor: number | string | null | undefined, simbolo = "$", decimales = 2): string => {
    const numero = Number(valor ?? 0);
    const texto = Math.abs(numero).toLocaleString("en-US", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
    });
    // Negativos como −$12.50 (no $-12.50); se ignora el −0.00 por redondeo
    return `${numero < 0 && Number(texto.replace(/,/g, "")) !== 0 ? "−" : ""}${simbolo}${texto}`;
};

// Cantidades: sin ceros sobrantes (12, 2.5, 0.125)
export const cantidad = (valor: number | string | null | undefined, unidad?: string | null): string => {
    const texto = Number(valor ?? 0).toLocaleString("en-US", { maximumFractionDigits: 4 });
    return unidad ? `${texto} ${unidad}` : texto;
};

// Fecha local YYYY-MM-DD (toISOString usa UTC y de noche daría el día siguiente)
export const fechaLocal = (fecha: Date = new Date()): string => {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

export const hoyLocal = (): string => fechaLocal();

export const haceDias = (dias: number): string => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fechaLocal(fecha);
};

export const CLASES_PRODUCTO: Record<ClaseProducto, string> = {
    producto_terminado: "Producto terminado",
    materia_prima: "Materia prima",
    reventa: "Reventa",
    empaque: "Empaque",
};

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, string> = {
    entrada: "Entrada",
    salida: "Salida",
    ajuste: "Ajuste",
    produccion: "Producción",
    venta: "Venta",
    compra: "Compra",
    merma: "Merma",
    devolucion: "Devolución",
    anulacion: "Anulación",
    consumo_produccion: "Consumo de producción",
    consumo_interno: "Consumo interno",
};

// Mensaje de error de una respuesta de Axios (validación o regla de negocio)
export const mensajeError = (error: unknown, porDefecto: string): string => {
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
        ?.response?.data;
    if (data?.errors) {
        const primero = Object.values(data.errors)[0];
        if (Array.isArray(primero) && primero.length > 0) return primero[0];
    }
    return data?.message ?? porDefecto;
};

// Fechas para mostrar: día-mes-año. Lo que no viene como "2026-11-01..." se deja igual
const PARTES_FECHA = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/;

// "2026-11-01" o "2026-11-01 10:30" → "01-11-2026"
export const fechaCorta = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const m = iso.match(PARTES_FECHA);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
};

// "2026-11-01 10:30[:00]" (o ISO) → "01-11-2026 10:30"; solo fecha → "01-11-2026"
export const fechaHora = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const m = iso.match(PARTES_FECHA);
    if (!m) return iso;
    return m[4] ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}` : `${m[3]}-${m[2]}-${m[1]}`;
};
