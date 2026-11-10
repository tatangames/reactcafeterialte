// Tipos de caja y turnos (Fase 2)

import { PaginaInterface } from "./interfaces";

export type TipoMetodoPago = "efectivo" | "tarjeta" | "transferencia" | "credito" | "otro";

export interface MetodoPagoInterface {
    id: number;
    nombre: string;
    tipo: TipoMetodoPago;
    afecta_efectivo: boolean;
    requiere_referencia: boolean;
    orden: number;
    activo: boolean;
}

export interface DenominacionInterface {
    valor: string;
    tipo: "billete" | "moneda";
    etiqueta: string;
}

export interface CajaInterface {
    id: number;
    nombre: string;
    impresora_id: number | null;
    activo: boolean;
    turno_abierto: { id: number; abierto_at: string; usuario: string | null } | null;
}

export interface CatalogosCajaInterface {
    cajas: CajaInterface[];
    metodos_pago: MetodoPagoInterface[];
    denominaciones: DenominacionInterface[];
}

export type TipoMovimientoCaja = "venta" | "ingreso" | "egreso" | "devolucion" | "abono" | "gasto" | "anticipo";

export interface TurnoInterface {
    id: number;
    caja_id: number;
    caja: string | null;
    estado: "abierto" | "cerrado";
    abierto_at: string;
    cerrado_at: string | null;
    usuario_apertura_id: number;
    usuario_apertura: string | null;
    usuario_cierre: string | null;
    fondo_inicial: number;
    total_ventas: number;
    total_ingresos: number;
    total_egresos: number;
    efectivo_esperado: number | null;
    efectivo_contado: number | null;
    diferencia: number | null;
    observaciones_apertura: string | null;
    observaciones_cierre: string | null;
}

export interface MovimientoCajaInterface {
    id: number;
    uuid: string;
    fecha: string;
    tipo: TipoMovimientoCaja;
    tipo_texto: string;
    entrada: boolean;
    metodo_pago: string | null;
    monto: number;
    concepto: string;
    referencia: string | null;
    documento_tipo: string | null;
    documento_id: number | null;
    usuario: string | null;
    anulado: boolean;
    anulado_por: string | null;
    motivo_anulacion: string | null;
    manual: boolean;
}

export interface ResumenMetodoInterface {
    metodo_pago_id: number;
    nombre: string;
    tipo: TipoMetodoPago;
    afecta_efectivo: boolean;
    entradas: number;
    salidas: number;
    neto: number;
}

// Lista de compras: lo que quedó en su mínimo o por debajo
export interface PorComprarInterface {
    producto_id: number;
    producto: string;
    clase: string;
    unidad: string | null;
    stock_actual: number;
    stock_minimo: number;
    faltante: number;
}

// Lo que salió del inventario con las ventas del turno (insumos de recetas incluidos)
export interface ConsumoTurnoInterface {
    producto_id: number;
    producto: string;
    unidad: string | null;
    vendido: number;
    consumo_interno: number;
    costo: number;
}

export interface ResumenTurnoInterface {
    fondo_inicial: number;
    consumo: ConsumoTurnoInterface[];
    por_comprar: PorComprarInterface[];
    ticket_por_comprar?: boolean; // Datos del negocio: si el ticket de cierre imprime «POR COMPRAR»
    efectivo_esperado: number | null;
    por_tipo: Record<TipoMovimientoCaja, number>;
    por_metodo: ResumenMetodoInterface[];
    ventas_por_usuario: { usuario_id: number; usuario: string | null; cantidad: number; total: number }[];
    totales: { ventas: number; devoluciones: number; ingresos: number; egresos: number };
}

export interface ArqueoInterface {
    id: number;
    tipo: "parcial" | "cierre";
    fecha: string;
    denominaciones: Record<string, number> | null;
    total_contado: number;
    efectivo_esperado: number | null;
    diferencia: number | null;
    observaciones: string | null;
    usuario: string | null;
}

// Lo registrado durante el turno fuera de la caja (compras, gastos, inventario, producción, mermas)
export interface RegistroTurnoInterface {
    tipo: string;
    id: number;
    numero: string | null;
    descripcion: string;
    monto: number | null;
    usuario: string | null;
    fecha: string;
    anulado: boolean;
}

export interface TurnoDetalleInterface {
    turno: TurnoInterface;
    resumen: ResumenTurnoInterface;
    movimientos: MovimientoCajaInterface[];
    arqueos: ArqueoInterface[];
    registros?: RegistroTurnoInterface[];
    cierre_ciego: boolean;
}

export interface TurnoActualResponseInterface extends Partial<Omit<TurnoDetalleInterface, "turno">> {
    caja: { id: number; nombre: string; activo: boolean };
    turno: TurnoInterface | null;
    // El turno abierto es de otra persona (se fue sin cerrarlo): solo se puede cerrar
    turno_ajeno?: boolean;
    // Datos del negocio → «Avisar si no alcanza el cambio»
    aviso_cambio?: boolean;
    // Solo sin turno abierto: quién cerró el anterior y qué dejó por comprar
    turno_anterior?: { id: number; cerrado_at: string | null; cerro: string | null; efectivo_contado: number | null } | null;
    // Lo que quedó en la gaveta al cerrar el anterior: el efectivo no se retira, es el fondo del nuevo turno
    fondo_sugerido?: number | null;
    por_comprar?: PorComprarInterface[];
}

export interface HistorialTurnosResponseInterface extends PaginaInterface {
    desde: string;
    hasta: string;
    turnos: TurnoInterface[];
    totales: { turnos: number; ventas: number; faltantes: number; sobrantes: number };
    usuarios: { id: number; nombre: string }[]; // quienes abrieron o cerraron turnos
}
