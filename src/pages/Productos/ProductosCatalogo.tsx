import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";

import LoadingModal from "../../components/Loading/LoadingModal";
import ConfirmDeleteModal from "../../components/modal/ConfirmDeleteModal";
import { useProductosCatalogoHook } from "../../hooks/productos/useProductoCatalogoHook";
import { ProductoInterface } from "../../types/interfaces";
import { STORAGE_URL } from "../../services/api";
import { CLASES_PRODUCTO, cantidad, dinero } from "../../utils/formato";
import { CanAccess } from "../../components/auth/CanAccess";

// Catálogo de productos. Los modificadores de cada producto se arman dentro del producto (crear o editar)
export default function ProductosCatalogo() {
    return (
        <div className="p-6">
            <ListaProductos />
        </div>
    );
}

function ListaProductos() {
    const navigate = useNavigate();
    const {
        filteredData,
        loading,
        filterText,
        setFilterText,
        claseFiltro,
        setClaseFiltro,
        borrando,
        setBorrando,
        isDeleting,
        handleDelete,
    } = useProductosCatalogoHook();

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
            name: "Clase",
            width: "150px",
            sortable: true,
            selector: (row: ProductoInterface) => row.clase,
            cell: (row: ProductoInterface) => (
                <div className="text-sm text-gray-700">
                    {CLASES_PRODUCTO[row.clase]}
                    {!row.se_vende && <div className="text-xs text-gray-400">No se vende</div>}
                </div>
            ),
        },
        {
            name: "Costo",
            width: "110px",
            sortable: true,
            right: true,
            selector: (row: ProductoInterface) => Number(row.costo_unitario),
            cell: (row: ProductoInterface) => (
                <span className="text-sm text-gray-600">{dinero(row.costo_unitario, "$", Number(row.costo_unitario) < 1 ? 4 : 2)}</span>
            ),
        },
        {
            name: "Precio",
            width: "100px",
            sortable: true,
            right: true,
            selector: (row: ProductoInterface) => Number(row.precio_venta),
            cell: (row: ProductoInterface) => (
                <span className="text-sm font-medium text-gray-800">{row.se_vende ? dinero(row.precio_venta) : "—"}</span>
            ),
        },
        {
            name: "Existencia",
            width: "120px",
            sortable: true,
            right: true,
            selector: (row: ProductoInterface) => row.stock_actual ?? -Infinity,
            cell: (row: ProductoInterface) => (
                <span className={`text-sm ${row.stock_actual !== null && row.stock_actual < 0 ? "text-red-600 font-semibold" : "text-gray-800"}`}>
                    {row.controla_stock ? cantidad(row.stock_actual, row.unidad_abrev) : "No lleva"}
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
            width: "170px",
            cell: (row: ProductoInterface) => (
                <div className="flex justify-center gap-2">
                    <CanAccess permission="productos.gestionar">
                        <button
                            onClick={() => navigate(`/admin/productos/editar/${row.id}`)}
                            className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                        >
                            Editar
                        </button>
                        {/* Solo lo que nunca se usó (ventas, compras, recetas, producción...); lo demás se desactiva */}
                        {row.usado === false && (
                            <button
                                onClick={() => setBorrando(row)}
                                className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                            >
                                Borrar
                            </button>
                        )}
                    </CanAccess>
                </div>
            ),
        },
    ];

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando productos..." />

            <div>
                <div className="mb-6">
                    <div className="mb-4 flex items-center gap-3">
                        <CanAccess permission="productos.gestionar">
                            <button
                                onClick={() => navigate("/admin/productos/registro")}
                                className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                            >
                                + Crear Producto
                            </button>
                        </CanAccess>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Productos</h1>
                            <p className="text-sm text-gray-500">{filteredData.length} productos en total</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 mb-4">
                    <select
                        value={claseFiltro}
                        onChange={(e) => setClaseFiltro(e.target.value)}
                        className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none"
                    >
                        <option value="">Todas las clases</option>
                        {Object.entries(CLASES_PRODUCTO).map(([valor, texto]) => (
                            <option key={valor} value={valor}>{texto}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o código..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="h-[42px] w-full sm:w-[300px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
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

            <ConfirmDeleteModal
                isOpen={!!borrando}
                onClose={() => setBorrando(null)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
                title="Borrar producto"
                description="Nunca se ha vendido, comprado, producido ni usado en una receta. Se borra definitivamente."
                itemName={borrando?.nombre ?? ""}
            />
        </>
    );
}