import { useState } from "react";
import { Modal } from "../ui/modal";

interface NuevoRolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nombre: string) => Promise<void>;
  isCreating: boolean;
}

export default function NuevoRolModal({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        isCreating,
                                      }: NuevoRolModalProps) {
  const [nombre, setNombre] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim()) {
      await onConfirm(nombre.trim());
      setNombre("");
    }
  };

  const handleClose = () => {
    if (!isCreating) {
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
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Nuevo Rol
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Nombre del rol"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isCreating}
              maxLength={50}
              autoComplete="off"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed transition"
              autoFocus
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isCreating || !nombre.trim()}
              className="min-w-[140px] rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isCreating ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creando...
                </>
              ) : (
                "Agregar"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}