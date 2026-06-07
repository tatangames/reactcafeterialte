import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import DataTable from "react-data-table-component";
import toast from "react-hot-toast";

import {
    getRolePermissionsTable,
    borrarPermisoRol,
    agregarPermisoRol,
} from "../../services/api";
import { getToken } from "../../utils/auth";

import LoadingModal from "../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../components/modal/ConfirmDeleteModal";
import AgregarPermisoModal from "../../components/modal/AgregarPermisoModal";

interface Permiso {
    id: number;
    name: string;
}

export default function RolesPermisos() {
    const { id } = useParams();
    const location = useLocation();
    const roleName = location.state?.roleName ?? "";

    const roleId = Number(id);

    const [data, setData] = useState<Permiso[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");

    // eliminar
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPermiso, setSelectedPermiso] = useState<Permiso | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // agregar
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchPermisos();
    }, []);

    const fetchPermisos = async () => {
        try {
            setLoading(true);
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            const response = await getRolePermissionsTable(token, roleId);
            setData(response.permisos);
        } catch (error) {
            console.error(error);
            toast.error("Error cargando permisos");
        } finally {
            setLoading(false);
        }
    };

    // ✅ AGREGAR PERMISO
    const handleConfirmAdd = async (permisoId: number) => {
        setIsAdding(true);
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            await agregarPermisoRol(token, roleId, permisoId);

            toast.success("Permiso agregado correctamente");

            await fetchPermisos(); // refresca tabla
            setIsAddModalOpen(false); // 🔥 cierra modal
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 409) {
                toast.error("El rol ya tiene este permiso");
            } else {
                toast.error("No se pudo agregar el permiso");
            }
        } finally {
            setIsAdding(false);
        }
    };

    // eliminar
    const handleDelete = (permiso: Permiso) => {
        setSelectedPermiso(permiso);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedPermiso) return;

        setIsDeleting(true);
        try {
            const token = getToken();
            if (!token) throw new Error("Token no encontrado");

            await borrarPermisoRol(token, roleId, selectedPermiso.id);

            setData((prev) => prev.filter((p) => p.id !== selectedPermiso.id));
            toast.success("Permiso eliminado correctamente");

            setIsDeleteModalOpen(false);
            setSelectedPermiso(null);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el permiso");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredData = data.filter((item) =>
      item.name.toLowerCase().includes(filterText.toLowerCase())
    );

    const columns = [
        {
            name: "ID",
            selector: (row: Permiso) => row.id,
            width: "80px",
            sortable: true,
        },
        {
            name: "Permiso",
            selector: (row: Permiso) => row.name,
            sortable: true,
        },
        {
            name: "Opciones",
            width: "160px",
            cell: (row: Permiso) => (
              <div className="flex justify-center">
                  <button
                    onClick={() => handleDelete(row)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                  >
                      Eliminar
                  </button>
              </div>
            ),
        },
    ];

    return (
      <>
          <LoadingModal isOpen={loading} text="Cargando permisos..." />

          <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Quitar Permiso"
            description="Se eliminará el permiso"
            itemName={selectedPermiso?.name || ""}
            isDeleting={isDeleting}
          />

          <AgregarPermisoModal
            isOpen={isAddModalOpen}
            onClose={() => !isAdding && setIsAddModalOpen(false)}
            onConfirm={handleConfirmAdd}
            isAdding={isAdding}
            permisosAsignados={data.map((p) => p.id)} // 🔥 evita duplicados
          />

          <div className="p-6">
              <div className="mb-6 flex justify-between items-center">
                  <div>
                      <h1 className="text-2xl font-semibold text-gray-800">
                          Permisos del Rol
                      </h1>
                      <p className="text-sm text-gray-500">
                          Rol: <strong>{roleName}</strong> • {filteredData.length} permisos
                      </p>
                  </div>

                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                  >
                      + Agregar Permiso
                  </button>
              </div>

              <div className="flex justify-end mb-4">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="h-[42px] w-[300px] rounded-lg border border-gray-300 px-4 text-sm"
                  />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <DataTable
                    columns={columns}
                    data={filteredData}
                    pagination
                    striped
                    highlightOnHover
                    responsive
                    noDataComponent={
                        <div className="py-6 text-sm text-gray-500">
                            No hay registros para mostrar
                        </div>
                    }
                  />
              </div>
          </div>
      </>
    );
}
