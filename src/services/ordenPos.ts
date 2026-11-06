import { api } from "./api";

// Un botón del POS: los productos a la venta en el orden en que aparecen
export interface ProductoOrdenPosInterface {
    id: number;
    nombre: string;
    precio: number;
    imagen: string | null;
    color_pos: string | null;
    orden_pos: number;
    categorias: number[];
}

export interface OrdenPosResponse {
    paso: number;
    categorias: { id: number; nombre: string }[];
    productos: ProductoOrdenPosInterface[];
}

export const getOrdenPos = async () =>
    (await api.get("/productos/orden-pos")).data as OrdenPosResponse;

// ids en el orden en que deben aparecer
export const guardarOrdenPos = async (ids: number[]) =>
    (await api.put("/productos/orden-pos", { ids })).data as { message: string };

/** Los productos que comparten alguna categoría (o todos si no tiene), sin el propio. */
export const vecinosEnPos = (productos: ProductoOrdenPosInterface[], categorias: number[], excluir?: number) =>
    productos
        .filter(p => p.id !== excluir && (categorias.length === 0 || p.categorias.some(c => categorias.includes(c))))
        .sort((a, b) => a.orden_pos - b.orden_pos || a.nombre.localeCompare(b.nombre));
