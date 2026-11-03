import { ConfiguracionNegocioInterface } from "../../types/interfaces";
import { VentaInterface } from "../../types/pos";
import { cantidad, dinero } from "../../utils/formato";

interface Props {
    venta: VentaInterface;
    negocio: ConfiguracionNegocioInterface | null;
    copia?: boolean; // reimpresión
}

const Fila = ({ izq, der, fuerte }: { izq: string; der: string; fuerte?: boolean }) => (
    <div className={`flex justify-between gap-3 ${fuerte ? "font-bold" : ""}`}>
        <span>{izq}</span>
        <span className="text-right whitespace-nowrap">{der}</span>
    </div>
);

// Ticket de venta en formato de 80 mm (se imprime con window.print())
export default function TicketVenta({ venta, negocio, copia = false }: Props) {
    return (
        <div className="area-impresion mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-gray-900">
            <div className="text-center">
                <p className="text-sm font-bold">{negocio?.nombre ?? "Panadería Eduardo"}</p>
                {negocio?.razon_social && <p>{negocio.razon_social}</p>}
                {negocio?.direccion && <p>{negocio.direccion}</p>}
                {negocio?.telefono && <p>Tel. {negocio.telefono}</p>}
            </div>

            <hr className="my-2 border-dashed border-gray-500" />
            <Fila izq={`Ticket ${venta.numero}`} der={venta.fecha} />
            <Fila izq={`Atendió: ${venta.usuario ?? ""}`} der={venta.caja ?? ""} />
            {copia && <p className="text-center font-bold">*** COPIA ***</p>}
            {venta.pendiente && (
                <p className="text-center text-[11px]">Emitido sin conexión. El número definitivo se asigna al sincronizar.</p>
            )}
            {venta.estado === "anulada" && <p className="text-center font-bold">*** ANULADA ***</p>}
            {venta.cliente && <p>Cliente: {venta.cliente.nombre}{venta.cliente.documento ? ` (${venta.cliente.documento})` : ""}</p>}
            {venta.pedido?.tipo === "especial" && <p>Pedido {venta.pedido.numero}</p>}

            <hr className="my-2 border-dashed border-gray-500" />
            {venta.detalles.map((d) => (
                <div key={d.id} className="mb-1">
                    <p>{d.nombre}</p>
                    <Fila izq={`  ${cantidad(d.cantidad, d.unidad && d.unidad !== "u" ? d.unidad : null)} x ${dinero(d.precio_unitario)}`} der={dinero(d.cantidad * d.precio_unitario)} />
                    {d.descuento > 0 && <Fila izq="  Descuento" der={`-${dinero(d.descuento)}`} />}
                </div>
            ))}

            <hr className="my-2 border-dashed border-gray-500" />
            {venta.descuento_total > 0 && <Fila izq="Subtotal" der={dinero(venta.subtotal + venta.descuento_lineas)} />}
            {venta.descuento_lineas > 0 && <Fila izq="Descuentos" der={`-${dinero(venta.descuento_lineas)}`} />}
            {venta.descuento_global > 0 && <Fila izq="Descuento general" der={`-${dinero(venta.descuento_global)}`} />}
            <Fila izq="TOTAL" der={dinero(venta.total)} fuerte />

            <hr className="my-2 border-dashed border-gray-500" />
            {(venta.anticipo_aplicado ?? 0) > 0 && <Fila izq="Anticipo recibido" der={dinero(venta.anticipo_aplicado)} />}
            {venta.pagos.map((p, i) => (
                <div key={i}>
                    <Fila izq={p.metodo ?? "Pago"} der={dinero(p.recibido ?? p.monto)} />
                    {p.referencia && <Fila izq="  Ref." der={p.referencia} />}
                </div>
            ))}
            {venta.cambio > 0 && <Fila izq="Cambio" der={dinero(venta.cambio)} fuerte />}
            {venta.credito && <p className="mt-1">Crédito: vence el {venta.credito.fecha_vencimiento.split("-").reverse().join("/")}</p>}
            {venta.credito && (
                <div className="mt-6 text-center">
                    <p>______________________________</p>
                    <p>Firma del cliente</p>
                </div>
            )}

            <hr className="my-2 border-dashed border-gray-500" />
            <p className="text-center">{negocio?.mensaje_ticket ?? "¡Gracias por su compra!"}</p>
            <p className="mt-1 text-center text-[10px] text-gray-500">{venta.uuid.slice(0, 8).toUpperCase()}</p>
        </div>
    );
}
