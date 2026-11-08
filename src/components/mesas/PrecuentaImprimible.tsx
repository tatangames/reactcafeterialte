import { ConfiguracionNegocioInterface } from "../../types/interfaces";
import { OrdenInterface, TicketOrdenInterface } from "../../types/mesas";
import { cantidad, dinero, fechaHora, fechaLocal } from "../../utils/formato";

// Precuenta de 80 mm para revisar con el cliente antes de cobrar (no es comprobante)
export default function PrecuentaImprimible({ orden, ticket, negocio }: {
    orden: OrdenInterface; ticket: TicketOrdenInterface; negocio: ConfiguracionNegocioInterface | null;
}) {
    const items = ticket.items.filter((i) => i.estado !== "cancelado");
    return (
        <div className="area-impresion hidden print:block mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-gray-900">
            <div className="text-center">
                <p className="text-sm font-bold">{negocio?.nombre ?? "Panadería Eduardo"}</p>
                <p className="font-bold">PRECUENTA</p>
                <p>{orden.terminal.nombre} · {ticket.nombre}</p>
                <p>{fechaHora(fechaLocal() + " " + new Date().toTimeString().slice(0, 5))}</p>
            </div>
            <hr className="my-2 border-dashed border-gray-500" />
            {items.map((i) => (
                <div key={i.id} className="mb-1">
                    <p>{i.nombre}</p>
                    {/* Extras y cambios debajo, un renglón cada uno con «*», como en la comanda */}
                    {i.modificadores.map((m) => <p key={m.id} className="pl-3">* {m.opcion}{m.precio > 0 ? ` (+${dinero(m.precio)})` : ""}</p>)}
                    {(i.texto_ajustes ?? []).map((t) => <p key={t} className="pl-3">* {t}</p>)}
                    <div className="flex justify-between gap-3">
                        <span>  {cantidad(i.cantidad)} x {dinero(i.precio_unitario)}</span>
                        <span>{dinero(i.subtotal)}{i.pagado ? " (pagado)" : ""}</span>
                    </div>
                </div>
            ))}
            <hr className="my-2 border-dashed border-gray-500" />
            <div className="flex justify-between font-bold"><span>TOTAL</span><span>{dinero(ticket.total)}</span></div>
            {ticket.por_cobrar !== ticket.total && <div className="flex justify-between"><span>Por cobrar</span><span>{dinero(ticket.por_cobrar)}</span></div>}
            <hr className="my-2 border-dashed border-gray-500" />
            <p className="text-center text-[11px]">Este documento no es un comprobante de pago</p>
        </div>
    );
}
