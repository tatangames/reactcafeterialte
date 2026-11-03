import { useEffect, useState } from "react";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { dinero } from "../../utils/formato";
import { MetodoPagoInterface } from "../../types/caja";

export interface PagoCajaForm {
    monto: number;
    metodo_pago_id: number;
    referencia?: string;
}

interface Props {
    isOpen: boolean;
    titulo: string;
    descripcion?: string;
    maximo?: number;          // no se puede recibir más que esto (saldo o pendiente)
    sugerido?: number;
    metodos: MetodoPagoInterface[];
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (pago: PagoCajaForm) => void;
}

// Recibe dinero que entra a la caja del turno: abonos de clientes y anticipos de pedidos
export default function PagoCajaModal({ isOpen, titulo, descripcion, maximo, sugerido, metodos, isLoading = false, onClose, onConfirm }: Props) {
    const disponibles = metodos.filter((m) => m.tipo !== "credito");
    const [monto, setMonto] = useState("");
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [referencia, setReferencia] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setMonto(sugerido ? String(sugerido) : "");
        setMetodoId(disponibles.find((m) => m.tipo === "efectivo")?.id ?? disponibles[0]?.id ?? null);
        setReferencia("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const metodo = disponibles.find((m) => m.id === metodoId);
    const valor = Number(monto || 0);
    const excede = maximo !== undefined && valor > maximo + 0.001;
    const valido = valor > 0 && !excede && !!metodo && (!metodo.requiere_referencia || referencia.trim() !== "");

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">{titulo}</h2>
                    {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
                </div>

                <FormField label="Monto" required hint={maximo !== undefined ? `Máximo ${dinero(maximo)}` : undefined}>
                    <MoneyInput prefix="$" value={monto} onChange={setMonto} className="!h-14 text-lg" />
                </FormField>
                {maximo !== undefined && maximo > 0 && (
                    <button type="button" onClick={() => setMonto(String(maximo))} className="text-sm font-medium text-blue-600 hover:underline">
                        Todo: {dinero(maximo)}
                    </button>
                )}
                {excede && <p className="text-sm text-red-600">El monto supera {dinero(maximo)}</p>}

                <FormField label="Forma de pago">
                    <div className="grid grid-cols-3 gap-2">
                        {disponibles.map((m) => (
                            <button key={m.id} type="button" onClick={() => setMetodoId(m.id)}
                                className={`h-12 rounded-lg border text-sm font-medium transition ${m.id === metodoId ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
                                {m.nombre}
                            </button>
                        ))}
                    </div>
                </FormField>
                {metodo?.requiere_referencia && (
                    <FormField label="Referencia" required>
                        <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} />
                    </FormField>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" disabled={isLoading || !valido}
                        onClick={() => metodo && onConfirm({ monto: valor, metodo_pago_id: metodo.id, referencia: referencia.trim() || undefined })}
                        className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {isLoading ? "Registrando..." : `Recibir ${valor > 0 ? dinero(valor) : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
