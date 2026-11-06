import { useEffect, useState } from "react";

import QtyStepper from "../form/QtyStepper";
import { ItemOrdenInterface } from "../../types/mesas";
import { cantidad as numero } from "../../utils/formato";

interface Props {
    item: ItemOrdenInterface | null;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (motivo: string, cantidad: number) => void;
}

const MOTIVOS = ["El cliente ya no lo quiso", "Se pidió por error", "Se tardó mucho", "Salió mal preparado"];

// Cancelar todo o parte de un producto ya enviado a cocina o barra: pide motivo y luego el PIN del administrador
export default function CancelarItemModal({ item, isLoading, onClose, onConfirm }: Props) {
    const [motivo, setMotivo] = useState("");
    const [cuantos, setCuantos] = useState(1);

    useEffect(() => {
        if (item) { setMotivo(""); setCuantos(item.cantidad); }
    }, [item]);

    if (!item) return null;
    const entero = Number.isInteger(item.cantidad);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Cancelar {item.descripcion}</h2>
                    <p className="mt-1 text-sm text-gray-500">Ya se envió a preparar: sale un aviso "CANCELADO" en su área y queda en la auditoría. Pide autorización del administrador.</p>
                </div>

                {item.cantidad > 1 && entero && (
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                        <span className="text-sm text-gray-700">¿Cuántos cancelar? <span className="text-gray-400">(de {numero(item.cantidad)})</span></span>
                        <QtyStepper value={cuantos} min={1} max={item.cantidad} onChange={setCuantos} ariaLabel="Cantidad a cancelar" />
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {MOTIVOS.map((m) => (
                        <button key={m} type="button" onClick={() => setMotivo(m)}
                            className={`rounded-lg px-3 py-2 text-sm ${motivo === m ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"}`}>{m}</button>
                    ))}
                </div>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} rows={2} placeholder="Motivo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />

                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm">Volver</button>
                    <button type="button" disabled={!motivo.trim() || isLoading || cuantos <= 0} onClick={() => onConfirm(motivo.trim(), cuantos)}
                        className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {cuantos < item.cantidad ? `Cancelar ${numero(cuantos)}` : "Cancelar producto"}
                    </button>
                </div>
            </div>
        </div>
    );
}
