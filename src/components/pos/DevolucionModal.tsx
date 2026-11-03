import { useEffect, useMemo, useState } from "react";

import QtyStepper from "../form/QtyStepper";
import MoneyInput from "../form/MoneyInput";
import { MetodoPagoInterface } from "../../types/caja";
import { VentaInterface } from "../../types/pos";
import { cantidad, dinero } from "../../utils/formato";

export interface DevolucionForm {
    motivo: string;
    metodo_pago_id?: number;
    items: { venta_detalle_id: number; cantidad: number; reingresa_inventario: boolean }[];
}

interface Props {
    venta: VentaInterface | null;
    metodos: MetodoPagoInterface[];
    isLoading: boolean;
    onCancel: () => void;
    onConfirm: (datos: DevolucionForm) => void;
}

// Devolución de productos de una venta (total o parcial) con reembolso
export default function DevolucionModal({ venta, metodos, isLoading, onCancel, onConfirm }: Props) {
    const [cantidades, setCantidades] = useState<Record<number, string>>({});
    const [danados, setDanados] = useState<Record<number, boolean>>({});
    const [motivo, setMotivo] = useState("");
    // En una venta al crédito con saldo, la devolución puede descontarse de lo que debe el cliente
    const conCuenta = !!venta?.credito && venta.credito.estado === "pendiente";
    const disponibles = metodos.filter((m) => m.activo && (m.tipo !== "credito" || conCuenta));
    const [metodoId, setMetodoId] = useState<number | undefined>();

    useEffect(() => {
        if (venta) {
            setCantidades({});
            setDanados({});
            setMotivo("");
            setMetodoId((conCuenta ? disponibles.find((m) => m.tipo === "credito") : undefined)?.id
                ?? disponibles.find((m) => m.afecta_efectivo)?.id);
        }
    }, [venta]);

    // Factor del descuento general para estimar el reembolso como lo hace el servidor
    const factor = venta && venta.subtotal > 0 ? (venta.subtotal - venta.descuento_global) / venta.subtotal : 1;

    const estimado = useMemo(() => {
        if (!venta) return 0;
        return venta.detalles.reduce((s, d) => {
            const c = Number(cantidades[d.id] || 0);
            return s + Math.round((d.subtotal / d.cantidad) * factor * c * 100) / 100;
        }, 0);
    }, [venta, cantidades, factor]);

    if (!venta) return null;

    const items = venta.detalles
        .map((d) => ({ venta_detalle_id: d.id, cantidad: Number(cantidades[d.id] || 0), reingresa_inventario: !danados[d.id] }))
        .filter((i) => i.cantidad > 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold">Devolución de la venta {venta.numero}</h2>
                    <p className="text-sm text-gray-500">Indica cuánto se devuelve de cada producto</p>
                </div>

                <div className="overflow-y-auto divide-y divide-gray-100">
                    {venta.detalles.map((d) => (
                        <div key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-800">{d.nombre}</p>
                                <p className="text-xs text-gray-500">
                                    Vendido {cantidad(d.cantidad, d.unidad)} · devuelto {cantidad(d.cantidad_devuelta)} · {dinero(d.subtotal)}
                                </p>
                            </div>
                            {d.disponible <= 0 ? (
                                <span className="text-xs text-gray-400">Ya devuelto</span>
                            ) : Number.isInteger(d.cantidad) ? (
                                <QtyStepper value={Number(cantidades[d.id] || 0)} max={d.disponible}
                                    onChange={(v) => setCantidades((c) => ({ ...c, [d.id]: String(v) }))} />
                            ) : (
                                <div className="w-32">
                                    <MoneyInput value={cantidades[d.id] ?? ""} decimals={3} suffix={d.unidad ?? undefined} placeholder="0"
                                        onChange={(v) => setCantidades((c) => ({ ...c, [d.id]: Number(v) > d.disponible ? String(d.disponible) : v }))} />
                                </div>
                            )}
                            {Number(cantidades[d.id] || 0) > 0 && (
                                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <input type="checkbox" checked={!!danados[d.id]} onChange={(e) => setDanados((x) => ({ ...x, [d.id]: e.target.checked }))}
                                        className="h-4 w-4 accent-red-600" />
                                    Dañado (no vuelve al inventario)
                                </label>
                            )}
                        </div>
                    ))}
                </div>

                <div className="space-y-3 border-t border-gray-100 px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        <span className="self-center text-sm text-gray-600">Reembolsar en:</span>
                        {disponibles.map((m) => (
                            <button key={m.id} type="button" onClick={() => setMetodoId(m.id)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium ${metodoId === m.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                                {m.tipo === "credito" ? "Descontar de su cuenta" : m.nombre}
                            </button>
                        ))}
                    </div>
                    <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300}
                        placeholder="Motivo de la devolución (obligatorio)"
                        className="w-full h-11 rounded-lg border border-gray-300 px-4 text-sm focus:border-blue-400 focus:outline-none" />
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reembolso estimado <strong className="text-lg text-gray-900">{dinero(estimado)}</strong></span>
                        <div className="flex gap-2">
                            <button type="button" onClick={onCancel} disabled={isLoading} className="px-4 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                            <button type="button" disabled={isLoading || items.length === 0 || !motivo.trim()}
                                onClick={() => onConfirm({ motivo: motivo.trim(), metodo_pago_id: metodoId, items })}
                                className="px-5 py-3 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50">
                                {isLoading ? "Registrando..." : "Registrar devolución"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
