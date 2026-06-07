import { useState } from "react";
import { Modal } from "../ui/modal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nombre: string, descripcion?: string) => Promise<void>;
  isCreating: boolean;
}

export default function NuevoPermisoModal({ isOpen, onClose, onConfirm, isCreating }: Props) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim()) {
      await onConfirm(nombre.trim(), descripcion.trim() || undefined);
      setNombre("");
      setDescripcion("");
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setNombre("");
      setDescripcion("");
      onClose();
    }
  };

  return (
      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md p-8 sm:p-10" showCloseButton={false}>
        <div className="flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Agregar Permiso</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Nombre */}
            <div className="mb-5">
              <label htmlFor="permiso" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del permiso
              </label>
              <input
                  id="permiso"
                  type="text"
                  placeholder="admin.sidebar.roles"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={100}
                  disabled={isCreating}
                  autoComplete="off"
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">
                {nombre.length}/100
              </p>
            </div>

            {/* Descripción (opcional) */}
            <div className="mb-8">
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción{" "}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                  id="descripcion"
                  placeholder="Describe para qué sirve este permiso..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={200}
                  disabled={isCreating}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 disabled:bg-gray-50 disabled:cursor-not-allowed resize-none transition"
              />
              <p className="mt-1 text-xs text-gray-400 text-right">
                {descripcion.length}/200
              </p>
            </div>

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
                {isCreating ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
  );
}