import DataTable from 'react-data-table-component';
import { useNavigate } from 'react-router-dom';

import LoadingModal from '../../components/Loading/LoadingModal';
import { useInventarioStockHook } from '../../hooks/inventario/useInventarioStockHook';
import { InventarioStockInterface } from '../../types/interfaces';
import { STORAGE_URL } from '../../services/api';

export default function InventarioStock() {
    const navigate = useNavigate();
    const { filteredData, loading, filterText, setFilterText } = useInventarioStockHook();

    const columns = [
        {
            name: 'Imagen',
            width: '70px',
            cell: (row: InventarioStockInterface) => (
                <div className="py-2">
                    {row.imagen ? (
                        <img
                            src={STORAGE_URL + row.imagen}
                            alt={row.producto}
                            className="h-9 w-9 rounded-md object-cover border border-gray-200"
                        />
                    ) : (
                        <div className="h-9 w-9 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-400">—</div>
                    )}
                </div>
            ),
        },
        {
            name: 'SKU',
            selector: (row: InventarioStockInterface) => row.sku ?? '—',
            sortable: true,
            width: '120px',
        },
        {
            name: 'Producto',
            selector: (row: InventarioStockInterface) => row.producto,
            sortable: true,
            wrap: true,
        },
        {
            name: 'Stock actual',
            width: '140px',
            sortable: true,
            selector: (row: InventarioStockInterface) => row.stock_actual,
            cell: (row: InventarioStockInterface) => (
                <span className={`font-semibold ${row.bajo_minimo ? 'text-red-600' : 'text-gray-800'}`}>
                    {Number(row.stock_actual).toFixed(2)}
                    {row.bajo_minimo && <span className="ml-1 text-xs font-normal text-red-400">↓ mín</span>}
                </span>
            ),
        },
        {
            name: 'Stock mínimo',
            width: '130px',
            sortable: true,
            selector: (row: InventarioStockInterface) => row.stock_minimo,
            cell: (row: InventarioStockInterface) => (
                <span className="text-gray-500">{Number(row.stock_minimo).toFixed(2)}</span>
            ),
        },
    ];

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando stock..." />

            <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/inventario/entradas/nuevo')}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                    >
                        + Nuevo registro
                    </button>
                    <button
                        onClick={() => navigate('/admin/inventario/entradas')}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        Ver historial
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Inventario</h1>
                        <p className="text-sm text-gray-500">{filteredData.length} productos</p>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
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
                        noDataComponent={<div className="py-6 text-sm text-gray-500">No hay productos</div>}
                        paginationComponentOptions={{
                            rowsPerPageText: 'Filas por página',
                            rangeSeparatorText: 'de',
                            selectAllRowsItem: true,
                            selectAllRowsItemText: 'Todos',
                        }}
                    />
                </div>
            </div>
        </>
    );
}