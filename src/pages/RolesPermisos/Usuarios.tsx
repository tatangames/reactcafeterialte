import DataTable from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import NuevoUsuarioModal from "../../components/modal/NuevoUsuarioModal.tsx";
import EditarUsuarioModal from "../../components/modal/Editarusuariomodal.tsx";
import { useUsuarios } from "../../hooks/rolesypermisos/useUsuariosHook.ts";

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: boolean;
}

export default function Usuarios() {
  const {
    filteredData,
    loading,
    filterText,
    setFilterText,
    isNewUserModalOpen,
    setIsNewUserModalOpen,
    isCreating,
    handleCreateUsuario,
    isEditModalOpen,
    selectedUsuarioId,
    isUpdating,
    handleEdit,
    handleCloseEditModal,
    handleUpdateUsuario,
  } = useUsuarios();

  const columns = [
    {
      name: "ID",
      selector: (row: Usuario) => row.id,
      sortable: true,
      width: "80px",
    },
    {
      name: "Nombre",
      selector: (row: Usuario) => row.nombre,
      sortable: true,
    },
    {
      name: "Rol",
      selector: (row: Usuario) => row.rol,
      sortable: true,
      width: "150px",
    },
    {
      name: "Correo",
      selector: (row: Usuario) => row.correo,
    },
    {
      name: "Estado",
      width: "120px",
      sortable: true,
      cell: (row: Usuario) => (
          <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  row.estado
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
              }`}
          >
          {row.estado ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      name: "Acciones",
      width: "120px",
      cell: (row: Usuario) => (
          <div className="flex justify-center">
            <button
                onClick={() => handleEdit(row)}
                className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
            >
              Editar
            </button>
          </div>
      ),
    },
  ];

  return (
      <>
        <LoadingModal isOpen={loading} text="Cargando usuarios..." />

        <NuevoUsuarioModal
            isOpen={isNewUserModalOpen}
            onClose={() => setIsNewUserModalOpen(false)}
            onConfirm={handleCreateUsuario}
            isCreating={isCreating}
        />

        <EditarUsuarioModal
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            onConfirm={handleUpdateUsuario}
            usuarioId={selectedUsuarioId}
            isUpdating={isUpdating}
        />

        <div className="p-6">
          <div className="mb-6">
            <div className="mb-4 flex items-center gap-3">
              <button
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                + Crear Usuario
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Usuarios</h1>
                <p className="text-sm text-gray-500">
                  {filteredData.length} usuarios en total
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <input
                type="text"
                placeholder="Buscar..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-[42px] w-[300px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
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