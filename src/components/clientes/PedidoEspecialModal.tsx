import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import ClienteBuscador from "./ClienteBuscador";
import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import QtyStepper from "../form/QtyStepper";
import { guardarPedidoEspecial } from "../../services/clientes";
import { nuevoUuid } from "../../utils/cajaDispositivo";
import { dinero, mensajeError } from "../../utils/formato";
import { ClienteInterface, PedidoEspecialInterface } from "../../types/clientes";
import { MetodoPagoInterface } from "../../types/caja";
import { ProductoPosInterface } from "../../types/pos";

interface Linea { producto_id: number; nombre: string; precio: number; cantidad: number; fraccion: boolean; notas: string }

interface Props {
    isOpen: boolean;
    pedido: PedidoEspecialInterface | null; // null = nuevo
    productos: ProductoPosInterface[];
    metodos: MetodoPagoInterface[];
    cajaId: number | null;
    turnoAbierto: boolean;
    onClose: () => void;
    onSaved: (pedido: PedidoEspecialInterface) => void;
}

// "2026-11-03 15:00" ↔ valor de <input type="datetime-local">
const aLocal = (fecha: string | null) => (fecha ? fecha.replace(" ", "T").slice(0, 16) : "");
const manana = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(15, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T15:00`;
};

// Alta y edición de un pedido especial (encargo con fecha de entrega y anticipo)
export default function PedidoEspecialModal({ isOpen, pedido, productos, metodos, cajaId, turnoAbierto, onClose, onSaved }: Props) {
    const [cliente, setCliente] = useState<{ id: number; nombre: string } | null>(null);
    const [eligiendoCliente, setEligiendoCliente] = useState(false);
    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState("");
    const [entrega, setEntrega] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [lineas, setLineas] = useState<Linea[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [anticipo, setAnticipo] = useState("");
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [referencia, setReferencia] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [uuid, setUuid] = useState(nuevoUuid);

    const metodosAnticipo = metodos.filter((m) => m.tipo !== "credito");

    useEffect(() => {
        if (!isOpen) return;
        setUuid(nuevoUuid());
        setCliente(pedido?.cliente_id ? { id: pedido.cliente_id, nombre: pedido.cliente ?? pedido.nombre } : null);
        setEligiendoCliente(false);
        setNombre(pedido?.nombre ?? "");
        setTelefono(pedido?.telefono ?? "");
        setEntrega(pedido ? aLocal(pedido.fecha_entrega) : manana());
        setObservaciones(pedido?.observaciones ?? "");
        setLineas(pedido?.items.map((i) => {
            const p = productos.find((x) => x.id === i.producto_id);
            return {
                producto_id: i.producto_id, nombre: i.nombre, precio: p?.precio ?? i.precio_unitario,
                cantidad: i.cantidad, fraccion: p?.permite_fraccion ?? false, notas: i.notas ?? "",
            };
        }) ?? []);
        setBusqueda("");
        setAnticipo("");
        setMetodoId(metodosAnticipo.find((m) => m.tipo === "efectivo")?.id ?? metodosAnticipo[0]?.id ?? null);
        setReferencia("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, pedido]);

    const sugerencias = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        if (!t) return [];
        return productos.filter((p) => p.nombre.toLowerCase().includes(t)).slice(0, 8);
    }, [busqueda, productos]);

    if (!isOpen) return null;

    const total = Math.round(lineas.reduce((s, l) => s + l.precio * l.cantidad, 0) * 100) / 100;
    const montoAnticipo = Number(anticipo || 0);
    const metodo = metodosAnticipo.find((m) => m.id === metodoId);
    const anticipoValido = montoAnticipo === 0 || (montoAnticipo <= total + 0.001 && turnoAbierto && !!metodo
        && (!metodo.requiere_referencia || referencia.trim() !== ""));

    const agregar = (p: ProductoPosInterface) => {
        setLineas((ls) => ls.some((l) => l.producto_id === p.id)
            ? ls.map((l) => (l.producto_id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l))
            : [...ls, { producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, fraccion: p.permite_fraccion, notas: "" }]);
        setBusqueda("");
    };

    const cambiar = (id: number, cambios: Partial<Linea>) =>
        setLineas((ls) => ls.map((l) => (l.producto_id === id ? { ...l, ...cambios } : l)).filter((l) => l.cantidad > 0));

    const elegirCliente = (c: ClienteInterface) => {
        setCliente({ id: c.id, nombre: c.nombre });
        setNombre(c.nombre);
        setTelefono(c.telefono ?? "");
        setEligiendoCliente(false);
    };

    const guardar = async () => {
        setGuardando(true);
        try {
            const res = await guardarPedidoEspecial({
                uuid,
                caja_id: cajaId,
                cliente_id: cliente?.id ?? null,
                nombre: nombre.trim(),
                telefono: telefono.trim(),
                fecha_entrega: entrega.replace("T", " "),
                observaciones: observaciones.trim(),
                items: lineas.map((l) => ({ producto_id: l.producto_id, cantidad: l.cantidad, notas: l.notas.trim() || undefined })),
                ...(!pedido && montoAnticipo > 0 ? { anticipo: montoAnticipo, metodo_pago_id: metodoId ?? undefined, referencia: referencia.trim() || undefined } : {}),
            }, pedido?.id);
            toast.success(res.message);
            onSaved(res.pedido);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo guardar el pedido"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-3xl shadow-xl space-y-4 max-h-[94vh] overflow-y-auto">
                <h2 className="text-lg font-semibold">{pedido ? `Editar pedido ${pedido.numero}` : "Nuevo pedido especial"}</h2>

                {eligiendoCliente ? (
                    <div className="rounded-lg border border-gray-200 p-3">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium">Cliente registrado</p>
                            <button type="button" onClick={() => setEligiendoCliente(false)} className="text-sm text-gray-500 hover:underline">Cerrar</button>
                        </div>
                        <ClienteBuscador onSelect={elegirCliente} autoFocus />
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        {cliente
                            ? <><span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">Cliente: {cliente.nombre}</span>
                                <button type="button" onClick={() => setCliente(null)} className="text-gray-500 hover:underline">Quitar</button></>
                            : <button type="button" onClick={() => setEligiendoCliente(true)} className="font-medium text-blue-600 hover:underline">Vincular a un cliente registrado (opcional)</button>}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField label="A nombre de" required>
                        <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} />
                    </FormField>
                    <FormField label="Teléfono">
                        <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} inputMode="tel" />
                    </FormField>
                    <FormField label="Entrega" required>
                        <input type="datetime-local" className={inputClass} value={entrega} onChange={(e) => setEntrega(e.target.value)} />
                    </FormField>
                </div>

                <FormField label="Productos" required>
                    <div className="relative">
                        <input className={inputClass} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto para agregar" />
                        {sugerencias.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                {sugerencias.map((p) => (
                                    <button key={p.id} type="button" onClick={() => agregar(p)}
                                        className="flex w-full justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50">
                                        <span>{p.nombre}</span><span className="text-gray-500">{dinero(p.precio)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </FormField>

                {lineas.length > 0 && (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                        {lineas.map((l) => (
                            <div key={l.producto_id} className="flex flex-wrap items-center gap-3 p-3">
                                <div className="min-w-[160px] flex-1">
                                    <p className="font-medium text-gray-800">{l.nombre}</p>
                                    <input value={l.notas} onChange={(e) => cambiar(l.producto_id, { notas: e.target.value })} maxLength={200}
                                        placeholder="Detalle: sabor, dedicatoria, decoración..."
                                        className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none" />
                                </div>
                                <QtyStepper value={l.cantidad} paso={l.fraccion ? 0.5 : 1} onChange={(v) => cambiar(l.producto_id, { cantidad: v })} />
                                <p className="w-24 text-right font-semibold">{dinero(l.precio * l.cantidad)}</p>
                            </div>
                        ))}
                        <div className="flex justify-between p-3 text-base font-semibold"><span>Total</span><span>{dinero(total)}</span></div>
                    </div>
                )}

                <FormField label="Observaciones">
                    <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={500}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                </FormField>

                {!pedido && (
                    <div className="rounded-lg bg-gray-50 p-3 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <FormField label="Anticipo" hint={turnoAbierto ? "Entra a la caja del turno" : "Abre el turno de caja para recibir anticipo"}>
                                <MoneyInput prefix="$" value={anticipo} onChange={setAnticipo} disabled={!turnoAbierto} />
                            </FormField>
                            {montoAnticipo > 0 && (
                                <FormField label="Forma de pago">
                                    <select className={inputClass} value={metodoId ?? ""} onChange={(e) => setMetodoId(Number(e.target.value))}>
                                        {metodosAnticipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                    </select>
                                </FormField>
                            )}
                        </div>
                        {montoAnticipo > 0 && metodo?.requiere_referencia && (
                            <FormField label="Referencia" required>
                                <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} />
                            </FormField>
                        )}
                        {montoAnticipo > total + 0.001 && <p className="text-sm text-red-600">El anticipo no puede superar el total</p>}
                        {montoAnticipo > 0 && montoAnticipo <= total && <p className="text-sm text-gray-600">Pendiente al entregar: <strong>{dinero(total - montoAnticipo)}</strong></p>}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !nombre.trim() || !entrega || lineas.length === 0 || !anticipoValido}
                        className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {guardando ? "Guardando..." : "Guardar pedido"}
                    </button>
                </div>
            </div>
        </div>
    );
}
