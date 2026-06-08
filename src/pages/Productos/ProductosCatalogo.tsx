import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import { useProductosCatalogoHook } from "../../hooks/productos/useProductoCatalogoHook";
import { ProductoInterface } from "../../types/interfaces";
import { STORAGE_URL } from "../../services/api";

export default function ProductosCatalogo() {
    const navigate = useNavigate();
    const {
        filteredData,
        loading,
        filterText,
        setFilterText,
    } = useProductosCatalogoHook();

    const tipoLabel: Record<ProductoInterface["tipo"], string> = {
        bien: "Bien",
        servicio: "Servicio",
        bien_servicio: "Bien y Servicio",
    };

    const columns = [
        {
            name: "Imagen",
            width: "80px",
            cell: (row: ProductoInterface) => (
                <div className="py-2">
                    {row.imagen ? (
                        <img
                            src={STORAGE_URL + row.imagen}
                            alt={row.nombre}
                            className="h-10 w-10 rounded-md object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">
                            —
                        </div>
                    )}
                </div>
            ),
        },
        {
            name: "SKU",
            selector: (row: ProductoInterface) => row.sku ?? "—",
            sortable: true,
            width: "140px",
        },
        {
            name: "Nombre",
            selector: (row: ProductoInterface) => row.nombre,
            sortable: true,
            wrap: true,
        },
        {
            name: "Tipo",
            width: "140px",
            sortable: true,
            cell: (row: ProductoInterface) => (
                <span className="text-sm text-gray-700">{tipoLabel[row.tipo]}</span>
            ),
        },
        {
            name: "Costo",
            width: "120px",
            sortable: true,
            selector: (row: ProductoInterface) => row.costo_unitario,
            cell: (row: ProductoInterface) => (
                <span className="text-sm text-gray-800">
                    ${Number(row.costo_unitario).toFixed(2)}
                </span>
            ),
        },
        {
            name: "Estado",
            width: "120px",
            sortable: true,
            cell: (row: ProductoInterface) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    row.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                    {row.activo ? "Activo" : "Inactivo"}
                </span>
            ),
        },
        {
            name: "Acciones",
            width: "120px",
            cell: (row: ProductoInterface) => (
                <div className="flex justify-center">
                    <button
                        onClick={() => navigate(`/admin/productos/editar/${row.id}`)}
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
            <LoadingModal isOpen={loading} text="Cargando productos..." />

            <div className="p-6">
                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <button
                            onClick={() => navigate("/admin/productos/registro")}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                        >
                            + Crear Producto
                        </button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Productos</h1>
                            <p className="text-sm text-gray-500">{filteredData.length} productos en total</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
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