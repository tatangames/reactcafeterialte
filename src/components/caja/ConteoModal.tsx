import { useEffect, useState } from "react";

import MoneyInput from "../form/MoneyInput";

interface Props {
    isOpen: boolean;
    titulo: string;
    descripcion?: string;
    textoConfirmar: string;
    isLoading: boolean;
    pedirObservaciones?: boolean;
    onClose: () => void;
    onConfirm: (datos: { total: number; observaciones: string }) => void;
}

// Arqueo parcial: se escribe el efectivo contado de la gaveta, sin desglose por billetes
export default function ConteoModal({
    isOpen, titulo, descripcion, textoConfirmar, isLoading, pedirObservaciones = true, onClose, onConfirm,
}: Props) {
    const [monto, setMonto] = useState("");
    const [observaciones, setObservaciones] = useState("");

    useEffect(() => {
        if (isOpen) {
            setMonto("");
            setObservaciones("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[92vh] flex flex-col">
                <div className="p-6 pb-3">
                    <h2 className="text-lg font-semibold">{titulo}</h2>
                    {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
                </div>
                <div className="overflow-y-auto px-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado</label>
                        <MoneyInput value={monto} onChange={setMonto} prefix="$" placeholder="0.00" />
                    </div>
                    {pedirObservaciones && (
                        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={500}
                            placeholder="Observaciones (opcional)"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                    )}
                </div>
                <div className="flex justify-end gap-2 p-6 pt-4">
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" disabled={isLoading || monto === ""}
                        onClick={() => onConfirm({ total: Number(monto), observaciones: observaciones.trim() })}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50">
                        {isLoading ? "Guardando..." : textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}
