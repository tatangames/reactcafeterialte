import DataTable from "react-data-table-component";

import LoadingModal from "../../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../../components/modal/ConfirmDeleteModal";
import UnidadMedidaModal from "../../../components/modal/UnidadMedidaModal";
import { useUnidadMedida } from "../../../hooks/configuracion/useUnidadMedidaHook.ts";
import { UnidadMedidaInterface } from "../../../types/interfaces.ts";

export default function UnidadMedidaConfig() {
    const {
        filteredData,
        loading,
        filterText,
        setFilterText,
        isCreateModalOpen,
        setIsCreateModalOpen,
        isEditModalOpen,
        setIsEditModalOpen,
        selectedUnidad,
        setSelectedUnidad,
        isCreating,
        isUpdating,
        handleCreate,
        handleUpdate,
        handleEdit,
        borrando,
        setBorrando,
        isDeleting,
        handleDelete,
    } = useUnidadMedida();

    const columns = [
        {
            name: "ID",
            selector: (row: UnidadMedidaInterface) => row.id,
            sortable: true,
            width: "80px",
        },
        {
            name: "Nombre",
            selector: (row: UnidadMedidaInterface) => row.nombre,
            sortable: true,
        },
        {
            name: "Abrev.",
            width: "100px",
            selector: (row: UnidadMedidaInterface) => row.abreviatura ?? "—",
        },
        {
            name: "Tipo",
            width: "120px",
            sortable: true,
            selector: (row: UnidadMedidaInterface) => ({ unidad: "Por unidad", masa: "Peso", volumen: "Volumen" })[row.tipo],
        },
        {
            name: "Equivalencia",
            width: "200px",
            cell: (row: UnidadMedidaInterface) => (
                <span className="text-sm text-gray-600">
                    1 {row.abreviatura ?? row.nombre} = {Number(row.factor_base).toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
                    {({ unidad: "u", masa: "g", volumen: "ml" })[row.tipo]}
                </span>
            ),
        },
        {
            name: "Estado",
            width: "120px",
            sortable: true,
            cell: (row: UnidadMedidaInterface) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    row.estado ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                    {row.estado ? "Activo" : "Inactivo"}
                </span>
            ),
        },
        {
            name: "Acciones",
            width: "200px",
            cell: (row: UnidadMedidaInterface) => (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                    >
                        Editar
                    </button>
                    {/* Solo si nada la usa (productos, recetas, compras, extras); si no, se desactiva */}
                    {!row.usada && (
                        <button
                            onClick={() => setBorrando(row)}
                            className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                        >
                            Borrar
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando unidades de medida..." />

            <UnidadMedidaModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onConfirm={handleCreate}
                isLoading={isCreating}
            />

            {selectedUnidad && (
                <UnidadMedidaModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedUnidad(null);
                    }}
                    onConfirm={(data) => handleUpdate(selectedUnidad.id, data)}
                    isLoading={isUpdating}
                    unidad={selectedUnidad}
                />
            )}

            <ConfirmDeleteModal
                isOpen={!!borrando}
                onClose={() => setBorrando(null)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
                title="Borrar unidad de medida"
                description="Nada la usa. Se borra definitivamente."
                itemName={borrando?.nombre ?? ""}
            />

            <div className="p-6">
                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                        >
                            + Crear Unidad de Medida
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Unidades de Medida</h1>
                            <p className="text-sm text-gray-500">{filteredData.length} unidades en total</p>
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