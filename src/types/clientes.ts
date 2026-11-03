// Tipos del módulo de Clientes, cuentas por cobrar y pedidos especiales (Fase 6)

import { PaginaInterface } from "./interfaces";
import { PedidoItemInterface } from "./pos";

export interface ClienteInterface {
    id: number;
    nombre: string;
    documento: string | null;
    telefono: string | null;
    correo: string | null;
    direccion: string | null;
    limite_credito: number;
    dias_credito: number;
    saldo: number;
    credito_disponible: number;
    notas: string | null;
    activo: boolean;
    vencido?: number;
}

export interface ClientesResponseInterface extends PaginaInterface {
    clientes: ClienteInterface[];
}

export interface CuentaCobrarInterface {
    id: number;
    venta_id: number | null;
    venta: string | null;
    fecha: string;
    monto: number;
    saldo: number;
    fecha_vencimiento: string;
    estado: "pendiente" | "pagada" | "anulada";
    vencida: boolean;
    dias_vencida: number;
    // En la cartera general
    cliente_id?: number;
    cliente?: string | null;
    telefono?: string | null;
}

export interface AbonoInterface {
    id: number;
    numero: string;
    fecha: string;
    monto: number;
    metodo: string | null;
    referencia: string | null;
    usuario: string | null;
    turno_id: number;
    anulado: boolean;
    motivo_anulacion: string | null;
}

export interface ClienteDetalleInterface {
    cliente: ClienteInterface;
    resumen: {
        compras: number;
        total_comprado: number;
        ultima_compra: string | null;
        vencido: number;
    };
    pendientes: CuentaCobrarInterface[];
    abonos: AbonoInterface[];
}

export interface MovimientoEstadoCuentaInterface {
    fecha: string;
    tipo: "venta" | "abono" | "devolucion";
    documento: string | null;
    descripcion: string;
    cargo: number;
    abono: number;
    saldo: number;
}

export interface EstadoCuentaInterface {
    desde: string;
    hasta: string;
    saldo_anterior: number;
    cargos: number;
    abonos: number;
    saldo_final: number;
    saldo_actual: number;
    vencido: number;
    movimientos: MovimientoEstadoCuentaInterface[];
    pendientes: CuentaCobrarInterface[];
}

export interface CarteraResponseInterface extends PaginaInterface {
    cuentas: CuentaCobrarInterface[];
    resumen: {
        total: number;
        clientes: number;
        antiguedad: { por_vencer: number; d1_30: number; d31_60: number; d61_90: number; mas_90: number };
    };
}

export interface PedidoEspecialInterface {
    id: number;
    uuid: string;
    numero: string;
    nombre: string;
    telefono: string | null;
    cliente_id: number | null;
    cliente: string | null;
    estado: "abierto" | "cobrado" | "cancelado";
    total: number;
    anticipo: number;
    pendiente: number;
    fecha_entrega: string | null;
    observaciones: string | null;
    usuario: string | null;
    venta: { id: number; numero: string } | null;
    motivo_cancelacion: string | null;
    creado: string;
    items: PedidoItemInterface[];
    anticipos: { fecha: string; tipo: string; monto: number; metodo: string | null; referencia: string | null }[];
}
