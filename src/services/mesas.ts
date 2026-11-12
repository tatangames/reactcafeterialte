// Servicios de mesas, cuentas separadas, comandas y su configuración

import { api } from "./api";
import { CatalogoMesasInterface, ComandaInterface, OrdenInterface, TerminalMapaInterface } from "../types/mesas";
import { VentaInterface } from "../types/pos";

// avisos: se agregó igual, pero no alcanza la existencia (el cobro es el que lo exige)
type ConOrden = { success: number; message?: string; orden: OrdenInterface; avisos?: string[] };

export const getMapa = async (): Promise<TerminalMapaInterface[]> => (await api.get("/mesas/mapa")).data.terminales;
export const getCatalogoMesas = async (): Promise<CatalogoMesasInterface> => (await api.get("/mesas/catalogo")).data;

export const getTerminal = async (id: number) =>
    (await api.get(`/mesas/terminales/${id}`)).data as { terminal: { id: number; nombre: string; tipo: string; zona: string | null; capacidad: number }; orden: OrdenInterface | null };

export const abrirTerminal = async (id: number, datos: { cliente_id?: number | null } = {}) =>
    (await api.post(`/mesas/terminales/${id}/abrir`, datos)).data as ConOrden;

export const actualizarOrden = async (orden: number, datos: { comensales?: number | null; cliente_id?: number | null; notas?: string | null }) =>
    (await api.put(`/mesas/ordenes/${orden}`, datos)).data as ConOrden;

export interface AjusteNuevo { producto_id: number; cantidad: number }
export interface ItemNuevo { producto_id: number; cantidad: number; modificadores?: number[]; notas?: string; ajustes?: AjusteNuevo[] }
export type ResultadoImpresion = { impresas: number; errores: string[] } | null;

export const agregarItems = async (orden: number, items: ItemNuevo[], ticketId?: number | null) =>
    (await api.post(`/mesas/ordenes/${orden}/items`, { ticket_id: ticketId ?? null, items })).data as ConOrden;

export const actualizarItem = async (item: number, datos: { cantidad?: number; notas?: string | null; ajustes?: AjusteNuevo[]; modificadores?: number[] }) =>
    (await api.put(`/mesas/items/${item}`, datos)).data as ConOrden;

// Sin cantidad se quita toda la línea; con cantidad solo esa parte (1 de 3 cafés)
export const quitarItem = async (item: number, motivo?: string, cantidad?: number) =>
    (await api.post(`/mesas/items/${item}/quitar`, { motivo, cantidad })).data as ConOrden & { impresion: ResultadoImpresion };

export const anularComanda = async (comanda: number, motivo: string) =>
    (await api.post(`/mesas/comandas/${comanda}/anular`, { motivo })).data as ConOrden & { impresion: ResultadoImpresion };

// itemIds: enviar solo esos productos; sin ellos, todo lo pendiente
export const enviarComanda = async (orden: number, notas?: string, itemIds?: number[]) =>
    (await api.post(`/mesas/ordenes/${orden}/enviar`, { notas, item_ids: itemIds })).data as ConOrden & {
        impresion: { impresas: number; errores: string[]; sin_impresora: boolean };
        comandas: ComandaInterface[];
    };

export const entregarItems = async (orden: number, itemIds: number[]) =>
    (await api.post(`/mesas/ordenes/${orden}/entregar`, { item_ids: itemIds })).data as ConOrden;

export const crearTicket = async (orden: number, nombre?: string) =>
    (await api.post(`/mesas/ordenes/${orden}/tickets`, { nombre })).data as ConOrden & { ticket_id: number };

export const renombrarTicket = async (ticket: number, nombre: string) =>
    (await api.put(`/mesas/tickets/${ticket}`, { nombre })).data as ConOrden;

export const eliminarTicket = async (ticket: number) => (await api.delete(`/mesas/tickets/${ticket}`)).data as ConOrden & { message?: string };

export const moverItems = async (orden: number, itemIds: number[], ticketId: number) =>
    (await api.post(`/mesas/ordenes/${orden}/mover`, { item_ids: itemIds, ticket_id: ticketId })).data as ConOrden;

export const dividirItem = async (item: number, cantidad: number, ticketId: number) =>
    (await api.post(`/mesas/items/${item}/dividir`, { cantidad, ticket_id: ticketId })).data as ConOrden;

export const cobrarOrden = async (orden: number, datos: {
    uuid: string; caja_id: number; ticket_id?: number | null; item_ids?: number[]; cliente_id?: number | null;
    descuento_global?: { tipo: "porcentaje" | "monto"; valor: number } | null;
    pagos: { metodo_pago_id: number; monto: number; referencia?: string }[];
}) => (await api.post(`/mesas/ordenes/${orden}/cobrar`, datos, { timeout: 15000 })).data as ConOrden & { venta: VentaInterface };

export const cerrarOrden = async (orden: number, motivo?: string) =>
    (await api.post(`/mesas/ordenes/${orden}/cerrar`, { motivo })).data as { success: number; message: string };

export const trasladarOrden = async (orden: number, terminalId: number) =>
    (await api.post(`/mesas/ordenes/${orden}/trasladar`, { terminal_id: terminalId })).data as ConOrden;

// ── Comandas (cocina y barra trabajan con su ticket impreso) ──
export const entregarComanda = async (id: number) =>
    (await api.post(`/mesas/comandas/${id}/entregar`)).data as { comanda: ComandaInterface };

export const imprimirComanda = async (id: number) =>
    (await api.post(`/mesas/comandas/${id}/imprimir`)).data as { impreso: boolean; message: string; comanda: ComandaInterface };

// ── Configuración ──────────────────────────────────────────
export interface TerminalConfigInterface {
    id: number; nombre: string; tipo: "mesa" | "caja"; zona: string | null; capacidad: number; orden: number;
    caja_id: number | null; caja: string | null; activo: boolean; ocupada: boolean;
    usada?: boolean; // ya tuvo órdenes: no se borra, se desactiva
}

export const getTerminalesConfig = async () =>
    (await api.get("/mesas/config/terminales")).data as { terminales: TerminalConfigInterface[]; zonas: string[] };

export const guardarTerminal = async (datos: Partial<TerminalConfigInterface>, id?: number) =>
    (id ? await api.put(`/mesas/config/terminales/${id}`, datos) : await api.post("/mesas/config/terminales", datos)).data as { message: string };

export const ordenarTerminales = async (ids: number[]) =>
    (await api.put("/mesas/config/terminales/orden", { ids })).data as { message: string };

export const getAreasConfig = async () =>
    (await api.get("/mesas/config/areas")).data as {
        areas: AreaConfigInterface[];
        impresoras: { id: number; nombre: string; uso: string }[];
        categorias: { id: number; nombre: string; area_preparacion_id: number | null }[];
    };

// usada: ya recibió comandas, no se borra (se desactiva)
export interface AreaConfigInterface { id: number; nombre: string; color: string; impresora_id: number | null; activo: boolean; usada?: boolean }

export const guardarArea = async (datos: Omit<AreaConfigInterface, "id">, id?: number) =>
    (id ? await api.put(`/mesas/config/areas/${id}`, datos) : await api.post("/mesas/config/areas", datos)).data as { message: string };

// Solo si nunca se usaron; si no, el servidor responde 422 con el motivo
export const borrarTerminal = async (id: number) =>
    (await api.delete(`/mesas/config/terminales/${id}`)).data as { message: string };

export const borrarArea = async (id: number) =>
    (await api.delete(`/mesas/config/areas/${id}`)).data as { message: string };

export const asignarCategorias = async (asignaciones: { categoria_id: number; area_id: number | null }[]) =>
    (await api.put("/mesas/config/categorias", { asignaciones })).data as { message: string };

export interface GrupoConfigInterface {
    id: number; nombre: string; obligatorio: boolean; multiple: boolean; activo: boolean; minimo?: number; maximo?: number | null;
    opciones: {
        id: number; nombre: string; precio: number; activo: boolean; maximo?: number; obligatorio?: boolean; exclusiva?: boolean;
        producto_id: number | null; insumo: string | null; cantidad: number | null; unidad_medida_id: number | null; unidad: string | null;
    }[];
    productos: { id: number; nombre: string }[];
}

export interface InsumoModificadorInterface { id: number; nombre: string; unidad_medida_id: number | null; unidad: string | null; tipo: string | null; clase?: string }
export interface UnidadModificadorInterface { id: number; nombre: string; abreviatura: string; tipo: string }

// Los modificadores propios de un producto: sus bloques en orden (Tipo de leche, Azúcar, Extras)
export interface ConjuntoConfigInterface {
    id: number; producto_id: number; producto: string; bloques: GrupoConfigInterface[];
}

// Una opción al guardar: obligatoria, «una sola» (exclusiva) y activa son de cada opción
export interface OpcionGuardar {
    id?: number; nombre: string; precio: number; maximo: number; obligatorio: boolean; exclusiva: boolean; activo: boolean;
    producto_id: number | null; cantidad: number | null; unidad_medida_id: number | null;
}

// minimo/maximo: unidades en total del bloque, contando repeticiones (0 = opcional; null = sin tope)
export interface BloqueGuardar { id?: number; nombre: string; minimo: number; maximo: number | null; opciones: OpcionGuardar[] }

// 20 s como máximo: si el servidor no contesta, la pantalla lo dice en vez de quedarse cargando
export const getGruposConfig = async () =>
    (await api.get("/mesas/config/modificadores", { timeout: 20000 })).data as {
        conjuntos: ConjuntoConfigInterface[]; grupos: GrupoConfigInterface[];
        // conjunto_id: sus modificadores, si ya tiene
        productos: { id: number; nombre: string; conjunto_id: number | null }[];
        insumos: InsumoModificadorInterface[]; unidades: UnidadModificadorInterface[];
    };

export const guardarModificadoresProducto = async (productoId: number, bloques: BloqueGuardar[]) =>
    (await api.put(`/mesas/config/productos/${productoId}/modificadores`, { bloques })).data as { id: number; message: string };

export const quitarModificadoresProducto = async (productoId: number) =>
    (await api.delete(`/mesas/config/productos/${productoId}/modificadores`)).data as { message: string };
