// Tipos de Producción, recetas y mermas (Fase 8)

export interface ProductoProduccionInterface {
    id: number;
    nombre: string;
    clase: string;
    se_vende: boolean;
    unidad_medida_id: number | null;
    unidad: string | null;
    unidad_tipo: "unidad" | "masa" | "volumen" | null;
    costo_unitario: number;
    precio_venta: number;
    controla_stock: boolean;
    consumo_interno: boolean;
    permite_fraccion: boolean;
    stock: number | null;
}

export interface UnidadInterface {
    id: number;
    nombre: string;
    abreviatura: string | null;
    tipo: "unidad" | "masa" | "volumen";
    factor_base: number;
}

export type MotivoMerma = "vencido" | "quemado" | "danado" | "otro";

export interface CatalogoProduccionInterface {
    productos: ProductoProduccionInterface[];
    unidades: UnidadInterface[];
    motivos: Record<MotivoMerma, string>;
}

export interface IngredienteRecetaInterface {
    id: number;
    producto_id: number;
    producto: string;
    unidad_medida_id: number;
    unidad: string;
    cantidad: number;
    merma_porcentaje: number;
    cantidad_base: number;
    unidad_base: string | null;
    costo_unitario: number;
    costo: number;
    controla_stock: boolean;
}

export interface RecetaInterface {
    id: number;
    producto_id: number;
    producto: string | null;
    unidad: string | null;
    nombre: string;
    rendimiento: number;
    // produccion: se fabrica y suma existencia; venta: se descuenta al vender (limonada, platos, servicios)
    uso: "produccion" | "venta";
    version: number;
    activa: boolean;
    notas: string | null;
    usuario: string | null;
    actualizada: string;
    costo_total: number;
    costo_unitario: number;
    precio_venta: number;
    margen: number | null;
    ingredientes?: IngredienteRecetaInterface[];
    versiones?: { id: number; version: number; activa: boolean; actualizada: string }[];
}

export interface ProduccionInterface {
    id: number;
    numero: string;
    fecha: string;
    receta_id: number;
    version: number | null;
    producto_id: number;
    producto: string | null;
    unidad: string | null;
    cantidad_planificada: number;
    cantidad_producida: number;
    rendimiento: number | null;
    costo_total: number;
    costo_unitario: number;
    estado: "registrada" | "anulada";
    observaciones: string | null;
    usuario: string | null;
    turno?: string | null;
    motivo_anulacion: string | null;
    creada: string;
    consumos?: {
        producto_id: number;
        producto: string | null;
        unidad: string | null;
        cantidad_teorica: number;
        cantidad_real: number;
        diferencia: number;
        costo_unitario: number;
        costo_total: number;
    }[];
}

export interface MermaInterface {
    id: number;
    fecha: string;
    producto_id: number;
    producto: string | null;
    unidad: string | null;
    cantidad: number;
    motivo: MotivoMerma;
    motivo_texto: string;
    detalle: string | null;
    costo_unitario: number;
    costo_total: number;
    anulada: boolean;
    motivo_anulacion: string | null;
    usuario: string | null;
    turno?: string | null;
    registrada: string;
}

export interface ResumenProduccionInterface {
    desde: string;
    hasta: string;
    totales: { producciones: number; costo: number; mermas: number; costo_mermas: number };
    por_producto: {
        producto_id: number; producto: string; unidad: string | null; producciones: number;
        planificada: number; producida: number; rendimiento: number | null; costo_total: number; costo_unitario: number;
    }[];
    consumos: { producto_id: number; producto: string; unidad: string | null; teorica: number; real: number; diferencia: number; costo: number }[];
    mermas: {
        por_motivo: { motivo: MotivoMerma; texto: string; cantidad: number; costo: number }[];
        por_producto: { producto_id: number; producto: string; cantidad: number; costo: number }[];
    };
    por_dia: { fecha: string; producciones: number; costo: number; mermas: number }[];
}
