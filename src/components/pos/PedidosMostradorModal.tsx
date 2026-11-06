import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import CobroModal from "./CobroModal";
import CancelarItemModal from "../mesas/CancelarItemModal";
import { cobrarOrden, quitarItem } from "../../services/mesas";
import { MetodoPagoInterface } from "../../types/caja";
import { ItemOrdenInterface, ESTADOS_ITEM } from "../../types/mesas";
import { PagoFormInterface, PedidoMostradorInterface, VentaInterface } from "../../types/pos";
import { nuevoUuid } from "../../utils/cajaDispositivo";
import { cantidad, dinero, mensajeError } from "../../utils/formato";

interface Props {
    isOpen: boolean;
    cajaId: number | null;
    pedidos: PedidoMostradorInterface[];
    metodos: MetodoPagoInterface[];
    onClose: () => void;
    onCambio: () => void;
    onCobrado: (venta: VentaInterface) => void;
    // «Agregar productos»: vuelve a la venta y lo que se envíe se suma a este pedido
    onAgregarA: (pedido: PedidoMostradorInterface) => void;
}

const minutosDesde = (fecha: string | null, ahora: number) =>
    fecha ? Math.max(0, Math.floor((ahora - new Date(fecha.replace(" ", "T")).getTime()) / 60000)) : 0;

// Pedidos de mostrador con la comanda ya enviada: cobrar todo o solo algunos productos,
// agregar más o cancelar algo (con motivo y PIN; sale el aviso CANCELADO en su área)
export default function PedidosMostradorModal(props: Props) {
    return props.isOpen ? <Contenido {...props} /> : null;
}

function Contenido({ cajaId, pedidos, metodos, onClose, onCambio, onCobrado, onAgregarA }: Props) {
    const [ticketId, setTicketId] = useState<number | null>(null);
    const [seleccion, setSeleccion] = useState<number[]>([]);
    const [cobrando, setCobrando] = useState(false);
    const [quitando, setQuitando] = useState<ItemOrdenInterface | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [ahora, setAhora] = useState(() => Date.now());
    const uuidCobro = useRef(nuevoUuid());

    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 30 * 1000);
        return () => clearInterval(t);
    }, []);

    const pedido = ticketId ? pedidos.find((p) => p.ticket_id === ticketId) ?? null : null;
    const porCobrar = pedido?.items.filter((i) => !i.pagado && i.estado !== "cancelado") ?? [];
    const elegidos = porCobrar.filter((i) => seleccion.includes(i.id));
    // Con productos marcados se cobran solo esos; si no, todo lo pendiente
    const aCobrar = elegidos.length ? elegidos : porCobrar;
    const montoACobrar = Math.round(aCobrar.reduce((t, i) => t + i.subtotal, 0) * 100) / 100;

    const abrir = (id: number) => { setTicketId(id); setSeleccion([]); };
    const alternar = (id: number) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const cobrar = async (pagos: PagoFormInterface[]) => {
        if (!pedido || !cajaId) return;
        setOcupado(true);
        try {
            const res = await cobrarOrden(pedido.orden_id, {
                uuid: uuidCobro.current, caja_id: cajaId, ticket_id: pedido.ticket_id,
                item_ids: elegidos.length ? elegidos.map((i) => i.id) : undefined,
                pagos: pagos.map((p) => ({ metodo_pago_id: p.metodo_pago_id, monto: p.monto, referencia: p.referencia })),
            });
            uuidCobro.current = nuevoUuid();
            setCobrando(false);
            setSeleccion([]);
            // Si quedó algo pendiente sigue abierto el pedido; si no, vuelve a la lista
            if (!elegidos.length || elegidos.length === porCobrar.length) setTicketId(null);
            onCobrado(res.venta);
            onCambio();
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo cobrar"));
        } finally {
            setOcupado(false);
        }
    };

    const confirmarQuitar = async (motivo: string, cuantos: number) => {
        if (!quitando) return;
        setOcupado(true);
        try {
            const res = await quitarItem(quitando.id, motivo, cuantos < quitando.cantidad ? cuantos : undefined);
            if (res.impresion?.errores.length) toast.error(`No se imprimió el aviso CANCELADO: ${res.impresion.errores.join(", ")}`);
            else toast.success("Producto cancelado");
            setQuitando(null);
            setSeleccion([]);
            onCambio();
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo cancelar"));
        } finally {
            setOcupado(false);
        }
    };

    if (cobrando && pedido) {
        return (
            <CobroModal isOpen total={montoACobrar} metodos={metodos} isLoading={ocupado}
                onCancel={() => setCobrando(false)} onConfirm={cobrar} />
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3">
            <div className="flex max-h-[94vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-semibold">{pedido ? `Pedido de ${pedido.nombre}` : "Pedidos por cobrar"}</h2>
                        <p className="text-sm text-gray-500">
                            {pedido
                                ? `Espera ${minutosDesde(pedido.creado_at, ahora)} min · ${pedido.usuario ?? ""} · marca productos para cobrar solo esos`
                                : pedidos.length ? "La comanda ya salió. Abre un pedido para cobrarlo, agregarle o cancelar algo." : ""}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="h-10 w-10 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {!pedido && (
                        <div className="space-y-2">
                            {pedidos.length === 0 && <p className="py-8 text-center text-gray-500">No hay pedidos pendientes de cobro</p>}
                            {pedidos.map((p) => {
                                const min = minutosDesde(p.creado_at, ahora);
                                return (
                                    <button key={p.ticket_id} type="button" onClick={() => abrir(p.ticket_id)}
                                        className="flex w-full items-center gap-4 rounded-xl border border-gray-200 px-4 py-3 text-left hover:bg-gray-50">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-lg font-bold text-gray-900">{p.nombre}</p>
                                            <p className="truncate text-sm text-gray-500">
                                                {p.items.filter((i) => i.estado !== "cancelado" && !i.pagado).map((i) => `${cantidad(i.cantidad)} ${i.nombre}`).join(", ")}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold">{dinero(p.por_cobrar)}</p>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${min >= 30 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                                                {min < 1 ? "Recién" : `${min} min`}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {pedido && (
                        <ul className="divide-y divide-gray-100">
                            {pedido.items.map((i) => {
                                const cancelado = i.estado === "cancelado";
                                const marcable = !i.pagado && !cancelado;
                                const estado = ESTADOS_ITEM[i.estado];
                                return (
                                    <li key={i.id} className={`flex items-center gap-3 py-3 ${cancelado || i.pagado ? "opacity-60" : ""}`}>
                                        <input type="checkbox" className="h-5 w-5" disabled={!marcable} checked={seleccion.includes(i.id)}
                                            onChange={() => alternar(i.id)} aria-label={`Cobrar ${i.descripcion}`} />
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-medium ${cancelado ? "line-through" : ""}`}>{cantidad(i.cantidad)} × {i.descripcion}</p>
                                            {i.notas && <p className="text-xs italic text-gray-600">“{i.notas}”</p>}
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                                <span className={`rounded-full px-2 py-0.5 font-semibold ${i.pagado ? "bg-green-100 text-green-800" : estado?.clase ?? ""}`}>
                                                    {i.pagado ? "Pagado" : estado?.texto ?? i.estado}
                                                </span>
                                                {cancelado && i.motivo_cancelacion && <span className="text-gray-500">{i.motivo_cancelacion}</span>}
                                                {!cancelado && <span className="text-gray-500">{i.area ?? "Sin área"}{i.comanda ? ` · comanda #${i.comanda}` : ""}</span>}
                                            </div>
                                        </div>
                                        <p className="w-20 text-right font-semibold">{dinero(i.subtotal)}</p>
                                        {marcable && (
                                            <button type="button" onClick={() => setQuitando(i)} className="text-sm font-semibold text-red-600 hover:underline">Cancelar</button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {pedido && (
                    <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-6 py-4">
                        <button type="button" onClick={() => setTicketId(null)} className="rounded-xl bg-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-200">Volver</button>
                        <button type="button" onClick={() => onAgregarA(pedido)}
                            className="rounded-xl border-2 border-blue-600 py-3 font-semibold text-blue-700 hover:bg-blue-50">Agregar productos</button>
                        <button type="button" onClick={() => setCobrando(true)} disabled={!aCobrar.length || ocupado}
                            className="rounded-xl bg-green-600 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-40">
                            {elegidos.length ? `Cobrar ${elegidos.length} · ${dinero(montoACobrar)}` : `Cobrar todo ${dinero(montoACobrar)}`}
                        </button>
                    </div>
                )}
            </div>

            <CancelarItemModal item={quitando} isLoading={ocupado} onClose={() => setQuitando(null)} onConfirm={confirmarQuitar} />
        </div>
    );
}
