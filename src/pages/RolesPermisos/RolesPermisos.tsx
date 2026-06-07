import DataTable from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../components/modal/ConfirmDeleteModal";
import AgregarPermisoModal from "../../components/modal/AgregarPermisoModal";
import { useRolesPermisos, Permiso } from "../../hooks/rolesypermisos/useRolesPermisosHook";

export default function RolesPermisos() {
    const {
        roleName,
        filteredData,
        loading,
        filterText,
        setFilterText,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        selectedPermiso,
        isDeleting,
        handleDelete,
        handleConfirmDelete,
        isAddModalOpen,
        setIsAddModalOpen,
        isAdding,
        handleConfirmAdd,
        permisosAsignados,
    } = useRolesPermisos();

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
                permisosAsignados={permisosAsignados}
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