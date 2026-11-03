import { useState } from "react";

import TicketVenta from "./TicketVenta";
import { useAuth } from "../../context/AuthContext";
import { useConexion } from "../../context/ConexionContext";
import { VentaInterface } from "../../types/pos";
import { dinero } from "../../utils/formato";

// Indicador de conexión del POS: en línea, sin conexión con ventas pendientes, sincronizando o con errores
export default function EstadoConexion({ compacto = false }: { compacto?: boolean }) {
    const { hasPermission } = useAuth();
    const { enLinea, cola, sincronizando, sincronizar } = useConexion();
    const [abierto, setAbierto] = useState(false);
    const [ticket, setTicket] = useState<VentaInterface | null>(null);

    if (!hasPermission("pos.vender")) return null;

    const conError = cola.filter((v) => v.estado === "error").length;
    const pendientes = cola.length;

    const { color, texto } = sincronizando
        ? { color: "bg-blue-100 text-blue-800", texto: "Sincronizando…" }
        : !enLinea
            ? { color: "bg-amber-100 text-amber-800", texto: pendientes ? `Sin conexión · ${pendientes} pendiente(s)` : "Sin conexión" }
            : conError
                ? { color: "bg-red-100 text-red-700", texto: `${conError} venta(s) sin sincronizar` }
                : pendientes
                    ? { color: "bg-blue-100 text-blue-800", texto: `${pendientes} por sincronizar` }
                    : { color: "bg-green-100 text-green-800", texto: "En línea" };

    return (
        <>
            <button type="button" onClick={() => setAbierto(true)} title="Estado de la conexión"
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${color}`}>
                <span className={`h-2 w-2 rounded-full ${!enLinea ? "bg-amber-500" : conError ? "bg-red-500" : "bg-green-500"} ${sincronizando ? "animate-pulse" : ""}`} />
                {compacto && enLinea && !pendientes ? "" : texto}
            </button>

            {abierto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-lg font-semibold">{enLinea ? "Conectado al servidor" : "Sin conexión con el servidor"}</h2>
                                <p className="text-sm text-gray-500">
                                    {enLinea
                                        ? "Las ventas se registran al instante."
                                        : "Puedes seguir vendiendo: las ventas se guardan en este dispositivo y se envían solas al volver la conexión."}
                                </p>
                            </div>
                            <button type="button" onClick={() => setAbierto(false)} className="h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">✕</button>
                        </div>

                        <div className="overflow-y-auto divide-y divide-gray-100">
                            {cola.length === 0 && <p className="px-6 py-6 text-sm text-gray-500">No hay ventas pendientes en este dispositivo ✓</p>}
                            {cola.map((v) => (
                                <div key={v.uuid} className="flex items-center gap-3 px-6 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800">{v.payload.numero_provisional} · {v.ticket.fecha}</p>
                                        <p className="text-xs text-gray-500">{v.ticket.detalles.length} producto(s) · {v.ticket.usuario}</p>
                                        {v.estado === "error" && <p className="text-xs text-red-600">{v.error} ({v.intentos} intento(s))</p>}
                                    </div>
                                    <span className="font-semibold text-gray-900">{dinero(v.ticket.total)}</span>
                                    <button type="button" onClick={() => setTicket(v.ticket)} className="px-3 py-2 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Ticket</button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
                            <button type="button" onClick={() => setAbierto(false)} className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cerrar</button>
                            <button type="button" onClick={sincronizar} disabled={sincronizando || cola.length === 0}
                                className="px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                {sincronizando ? "Sincronizando…" : "Sincronizar ahora"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ticket && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4">
                    <div className="rounded-2xl bg-gray-100 p-4 max-h-[92vh] overflow-y-auto space-y-3">
                        <TicketVenta venta={ticket} negocio={null} copia />
                        <div className="no-imprimir flex justify-end gap-2">
                            <button type="button" onClick={() => setTicket(null)} className="px-4 py-2.5 text-sm bg-white rounded-lg">Cerrar</button>
                            <button type="button" onClick={() => window.print()} className="px-4 py-2.5 text-sm text-white bg-blue-600 rounded-lg">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
