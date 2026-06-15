import { useState, useEffect } from "react";
import { Modal } from "../../ui/modal";

interface ProveedorEditarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { nombre: string; notas?: string; activo: boolean }) => Promise<void>;
    isLoading: boolean;
    title: string;
    initialNombre: string;
    initialNotas: string | null;
    initialActivo: boolean;
}

export default function ProveedorEditarModal({
                                                 isOpen,
                                                 onClose,
                                                 onConfirm,
                                                 isLoading,
                                                 title,
                                                 initialNombre,
                                                 initialNotas,
                                                 initialActivo,
                                             }: ProveedorEditarModalProps) {
    const [nombre, setNombre] = useState("");
    const [notas, setNotas] = useState("");
    const [activo, setActivo] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setNombre(initialNombre);
            setNotas(initialNotas ?? "");
            setActivo(initialActivo);
        }
    }, [isOpen, initialNombre, initialNotas, initialActivo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        await onConfirm({
            nombre: nombre.trim(),
            notas: notas.trim() || undefined,
            activo,
        });
    };

    const handleClose = () => {
        if (!isLoading) onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            className="max-w-md p-8 sm:p-10"
            showCloseButton={false}
        >
            <div className="flex flex-col">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength={200}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notas <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            disabled={isLoading}
                            rows={3}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                        />
                    </div>

                    <div className="mb-8 flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={activo}
                            onChange={(e) => setActivo(e.target.checked)}
                            disabled={isLoading}
                            className="h-4 w-4"
                        />
                        <span className="text-sm text-gray-700">Activo</span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="min-w-[140px] rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !nombre.trim()}
                            className="min-w-[140px] rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? "Actualizando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}