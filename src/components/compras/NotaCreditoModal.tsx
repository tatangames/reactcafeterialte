import { useState } from "react";
import toast from "react-hot-toast";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { anularNotaCredito, registrarNotaCredito } from "../../services/compras";
import { CuentaPagarInterface } from "../../types/compras";
import { dinero, fechaCorta, mensajeError } from "../../utils/formato";

interface Props {
    cuenta: CuentaPagarInterface | null;
    onCerrar: () => void;
    onCambio: (cuenta: CuentaPagarInterface) => void;
}

const MOTIVOS = ["Se digitó de más en la compra", "Devolución al proveedor", "Descuento del proveedor", "Producto dañado o vencido"];

/**
 * Nota de crédito / ajuste: rebaja lo que se le debe al proveedor por una compra
 * sin mover caja. Sirve cuando la compra se digitó de más y ya no se puede anular
 * porque parte del producto se usó. Cada nota queda en auditoría y se puede anular.
 */
export default function NotaCreditoModal({ cuenta, onCerrar, onCambio }: Props) {
    const [monto, setMonto] = useState("");
    const [motivo, setMotivo] = useState("");
    const [documento, setDocumento] = useState("");
    const [guardando, setGuardando] = useState(false);

    if (!cuenta) return null;

    const valor = Number(monto || 0);
    const excede = valor > cuenta.saldo + 0.001;
    const listo = valor > 0 && !excede && motivo.trim().length > 0;
    const notas = cuenta.notas_credito ?? [];

    const cerrar = () => {
        setMonto("");
        setMotivo("");
        setDocumento("");
        onCerrar();
    };

    const guardar = async () => {
        setGuardando(true);
        try {
            const res = await registrarNotaCredito(cuenta.id, { monto: valor, motivo: motivo.trim(), documento: documento.trim() || undefined });
            toast.success(res.message);
            setMonto("");
            setMotivo("");
            setDocumento("");
            onCambio(res.cuenta);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo registrar la nota"));
        } finally {
            setGuardando(false);
        }
    };

    const anular = async (id: number, numero: string) => {
        const razon = window.prompt(`¿Por qué se anula la nota ${numero}? El monto vuelve a deberse.`);
        if (!razon?.trim()) return;
        try {
            const res = await anularNotaCredito(id, razon.trim());
            toast.success(res.message);
            onCambio(res.cuenta);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo anular la nota"));
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Nota de crédito · {cuenta.compra}</h2>
                    <p className="text-sm text-gray-500">
                        {cuenta.proveedor} · compra de {dinero(cuenta.monto)} · se debe <b>{dinero(cuenta.saldo)}</b>
                    </p>
                    <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        Rebaja lo que se le debe al proveedor sin mover la caja. Si además entró producto de más,
                        sácalo en Inventario → reducir inventario.
                    </p>
                </div>

                {cuenta.saldo > 0 && cuenta.estado !== "anulada" ? (
                    <div className="space-y-3">
                        <FormField label="Monto a rebajar" required>
                            <MoneyInput prefix="$" value={monto} onChange={setMonto} />
                        </FormField>
                        {excede && <p className="text-sm text-red-600">No puede ser mayor a lo que se debe ({dinero(cuenta.saldo)})</p>}
                        <FormField label="Motivo" required>
                            <input className={inputClass} value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej.: se digitaron 5 lb de harina de más" />
                        </FormField>
                        <div className="flex flex-wrap gap-1.5">
                            {MOTIVOS.map((m) => (
                                <button key={m} type="button" onClick={() => setMotivo(m)}
                                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200">{m}</button>
                            ))}
                        </div>
                        <FormField label="N.º de la nota del proveedor" hint="Opcional, si te dio un papel">
                            <input className={inputClass} value={documento} maxLength={50} onChange={(e) => setDocumento(e.target.value)} />
                        </FormField>
                        {valor > 0 && !excede && (
                            <p className="text-sm text-gray-600">Después de la nota se deberá <b>{dinero(Math.round((cuenta.saldo - valor) * 100) / 100)}</b>.</p>
                        )}
                    </div>
                ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Esta cuenta no tiene saldo pendiente.</p>
                )}

                {notas.length > 0 && (
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-gray-700">Notas de esta compra</h3>
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
                            {notas.map((n) => (
                                <li key={n.id} className={`flex items-start gap-3 px-3 py-2 ${n.anulada ? "text-gray-400" : ""}`}>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">{n.numero} · {fechaCorta(n.fecha)} {n.anulada && <span className="text-xs text-red-500">(anulada)</span>}</p>
                                        <p className="text-xs">{n.motivo}{n.documento ? ` · doc. ${n.documento}` : ""}{n.usuario ? ` · ${n.usuario}` : ""}</p>
                                    </div>
                                    <span className={`font-semibold ${n.anulada ? "line-through" : ""}`}>−{dinero(n.monto)}</span>
                                    {!n.anulada && cuenta.estado !== "anulada" && (
                                        <button type="button" onClick={() => anular(n.id, n.numero)} className="text-xs text-red-600 hover:underline">Anular</button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={cerrar} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm hover:bg-gray-200">Cerrar</button>
                    {cuenta.saldo > 0 && cuenta.estado !== "anulada" && (
                        <button type="button" onClick={guardar} disabled={!listo || guardando}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {guardando ? "Guardando..." : "Registrar nota"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
