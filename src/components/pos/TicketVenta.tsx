import type { ReactNode } from "react";
import { ConfiguracionNegocioInterface } from "../../types/interfaces";
import { VentaInterface } from "../../types/pos";
import { dolaresEnLetras } from "../../utils/numeroALetras";
import { fechaCorta, fechaHora } from '../../utils/formato';

interface Props {
    venta: VentaInterface;
    negocio: ConfiguracionNegocioInterface | null;
    copia?: boolean; // reimpresión
}

const n2 = (v: number) => Number(v).toFixed(2);
const Separador = () => <p className="my-3 overflow-hidden whitespace-nowrap text-gray-400">{"=".repeat(60)}</p>;

// Texto "doble alto" como la impresora térmica: letra grande comprimida a lo ancho.
// El ancho se compensa (1 / 0.62) para que el texto envuelva igual y la altura del bloque sea la real.
const DobleAlto = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <div className="overflow-hidden">
        <p className={`origin-left text-center leading-[1.05] ${className}`} style={{ width: `${100 / 0.62}%`, transform: "scaleX(0.62)" }}>
            {children}
        </p>
    </div>
);

// Recibo de 80 mm con el mismo formato que el ticket térmico (ImpresionService::ticket), impreso con window.print()
export default function TicketVenta({ venta, negocio }: Props) {
    const metodos = [...new Set(venta.pagos.map((p) => p.metodo).filter(Boolean))] as string[];
    const condicion = metodos.length ? metodos.join(", ").replace(/, ([^,]*)$/, " y $1") : (venta.anticipo_aplicado ?? 0) > 0 ? "Anticipo" : "Efectivo";
    const nombre = negocio?.nombre ?? "Panadería Eduardo";

    return (
        <div className="area-impresion mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-black">
            <div className="text-center">
                <DobleAlto className="text-[26px] uppercase">{negocio?.razon_social || nombre}</DobleAlto>
                {negocio?.direccion && <p className="mt-1">{negocio.direccion}</p>}
                {negocio?.razon_social && <p>{nombre}</p>}
                {negocio?.nit && <p className="font-bold">NIT: {negocio.nit}</p>}
                {negocio?.nrc && <p className="font-bold">NRC: {negocio.nrc}</p>}
                <p>Actividad económica:{negocio?.actividad_economica ? ` ${negocio.actividad_economica}` : ""}</p>
                <p>Tipo de establecimiento:</p>
                <p>{negocio?.tipo_establecimiento || "Sucursal / Agencia"}</p>
                {negocio?.telefono && <p>Tel: {negocio.telefono}</p>}
            </div>

            <Separador />
            <div className="text-center">
                <p className="font-bold">Recibo</p>
                {venta.estado === "anulada" && <p className="font-bold">*** ANULADA ***</p>}
                {venta.pendiente && <p className="text-[11px]">Emitido sin conexión. El número definitivo se asigna al sincronizar.</p>}
                <p>Fecha y hora de generación:</p>
                <p className="font-bold">{fechaHora(venta.fecha)}</p>
            </div>

            <Separador />
            <DobleAlto className="text-[22px]">Datos del receptor</DobleAlto>
            <p className="mt-1">Nombre: {venta.cliente?.nombre || "Consumidor Final"}</p>
            {venta.cliente?.documento && <p>DUI/NIT: {venta.cliente.documento}</p>}
            <p>Dirección: {venta.cliente?.direccion || "Ciudad"}</p>
            <p>No. de Venta: {venta.numero}</p>
            {venta.pedido?.tipo === "especial" && <p>Pedido: {venta.pedido.numero}</p>}

            <Separador />
            <table className="w-full border-collapse">
                <thead>
                    <tr className="font-bold">
                        <td className="w-[42px] align-top">Cant</td>
                        <td className="align-top">Descripción</td>
                        <td className="pl-2 text-right align-top">Precio</td>
                        <td className="pl-2 text-right align-top">Total</td>
                    </tr>
                </thead>
                <tbody>
                    {venta.detalles.map((d) => (
                        <tr key={d.id}>
                            <td className="align-top">{n2(d.cantidad)}</td>
                            <td className="pr-1 align-top">
                                {d.extras?.length ? d.nombre_base ?? d.nombre : d.nombre}
                                {d.extras?.map((e, i) => <span key={i} className="block pl-1">* {e}</span>)}
                                {d.descuento > 0 && <span className="block">Descuento -{n2(d.descuento)}</span>}
                            </td>
                            <td className="pl-2 text-right align-top">{n2(d.precio_unitario)}</td>
                            <td className="pl-2 text-right align-top">{n2(d.cantidad * d.precio_unitario)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-right">
                {venta.descuento_total > 0 && <p>Subtotal: $ {n2(venta.subtotal + venta.descuento_lineas)}</p>}
                {venta.descuento_global > 0 && <p>Descuento: -$ {n2(venta.descuento_global)}</p>}
                <p>Total: $ {n2(venta.total)}</p>
                {(venta.anticipo_aplicado ?? 0) > 0 && (
                    <>
                        <p>Anticipo recibido: $ {n2(venta.anticipo_aplicado ?? 0)}</p>
                        <p>Pagado hoy: $ {n2(venta.total - (venta.anticipo_aplicado ?? 0))}</p>
                    </>
                )}
            </div>
            <p>Total en letras:</p>
            <p>{dolaresEnLetras(venta.total)}</p>
            <p>Condición de la operación: {condicion}</p>
            {venta.pagos.filter((p) => p.referencia).map((p, i) => <p key={i}>{p.metodo} ref. {p.referencia}</p>)}
            {venta.credito && <p className="mt-1">Crédito: vence el {fechaCorta(venta.credito.fecha_vencimiento)}</p>}
            {venta.credito && (
                <div className="mt-6 text-center">
                    <p>______________________________</p>
                    <p>Firma del cliente</p>
                </div>
            )}

            <Separador />
            <p className="whitespace-pre-line text-center">{negocio?.mensaje_ticket || "Muchas gracias por su compra."}</p>
        </div>
    );
}
