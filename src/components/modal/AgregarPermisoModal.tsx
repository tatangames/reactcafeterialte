import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { getPermisosTable } from "../../services/api";
import { getToken } from "../../utils/auth";
import toast from "react-hot-toast";

interface Permiso {
  id: number;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (permisoId: number) => Promise<void>;
  isAdding: boolean;
  permisosAsignados: number[]; // ids ya asignados al rol
}

export default function AgregarPermisoModal({
                                              isOpen,
                                              onClose,
                                              onConfirm,
                                              isAdding,
                                              permisosAsignados,
                                            }: Props) {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  // 🔥 cuando se abre el modal → cargar permisos y resetear select
  useEffect(() => {
    if (isOpen) {
      setSelectedId("");
      cargarPermisos();
    }
  }, [isOpen, permisosAsignados]);

  const cargarPermisos = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) throw new Error("Token no encontrado");

      const res = await getPermisosTable(token);

      // 🔥 solo permisos NO asignados
      const disponibles = res.permisos.filter(
        (p: Permiso) => !permisosAsignados.includes(p.id)
      );

      setPermisos(disponibles);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando permisos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    await onConfirm(selectedId); // 👉 el padre agrega, refresca y CIERRA el modal
    setSelectedId(""); // seguridad extra
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Agregar Permiso
      </h2>

      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permiso
        </label>

        <select
          value={selectedId}
          onChange={(e) =>
            setSelectedId(e.target.value ? Number(e.target.value) : "")
          }
          disabled={loading || isAdding}
          className="
            w-full px-4 py-2.5 border border-gray-300 rounded-lg
            text-sm text-gray-800
            focus:border-blue-400 focus:outline-none
            focus:ring-2 focus:ring-blue-500/10
            disabled:bg-gray-50 disabled:cursor-not-allowed
            transition
          "
        >
          <option value="">Seleccione un permiso</option>

          {permisos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {!loading && permisos.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">
            Este rol ya tiene todos los permisos disponibles.
          </p>
        )}

        <div className="flex gap-3 mt-8 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isAdding}
            className="
              min-w-[120px] px-5 py-2.5 border border-gray-300 rounded-lg
              text-sm hover:bg-gray-50 transition
            "
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={isAdding || !selectedId}
            className="
              min-w-[120px] px-5 py-2.5 bg-green-600 text-white rounded-lg
              hover:bg-green-700 disabled:opacity-50 transition
            "
          >
            {isAdding ? "Agregando..." : "Agregar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
