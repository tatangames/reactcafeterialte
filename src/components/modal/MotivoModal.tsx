import { useEffect, useState } from "react";

interface Props {
    isOpen: boolean;
    titulo: string;
    descripcion?: string;
    textoConfirmar?: string;
    colorConfirmar?: string;
    isLoading?: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
}

// Pide un motivo obligatorio antes de una acción que queda en auditoría (anular, reabrir...)
export default function MotivoModal({
    isOpen, titulo, descripcion, textoConfirmar = "Confirmar", colorConfirmar = "bg-red-600 hover:bg-red-700",
    isLoading = false, onClose, onConfirm,
}: Props) {
    const [motivo, setMotivo] = useState("");

    useEffect(() => {
        if (isOpen) setMotivo("");
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">{titulo}</h2>
                    {descripcion && <p className="text-sm text-gray-500 mt-1">{descripcion}</p>}
                </div>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={300} autoFocus
                    placeholder="Motivo (obligatorio)"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={() => onConfirm(motivo.trim())} disabled={isLoading || !motivo.trim()}
                        className={`px-4 py-2.5 text-sm text-white rounded-lg transition disabled:opacity-50 ${colorConfirmar}`}>
                        {isLoading ? "Procesando..." : textoConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}
