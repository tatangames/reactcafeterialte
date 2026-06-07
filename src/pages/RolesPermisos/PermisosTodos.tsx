import DataTable, { TableColumn } from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../components/modal/ConfirmDeleteModal";
import NuevoPermisoModal from "../../components/modal/NuevoPermisoModal";
import { usePermisos } from "../../hooks/rolesypermisos/permisosTodosHook.ts";

interface Permiso {
  id: number;
  name: string;
}

export default function PermisosTodos() {
  const {
    filteredData,
    loading,
    filterText,
    setFilterText,
    isDeleteOpen,
    setIsDeleteOpen,
    selectedPermiso,
    isDeleting,
    handleDeleteClick,
    handleConfirmDelete,
    isAddOpen,
    setIsAddOpen,
    isCreating,
    handleCreatePermiso,
  } = usePermisos();

  const columns: TableColumn<Permiso>[] = [
    {
      name: "ID",
      selector: (row) => row.id,
      width: "80px",
      sortable: true,
    },
    {
      name: "Permiso",
      selector: (row) => row.name,
      sortable: true,
    },
    {
      name: "Acciones",
      width: "180px",
      cell: (row) => (
          <button
              onClick={() => handleDeleteClick(row)}
              className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
          >
            Eliminar global
          </button>
      ),
    },
  ];

  return (
      <>
        <LoadingModal isOpen={loading} text="Cargando permisos..." />

        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={() => !isDeleting && setIsDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Eliminar Permiso"
            description="Se eliminará el permiso:"
            itemName={selectedPermiso?.name || ""}
            isDeleting={isDeleting}
        />

        <NuevoPermisoModal
            isOpen={isAddOpen}
            onClose={() => !isCreating && setIsAddOpen(false)}
            onConfirm={handleCreatePermiso}
            isCreating={isCreating}
        />

        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Permisos</h1>
                <p className="text-sm text-gray-500">
                  {filteredData.length} permisos en total
                </p>
              </div>
              <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
              >
                + Agregar Permiso
              </button>
            </div>

            <input
                type="text"
                placeholder="Buscar permiso..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="h-[42px] w-[300px] rounded-lg border border-gray-300 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <DataTable
                columns={columns}
                data={filteredData}
                pagination
                paginationPerPage={10}
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
                }}
            />
          </div>
        </div>
      </>
  );
}