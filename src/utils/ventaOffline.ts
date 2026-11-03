// Venta registrada sin conexión: se arma en el dispositivo con el mismo cálculo que
// el servidor, se imprime con número provisional y se guarda en la cola para sincronizarla.

import { MetodoPagoInterface } from "../types/caja";
import { DescuentoInterface, LineaCarritoInterface, PagoFormInterface, VentaInterface } from "../types/pos";
import { VentaOfflinePayload } from "../services/sync";
import { redondear, TotalesCarrito } from "./carrito";

const CLAVE_SECUENCIA = "pos_secuencia_offline";

// OFF-<caja>-000001: secuencia propia del dispositivo, no choca con los T-000001 del servidor
export const siguienteNumeroProvisional = (cajaId: number): string => {
    let siguiente = 1;
    try {
        siguiente = Number(localStorage.getItem(CLAVE_SECUENCIA) || 0) + 1;
        localStorage.setItem(CLAVE_SECUENCIA, String(siguiente));
    } catch {
        siguiente = Date.now() % 1_000_000;
    }
    return `OFF-${cajaId}-${String(siguiente).padStart(6, "0")}`;
};

interface Datos {
    uuid: string;
    cajaId: number;
    cajaNombre: string | null;
    turnoId: number | null;
    usuario: string | null;
    lineas: LineaCarritoInterface[];
    totales: TotalesCarrito;
    descuentoGlobal: DescuentoInterface | null;
    pagos: PagoFormInterface[];
    metodos: MetodoPagoInterface[];
}

export const construirVentaOffline = (d: Datos): { payload: VentaOfflinePayload; ticket: VentaInterface } => {
    const numero = siguienteNumeroProvisional(d.cajaId);
    const ahora = new Date();
    const total = d.totales.total;

    // Mismo reparto que el servidor: tarjeta/transferencia primero, el resto en efectivo con cambio
    const efectivoRecibido = redondear(d.pagos.filter((p) => p.afecta_efectivo).reduce((s, p) => s + p.monto, 0));
    const otros = redondear(d.pagos.filter((p) => !p.afecta_efectivo).reduce((s, p) => s + p.monto, 0));
    const efectivoNecesario = redondear(Math.max(total - otros, 0));
    const cambio = efectivoRecibido > 0 ? redondear(Math.max(efectivoRecibido - efectivoNecesario, 0)) : 0;
    const nombreMetodo = (id: number) => d.metodos.find((m) => m.id === id)?.nombre ?? "Pago";

    const payload: VentaOfflinePayload = {
        uuid: d.uuid,
        caja_id: d.cajaId,
        turno_id: d.turnoId,
        numero_provisional: numero,
        fecha_venta: ahora.toISOString(),
        items: d.lineas.map((l) => ({
            producto_id: l.producto.id,
            cantidad: l.cantidad,
            precio_unitario: l.producto.precio,
            descuento_tipo: l.descuento?.tipo ?? null,
            descuento_valor: l.descuento?.valor ?? 0,
        })),
        descuento_global: d.descuentoGlobal,
        pagos: d.pagos.map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto, referencia: p.referencia })),
    };

    const pagosTicket = [
        ...(efectivoRecibido > 0
            ? [{ metodo: nombreMetodo(d.pagos.find((p) => p.afecta_efectivo)!.metodo_pago_id), tipo: "efectivo", monto: efectivoNecesario, recibido: efectivoRecibido, cambio, referencia: null }]
            : []),
        ...d.pagos.filter((p) => !p.afecta_efectivo).map((p) => ({
            metodo: nombreMetodo(p.metodo_pago_id), tipo: null, monto: p.monto, recibido: null, cambio: 0, referencia: p.referencia ?? null,
        })),
    ];

    const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")} `
        + `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

    const ticket: VentaInterface = {
        id: 0,
        uuid: d.uuid,
        numero,
        numero_provisional: numero,
        origen: "offline",
        conflictos: [],
        pendiente: true,
        estado: "completada",
        fecha,
        caja: d.cajaNombre,
        turno_id: d.turnoId ?? 0,
        usuario: d.usuario,
        subtotal: d.totales.subtotal,
        descuento_lineas: d.totales.descuentoLineas,
        descuento_global: d.totales.descuentoGlobal,
        descuento_total: d.totales.descuentoTotal,
        base_imponible: total,
        impuesto: 0,
        total,
        cambio,
        observaciones: null,
        descuento_autorizado_por: null,
        anulada_por: null,
        anulacion_autorizada_por: null,
        anulada_at: null,
        motivo_anulacion: null,
        detalles: d.lineas.map((l, i) => ({
            id: i + 1,
            producto_id: l.producto.id,
            nombre: l.producto.nombre,
            unidad: l.producto.unidad,
            cantidad: l.cantidad,
            precio_unitario: l.producto.precio,
            descuento: d.totales.lineas[i]?.descuento ?? 0,
            subtotal: d.totales.lineas[i]?.subtotal ?? 0,
            cantidad_devuelta: 0,
            disponible: l.cantidad,
        })),
        pagos: pagosTicket,
        devoluciones: [],
    };

    return { payload, ticket };
};
