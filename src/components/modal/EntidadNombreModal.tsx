import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";

interface EntidadNombreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nombre: string) => Promise<void>;
  isLoading: boolean;

  title: string;
  placeholder: string;
  maxLength?: number;
}

export default function EntidadNombreModal({
                                             isOpen,
                                             onClose,
                                             onConfirm,
                                             isLoading,
                                             title,
                                             placeholder,
                                             maxLength = 100,
                                           }: EntidadNombreModalProps) {
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    if (!isOpen) setNombre("");
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    await onConfirm(nombre.trim());
    setNombre("");
  };

  const handleClose = () => {
    if (!isLoading) {
      setNombre("");
      onClose();
    }
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

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={maxLength}
              disabled={isLoading}
              placeholder={placeholder}
              autoFocus
              autoComplete="off"
              className="
                w-full px-4 py-2.5
                border border-gray-300 rounded-lg
                text-sm text-gray-800
                focus:border-blue-400 focus:outline-none
                focus:ring-2 focus:ring-blue-500/10
                disabled:bg-gray-50 disabled:cursor-not-allowed
              "
            />
          </div>

          {/* FOOTER */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || !nombre.trim()}
              className="min-w-[140px] rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex justify-center gap-2"
            >
              {isLoading ? "Guardando..." : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
