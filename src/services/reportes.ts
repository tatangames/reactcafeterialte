// Servicios de Reportes y panel de inicio (Fase 10)

import { api } from "./api";

export type FormatoColumna = "texto" | "fecha" | "dinero" | "costo" | "numero" | "porcentaje";

export interface ReporteInfoInterface {
    tipo: string;
    titulo: string;
    grupo: string;
    fechas: boolean;
}

export interface ReporteInterface {
    tipo: string;
    titulo: string;
    periodo: string;
    desde: string;
    hasta: string;
    columnas: { clave: string; titulo: string; formato: FormatoColumna }[];
    filas: Record<string, string | number | null>[];
    totales: Record<string, number | null> | null;
    indicadores: { titulo: string; valor: number | string; formato: FormatoColumna }[];
    grafica: { tipo: "barra" | "barra_horizontal" | "linea" | "dona"; etiqueta: string; series: string[]; limite?: number } | null;
    /** «Quién agregó cada producto»: empleados del periodo para el filtro */
    empleados?: { id: number; nombre: string }[];
}

export interface FiltrosReporte {
    desde?: string;
    hasta?: string;
    producto_id?: number | string;
    proveedor_id?: number | string;
    categoria_id?: number | string;
    clase?: string;
    motivo?: string;
    usuario_id?: number | string;
}

export interface PanelInterface {
    fecha: string;
    ventas: { hoy: number; tickets: number; ticket_promedio: number; ayer: number; variacion: number | null };
    por_hora: { hora: number; total: number }[];
    top_productos: { producto: string; unidad: string | null; cantidad: number; total: number }[];
    alertas: { stock_bajo: number; pedidos_hoy: number; pedidos_atrasados: number; turnos_abiertos: number };
    ultimos_30?: { fecha: string; neto: number; utilidad: number }[];
    mes?: { ventas: number; gastos: number; mermas: number; compras: number };
    cartera?: { por_cobrar: number; por_cobrar_vencido: number; por_pagar: number; por_pagar_semana: number };
    rango: {
        desde: string;
        hasta: string;
        total_ventas: number;
        tickets: number;
        total_pedidos: number;
        ultimos_pedidos: { id: number; numero: string; cliente: string; fecha: string; pago: string; estado: string; total: number }[];
        total_productos: number;
        mas_vendidos: { producto: string; imagen: string | null; unidad: string | null; cantidad: number; total: number }[];
        // Solo con permiso de reportes
        total_gastos?: number;
        utilidad_bruta?: number;
        utilidad_neta?: number;
    };
}

const limpiar = (filtros: object) =>
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== undefined && v !== null));

export const getCatalogoReportes = async (): Promise<ReporteInfoInterface[]> => {
    const { data } = await api.get("/reportes");
    return data.reportes;
};

export const getReporte = async (tipo: string, filtros: FiltrosReporte): Promise<ReporteInterface> => {
    const { data } = await api.get(`/reportes/${tipo}`, { params: limpiar(filtros) });
    return data.reporte;
};

// Descarga Excel o PDF con el token (no sirve un enlace directo)
export const exportarReporte = async (tipo: string, formato: "excel" | "pdf", filtros: FiltrosReporte) => {
    const { data, headers } = await api.get(`/reportes/${tipo}/${formato}`, { params: limpiar(filtros), responseType: "blob" });
    const disposicion = String(headers["content-disposition"] ?? "");
    const nombre = /filename="?([^"]+)"?/.exec(disposicion)?.[1] ?? `${tipo}.${formato === "excel" ? "xlsx" : "pdf"}`;
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([data], { type: headers["content-type"] as string }));
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
};

export const getPanel = async (rango?: { desde: string; hasta: string }): Promise<PanelInterface> => {
    const { data } = await api.get("/panel", { params: rango });
    return data.panel;
};
