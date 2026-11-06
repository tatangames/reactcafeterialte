// Cálculo del carrito del POS. Replica VentaService::calcular() del backend para
// mostrar la vista previa; el servidor recalcula y lo que se guarda es lo suyo.

import { DescuentoInterface, LineaCarritoInterface } from "../types/pos";

export const redondear = (valor: number): number => Math.round((valor + Number.EPSILON) * 100) / 100;

// Precio unitario de una línea: con extras si los tiene
export const precioDe = (l: LineaCarritoInterface): number => l.precio ?? l.producto.precio;

// Identifica la línea: el producto tal cual (p{id}) o una línea con extras, ingredientes o nota
export const claveDe = (l: LineaCarritoInterface): string => l.clave ?? `p${l.producto.id}`;

// «sin Huevo», «Huevo: 3 (lleva 2)», como en la mesa y la tablet
export const textoAjuste = (a: { nombre: string; base: number; cantidad: number; unidad: string | null }): string => {
    const u = a.unidad && a.unidad !== "u" ? ` ${a.unidad}` : "";
    const n = (v: number) => String(Math.round(v * 1000) / 1000);
    return a.cantidad <= 0 ? `sin ${a.nombre}` : `${a.nombre}: ${n(a.cantidad)}${u} (lleva ${n(a.base)}${u})`;
};

// Extras y cambios de receta de una línea, para mostrarlos en el carrito, el ticket y la comanda
export const detalleDe = (l: LineaCarritoInterface): string =>
    [...(l.extras ?? []), ...(l.ajustes ?? []).map(textoAjuste)].join(", ");

// Lo que se manda al servidor de cada línea
export const itemDeLinea = (l: LineaCarritoInterface) => ({
    producto_id: l.producto.id,
    cantidad: l.cantidad,
    ...(l.modificadores?.length ? { modificadores: l.modificadores } : {}),
    ...(l.ajustes?.length ? { ajustes: l.ajustes.map((a) => ({ producto_id: a.producto_id, cantidad: a.cantidad })) } : {}),
    ...(l.notas ? { notas: l.notas } : {}),
});

export const montoDescuento = (importe: number, descuento: DescuentoInterface | null): number => {
    if (!descuento || descuento.valor <= 0 || importe <= 0) return 0;
    const monto = descuento.tipo === "porcentaje"
        ? redondear(importe * Math.min(descuento.valor, 100) / 100)
        : redondear(descuento.valor);
    return Math.min(monto, importe);
};

export interface LineaCalculada {
    importe: number;
    descuento: number;
    subtotal: number;
}

export interface TotalesCarrito {
    lineas: LineaCalculada[];
    bruto: number;
    descuentoLineas: number;
    subtotal: number;
    descuentoGlobal: number;
    descuentoTotal: number;
    total: number;
    articulos: number;
    porcentajeDescuento: number;
}

export const calcularCarrito = (
    lineas: LineaCarritoInterface[],
    descuentoGlobal: DescuentoInterface | null
): TotalesCarrito => {
    let bruto = 0;
    let descuentoLineas = 0;

    const calculadas = lineas.map((l) => {
        const importe = redondear(precioDe(l) * l.cantidad);
        const descuento = montoDescuento(importe, l.descuento);
        bruto += importe;
        descuentoLineas += descuento;
        return { importe, descuento, subtotal: redondear(importe - descuento) };
    });

    const subtotal = redondear(bruto - descuentoLineas);
    const descGlobal = montoDescuento(subtotal, descuentoGlobal);
    // La panadería no cobra IVA
    const total = redondear(subtotal - descGlobal);

    const descuentoTotal = redondear(descuentoLineas + descGlobal);

    return {
        lineas: calculadas,
        bruto: redondear(bruto),
        descuentoLineas: redondear(descuentoLineas),
        subtotal,
        descuentoGlobal: descGlobal,
        descuentoTotal,
        total,
        articulos: lineas.reduce((s, l) => s + (l.producto.permite_fraccion ? 1 : l.cantidad), 0),
        porcentajeDescuento: bruto > 0 ? (descuentoTotal / bruto) * 100 : 0,
    };
};

// Billetes sugeridos para cobrar en efectivo: el exacto y los siguientes redondeos
export const sugerenciasEfectivo = (total: number): number[] => {
    if (total <= 0) return [];
    const opciones = new Set<number>([redondear(total)]);
    for (const paso of [1, 5, 10, 20, 50, 100]) {
        const valor = Math.ceil(total / paso) * paso;
        if (valor > total) opciones.add(valor);
    }
    return [...opciones].sort((a, b) => a - b).slice(0, 5);
};
