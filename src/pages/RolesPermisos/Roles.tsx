import DataTable from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../components/modal/ConfirmDeleteModal";
import NuevoRolModal from "../../components/modal/NuevoRolModal";
import { useRoles } from "../../hooks/rolesypermisos/useRolesHook";

interface Role {
  id: number;
  name: string;
}

export default function Roles() {
  const {
    filteredData,
    loading,
    filterText,
    setFilterText,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedRole,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    isNewRolModalOpen,
    setIsNewRolModalOpen,
    isCreating,
    handleCreateRol,
    navigate,
    handleEdit,
  } = useRoles();

  const columns = [
    {
      name: "ID",
      selector: (row: Role) => row.id,
      sortable: true,
      width: "80px",
    },
    {
      name: "Rol",
      selector: (row: Role) => row.name,
      sortable: true,
    },
    {
      name: "Acciones",
      width: "260px",
      cell: (row: Role) => (
          <div className="flex justify-center gap-2">
            <button
                onClick={() => handleEdit(row)}
                className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
            >
              Editar
            </button>
            <button
                onClick={() => handleDeleteClick(row)}
                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
            >
              Eliminación Global
            </button>
          </div>
      ),
    },
  ];

  return (
      <>
        <LoadingModal isOpen={loading} text="Cargando roles..." />

        <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Eliminar ROL"
            description="Se eliminará el rol:"
            itemName={selectedRole?.name || ""}
            isDeleting={isDeleting}
        />

        <NuevoRolModal
            isOpen={isNewRolModalOpen}
            onClose={() => !isCreating && setIsNewRolModalOpen(false)}
            onConfirm={handleCreateRol}
            isCreating={isCreating}
        />

        <div className="p-6">
          <div className="mb-6">
            <div className="mb-4 flex flex-wrap gap-3">
              <button
                  onClick={() => setIsNewRolModalOpen(true)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
              >
                + Nuevo Rol
              </button>
              <button
                  onClick={() => navigate("/admin/permisos-todos")}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-2"
              >
                Listado de Permisos
              </button>
            </div>

            <h1 className="text-2xl font-semibold text-gray-800">Roles</h1>
            <p className="text-sm text-gray-500">
              {filteredData.length} roles en total
            </p>
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
                paginationComponentOptions={{
                    rowsPerPageText: "Filas por página",
                    rangeSeparatorText: "de",
                    selectAllRowsItem: true,
                    selectAllRowsItemText: "Todos",
                }}
            />
          </div>
        </div>
      </>
  );
}