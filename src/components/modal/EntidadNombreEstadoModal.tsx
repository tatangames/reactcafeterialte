import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";

interface EntidadNombreEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { nombre: string; estado: boolean }) => Promise<void>;
  isLoading: boolean;

  title: string;
  initialNombre: string;
  initialEstado: boolean;
  maxLength?: number;
}

export default function EntidadNombreEstadoModal({
                                                   isOpen,
                                                   onClose,
                                                   onConfirm,
                                                   isLoading,
                                                   title,
                                                   initialNombre,
                                                   initialEstado,
                                                   maxLength = 100,
                                                 }: EntidadNombreEstadoModalProps) {
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setNombre(initialNombre);
      setEstado(initialEstado);
    }
  }, [isOpen, initialNombre, initialEstado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    await onConfirm({
      nombre: nombre.trim(),
      estado,
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
        {/* HEADER */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            {title}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={maxLength}
              disabled={isLoading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div className="mb-8 flex items-center gap-3">
            <input
              type="checkbox"
              checked={estado}
              onChange={(e) => setEstado(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4"
            />
            <span className="text-sm text-gray-700">
              Estado
            </span>
          </div>

          {/* FOOTER */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="min-w-[140px] rounded-lg border border-gray-300 px-6 py-3 text-sm"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || !nombre.trim()}
              className="min-w-[140px] rounded-lg bg-blue-600 px-6 py-3 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Actualizando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
