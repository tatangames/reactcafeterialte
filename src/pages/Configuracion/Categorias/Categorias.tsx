import DataTable from "react-data-table-component";

import LoadingModal from "../../../components/Loading/LoadingModal";
import EntidadNombreModal from "../../../components/modal/EntidadNombreModal";
import EntidadNombreEstadoModal from "../../../components/modal/EntidadNombreEstadoModal";
import { useCategorias } from "../../../hooks/configuracion/useCategoriasHook";
import { CategoriasInterface } from "../../../types/interfaces";

export default function CategoriasConfig() {
    const {
        filteredData,
        loading,
        filterText,
        setFilterText,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        selectedCategoria,
        setSelectedCategoria,
        isCreating,
        isUpdating,
        handleCreate,
        handleUpdate,
        handleEdit,
    } = useCategorias();

    const columns = [
        {
            name: "ID",
            selector: (row: CategoriasInterface) => row.id,
            sortable: true,
            width: "80px",
        },
        {
            name: "Nombre",
            selector: (row: CategoriasInterface) => row.nombre,
            sortable: true,
        },
        {
            name: "Estado",
            width: "120px",
            sortable: true,
            cell: (row: CategoriasInterface) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    row.estado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                    {row.estado ? "Activo" : "Inactivo"}
                </span>
            ),
        },
        {
            name: "Acciones",
            width: "120px",
            cell: (row: CategoriasInterface) => (
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
            <LoadingModal isOpen={loading} text="Cargando categorías..." />

            <EntidadNombreModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onConfirm={handleCreate}
                isLoading={isCreating}
                title="Nueva Categoría"
                placeholder="Nombre de la categoría"
                maxLength={100}
            />

            {selectedCategoria && (
                <EntidadNombreEstadoModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedCategoria(null);
                    }}
                    onConfirm={(data) => handleUpdate(selectedCategoria.id, data)}
                    isLoading={isUpdating}
                    title="Editar Categoría"
                    initialNombre={selectedCategoria.nombre}
                    initialEstado={selectedCategoria.estado}
                    maxLength={100}
                />
            )}

            <div className="p-6">
                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                        >
                            + Crear Categoría
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Categorías</h1>
                            <p className="text-sm text-gray-500">{filteredData.length} categorías en total</p>
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