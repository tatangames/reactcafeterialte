// Tipos del punto de venta (Fase 3)

import { PaginaInterface } from "./interfaces";
import { AjusteReceta, GrupoModificadorInterface, IngredienteReceta, ItemOrdenInterface } from "./mesas";

export interface ProductoPosInterface {
    id: number;
    nombre: string;
    sku: string | null;
    codigo_barras: string | null;
    imagen: string | null;
    color: string | null;
    precio: number;
    categorias: number[];
    unidad: string | null;
    permite_fraccion: boolean;
    controla_stock: boolean;
    consumo_interno?: boolean; // cena del personal: a $0.00, solo descuenta su receta
    area?: string | null;      // área de su comanda (null = comanda general)
    stock: number | null;
    bajo_minimo: boolean;
    grupos?: number[];              // extras que se eligen al tocarlo (Leche, Endulzante)
    receta?: IngredienteReceta[];   // lo que lleva: se puede quitar o aumentar sin cambiar el precio
    alcanza?: number | null;        // platos con receta: cuántos alcanzan con los insumos (null = sin límite)
}

export interface CatalogoPosInterface {
    productos: ProductoPosInterface[];
    categorias: { id: number; nombre: string }[];
    grupos?: GrupoModificadorInterface[];
    // false: no se agrega a la venta más de lo que hay en existencia
    permitir_stock_negativo?: boolean;
    generado_at: string;
}

export type TipoDescuento = "porcentaje" | "monto";

export interface DescuentoInterface {
    tipo: TipoDescuento;
    valor: number;
}

// clave «p{id}» (o sin clave, en carritos guardados antes): el producto tal cual, tocarlo otra vez suma 1.
// Con extras, ingredientes cambiados o nota la línea es única y su precio lleva los extras.
export interface LineaCarritoInterface {
    producto: ProductoPosInterface;
    cantidad: number;
    descuento: DescuentoInterface | null;
    clave?: string;
    precio?: number;           // precio unitario con extras (si no, el del producto)
    modificadores?: number[];
    extras?: string[];         // nombres de los extras elegidos
    ajustes?: AjusteReceta[];
    notas?: string;
}

// Pedido de mostrador: la comanda ya salió a cocina o barra y se cobra cuando el cliente recoge
export interface PedidoMostradorInterface {
    orden_id: number;
    ticket_id: number;
    nombre: string;
    total: number;
    por_cobrar: number;
    piezas: number;
    creado_at: string | null;
    usuario: string | null;
    items: ItemOrdenInterface[];
}

export interface PagoFormInterface {
    metodo_pago_id: number;
    nombre: string;
    afecta_efectivo: boolean;
    monto: number;
    referencia?: string;
}

export interface VentaDetalleInterface {
    id: number;
    producto_id: number;
    nombre: string;
    unidad: string | null;
    cantidad: number;
    precio_unitario: number;
    descuento: number;
    subtotal: number;
    cantidad_devuelta: number;
    disponible: number;
}

export interface VentaInterface {
    id: number;
    uuid: string;
    numero: string;
    numero_provisional?: string | null;
    origen?: "online" | "offline";
    conflictos?: string[];
    pendiente?: boolean;   // venta sin conexión que aún no llega al servidor
    estado: "completada" | "anulada" | "devuelta";
    fecha: string;
    caja: string | null;
    turno_id: number;
    usuario: string | null;
    subtotal: number;
    descuento_lineas: number;
    descuento_global: number;
    descuento_total: number;
    base_imponible: number;
    impuesto: number;
    total: number;
    cambio: number;
    anticipo_aplicado?: number;
    cliente?: { id: number; nombre: string; documento: string | null; telefono: string | null; direccion?: string | null } | null;
    credito?: { monto: number; saldo: number; fecha_vencimiento: string; estado: string } | null;
    pedido?: { numero: string; tipo: "precuenta" | "especial" } | null;
    observaciones: string | null;
    descuento_autorizado_por: string | null;
    anulada_por: string | null;
    anulacion_autorizada_por: string | null;
    anulada_at: string | null;
    motivo_anulacion: string | null;
    detalles: VentaDetalleInterface[];
    pagos: { metodo: string | null; tipo: string | null; monto: number; recibido: number | null; cambio: number; referencia: string | null }[];
    devoluciones: { id: number; numero: string; fecha: string; total: number; motivo: string; metodo: string | null; usuario: string | null }[];
}

export interface VentaListaInterface {
    id: number;
    numero: string;
    fecha: string;
    estado: VentaInterface["estado"];
    total: number;
    productos: number;
    usuario: string | null;
    caja: string | null;
    turno_id: number;
    cliente?: string | null;
    pagos: string[];
}

export interface VentasResponseInterface extends PaginaInterface {
    ventas: VentaListaInterface[];
    totales: { cantidad: number; total: number };
}

export interface PedidoItemInterface {
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    precio_actual: number;
    disponible: boolean;
    descuento_tipo: TipoDescuento | null;
    descuento_valor: number;
    notas: string | null;
}

export interface PedidoInterface {
    id: number;
    uuid: string;
    numero: string;
    nombre: string;
    estado: "abierto" | "cobrado" | "cancelado";
    total: number;
    observaciones: string | null;
    usuario: string | null;
    creado: string;
    items: PedidoItemInterface[];
}

