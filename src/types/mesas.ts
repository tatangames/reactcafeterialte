// Tipos de mesas, cuentas separadas y comandas

export type TipoTerminal = "mesa" | "caja";
export type EstadoItem = "pendiente" | "enviado" | "en_preparacion" | "listo" | "entregado" | "cancelado";
export type EstadoComanda = "pendiente" | "en_preparacion" | "terminada" | "entregada" | "cancelada";

export interface TerminalMapaInterface {
    id: number;
    nombre: string;
    tipo: TipoTerminal;
    zona: string | null;
    capacidad: number;
    caja_id: number | null;
    orden: {
        id: number;
        numero: string;
        abierta_at: string;
        comensales: number | null;
        usuario: string | null;
        tickets: string[];
        total: number;
        por_cobrar: number;
        por_enviar: number;
        listos: number;
    } | null;
}

export interface ModificadorElegido { id: number; grupo: string; opcion: string; precio: number }

// Lo que lleva una unidad del plato según su receta (en la unidad del inventario)
export interface IngredienteReceta { producto_id: number; nombre: string; base: number; unidad: string | null }
// Lo que el cliente pidió distinto ("solo 1 huevo"): el precio no cambia
export interface AjusteReceta extends IngredienteReceta { cantidad: number }

export interface ItemOrdenInterface {
    id: number;
    ticket_id: number;
    producto_id: number;
    nombre: string;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    modificadores: ModificadorElegido[];
    ajustes: AjusteReceta[];
    texto_ajustes: string[];
    notas: string | null;
    motivo_cancelacion: string | null;
    estado: EstadoItem;
    area: string | null;
    comanda: string | null;
    pagado: boolean;
    venta_id: number | null;
    usuario: string | null;
    hora: string;
}

export interface TicketOrdenInterface {
    id: number;
    nombre: string;
    estado: "abierto" | "pagado" | "cancelado";
    posicion: number;
    total: number;
    por_cobrar: number;
    items: ItemOrdenInterface[];
}

export interface ComandaInterface {
    id: number;
    numero: string;
    orden_id: number;
    terminal: string;
    terminal_tipo?: string; // mesa, caja…
    cuenta?: string | null; // "Ticket 1", "Juan"
    area: string | null;
    color: string;
    estado: EstadoComanda;
    notas: string | null;
    usuario: string | null;
    enviada_at: string;
    iniciada_at: string | null;
    terminada_at: string | null;
    entregada_at: string | null;
    items: { id: number; nombre: string; cantidad: number; modificadores: string[]; ajustes: string[]; notas: string | null; cancelado: boolean }[];
}

export interface OrdenInterface {
    id: number;
    uuid: string;
    numero: string;
    estado: "abierta" | "cerrada" | "cancelada";
    terminal: { id: number; nombre: string; tipo: TipoTerminal };
    comensales: number | null;
    cliente: { id: number; nombre: string } | null;
    usuario: string | null;
    notas: string | null;
    abierta_at: string;
    tickets: TicketOrdenInterface[];
    comandas: ComandaInterface[];
    totales: { total: number; cobrado: number; por_cobrar: number; por_enviar: number; listos: number };
}

export interface GrupoModificadorInterface {
    id: number;
    nombre: string;
    obligatorio: boolean;
    multiple: boolean;
    // agotado: su insumo (Leche entera) ya no alcanza; no se puede elegir
    opciones: { id: number; nombre: string; precio: number; agotado?: boolean }[];
}

export interface ProductoMesaInterface {
    id: number;
    nombre: string;
    sku: string | null;
    codigo_barras: string | null;
    precio: number;
    imagen: string | null;
    color: string | null;
    permite_fraccion: boolean;
    categorias: number[];
    grupos: number[];
    stock: number | null;
    receta: IngredienteReceta[];
}

export interface CatalogoMesasInterface {
    productos: ProductoMesaInterface[];
    categorias: { id: number; nombre: string }[];
    grupos: GrupoModificadorInterface[];
}

export const ESTADOS_ITEM: Record<EstadoItem, { texto: string; clase: string }> = {
    pendiente:      { texto: "Por enviar", clase: "bg-amber-100 text-amber-800" },
    enviado:        { texto: "Enviado", clase: "bg-blue-100 text-blue-800" },
    en_preparacion: { texto: "Preparando", clase: "bg-indigo-100 text-indigo-800" },
    listo:          { texto: "Listo", clase: "bg-green-600 text-white" },
    entregado:      { texto: "Entregado", clase: "bg-gray-100 text-gray-600" },
    cancelado:      { texto: "Cancelado", clase: "bg-red-100 text-red-700 line-through" },
};

export const ESTADOS_COMANDA: Record<EstadoComanda, string> = {
    pendiente: "Pendiente", en_preparacion: "En preparación", terminada: "Terminada", entregada: "Entregada", cancelada: "Cancelada",
};

// "hh:mm:ss" transcurrido desde una fecha "AAAA-MM-DD HH:MM:SS"
export const transcurrido = (desde: string, ahora: number = Date.now()): string => {
    const inicio = new Date(desde.replace(" ", "T")).getTime();
    const s = Math.max(0, Math.floor((ahora - inicio) / 1000));
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const minutosDesde = (desde: string, ahora: number = Date.now()): number =>
    Math.floor((ahora - new Date(desde.replace(" ", "T")).getTime()) / 60000);
