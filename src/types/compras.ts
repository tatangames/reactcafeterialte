// Tipos del módulo de Compras, proveedores y cuentas por pagar (Fase 7)

import { PaginaInterface } from "./interfaces";

export interface ProveedorInterface {
    id: number;
    nombre: string;
    nit: string | null;
    nrc: string | null;
    contacto: string | null;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
    dias_credito: number;
    saldo: number;
    notas: string | null;
    activo: boolean;
    vencido?: number;
}

export interface CuentaPagarInterface {
    id: number;
    compra_id: number;
    compra: string | null;
    documento: string | null;
    fecha: string | null;
    monto: number;
    saldo: number;
    fecha_vencimiento: string;
    estado: "pendiente" | "pagada" | "anulada";
    vencida: boolean;
    dias_vencida: number;
    proveedor_id?: number;
    proveedor?: string | null;
}

export interface PagoProveedorInterface {
    id: number;
    numero: string;
    proveedor_id: number;
    proveedor: string | null;
    fecha: string;
    monto: number;
    origen: "caja" | "externo";
    turno_id: number | null;
    metodo: string | null;
    referencia: string | null;
    usuario: string | null;
    compras: string[];
    anulado: boolean;
    motivo_anulacion: string | null;
}

export interface ProveedorDetalleInterface {
    proveedor: ProveedorInterface;
    resumen: { compras: number; total_comprado: number; ultima_compra: string | null; vencido: number };
    pendientes: CuentaPagarInterface[];
    pagos: PagoProveedorInterface[];
    productos: { producto_id: number; nombre: string; total: number; ultima: string }[];
}

export interface ProductoCompraInterface {
    id: number;
    nombre: string;
    sku: string | null;
    clase: string;
    unidad_medida_id: number | null;
    unidad: string | null;
    unidad_tipo: "unidad" | "masa" | "volumen" | null;
    costo_unitario: number;
    controla_stock: boolean;
    permite_fraccion: boolean;
}

export interface UnidadCompraInterface {
    id: number;
    nombre: string;
    abreviatura: string | null;
    tipo: "unidad" | "masa" | "volumen";
    factor_base: number;
}

export type EstadoOrden = "borrador" | "enviada" | "parcial" | "recibida" | "cancelada";

export interface OrdenCompraInterface {
    id: number;
    numero: string;
    proveedor_id: number;
    proveedor: string | null;
    fecha: string;
    fecha_esperada: string | null;
    estado: EstadoOrden;
    total: number;
    observaciones: string | null;
    usuario: string | null;
    turno?: string | null;
    motivo_cancelacion: string | null;
    items?: {
        id: number;
        producto_id: number;
        producto: string | null;
        unidad_medida_id: number;
        unidad: string | null;
        cantidad: number;
        cantidad_recibida: number;
        pendiente: number;
        costo_unitario: number;
        subtotal: number;
    }[];
    compras?: { id: number; numero: string; fecha: string; total: number; estado: string }[];
}

export type TipoDocumentoCompra = "factura" | "ccf" | "ticket" | "otro";

export interface CompraInterface {
    id: number;
    uuid: string;
    numero: string;
    proveedor_id: number;
    proveedor: string | null;
    orden: string | null;
    fecha: string;
    tipo_documento: TipoDocumentoCompra;
    numero_documento: string | null;
    condicion: "contado" | "credito";
    subtotal: number;
    impuesto: number;
    total: number;
    saldo: number;
    fecha_vencimiento: string | null;
    estado: "registrada" | "anulada";
    observaciones: string | null;
    usuario: string | null;
    turno?: string | null;
    motivo_anulacion: string | null;
    anulada_por?: string | null;
    items?: {
        producto_id: number;
        producto: string | null;
        unidad: string | null;
        cantidad: number;
        costo_unitario: number;
        subtotal: number;
        cantidad_base: number;
        unidad_base: string | null;
        costo_base: number;
    }[];
    pagos?: PagoProveedorInterface[];
}

export interface ComprasResponseInterface extends PaginaInterface {
    compras: CompraInterface[];
    totales: { total: number };
}

export interface CuentasPagarResponseInterface extends PaginaInterface {
    cuentas: CuentaPagarInterface[];
    resumen: { total: number; vencido: number; proxima_semana: number; proveedores: number };
}

export const TIPOS_DOCUMENTO: Record<TipoDocumentoCompra, string> = {
    factura: "Factura", ccf: "Crédito fiscal", ticket: "Ticket", otro: "Otro",
};

export const ESTADOS_ORDEN: Record<EstadoOrden, { texto: string; tono: "neutral" | "info" | "warning" | "success" | "danger" }> = {
    borrador:  { texto: "Borrador", tono: "neutral" },
    enviada:   { texto: "Enviada", tono: "info" },
    parcial:   { texto: "Recibida en parte", tono: "warning" },
    recibida:  { texto: "Recibida", tono: "success" },
    cancelada: { texto: "Cancelada", tono: "danger" },
};
