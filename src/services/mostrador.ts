// Pedidos de mostrador «por cobrar»: la comanda sale a cocina o barra al enviarlos y
// se cobran cuando el cliente recoge. Son los mismos de la tablet (cuentas de la caja).

import { api } from "./api";
import { ComandaInterface } from "../types/mesas";
import { PedidoMostradorInterface } from "../types/pos";

export interface ItemPedidoMostrador {
    producto_id: number;
    cantidad: number;
    modificadores?: number[];
    ajustes?: { producto_id: number; cantidad: number }[];
    notas?: string;
}

export interface ImpresionPedido {
    impresas: number;
    errores: string[];
    sin_impresora: boolean;
    comandas: ComandaInterface[];
}

type RespuestaPedido = { message: string; pedido: PedidoMostradorInterface; impresion: ImpresionPedido };

export const getPedidosMostrador = async (cajaId: number) =>
    (await api.get("/mostrador/pedidos", { params: { caja_id: cajaId } })).data as {
        pedidos: PedidoMostradorInterface[]; mesas_por_cobrar: string[];
    };

export const crearPedidoMostrador = async (datos: { uuid: string; caja_id: number; nombre: string; items: ItemPedidoMostrador[] }) =>
    (await api.post("/mostrador/pedidos", datos, { timeout: 20000 })).data as RespuestaPedido;

export const agregarAPedidoMostrador = async (ticketId: number, items: ItemPedidoMostrador[]) =>
    (await api.post(`/mostrador/pedidos/${ticketId}/items`, { items }, { timeout: 20000 })).data as RespuestaPedido;
