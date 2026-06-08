import DataTable from 'react-data-table-component';
import { useNavigate } from 'react-router-dom';

import LoadingModal from '../../components/Loading/LoadingModal';
import { useEntradasHook } from '../../hooks/inventario/useEntradasHook';
import { EntradaInventarioInterface } from '../../types/interfaces';

const tipoConfig = {
    entrada:    { label: 'Entrada',    color: 'bg-green-100 text-green-700' },
    salida:     { label: 'Salida',     color: 'bg-red-100 text-red-700' },
    ajuste:     { label: 'Ajuste',     color: 'bg-yellow-100 text-yellow-700' },
    produccion: { label: 'Producción', color: 'bg-blue-100 text-blue-700' },
    venta:      { label: 'Venta',      color: 'bg-purple-100 text-purple-700' },
};

export default function InventarioEntradas() {
    const navigate = useNavigate();
    const {
        filteredData,
        loading,
        filterText,
        setFilterText,
        selectedEntrada,
        isDetailOpen,
        verDetalle,
        cerrarDetalle,
    } = useEntradasHook();

    const columns = [
        {
            name: 'ID',
            selector: (row: EntradaInventarioInterface) => row.id,
            sortable: true,
            width: '70px',
        },
        {
            name: 'Fecha',
            selector: (row: EntradaInventarioInterface) => row.fecha,
            sortable: true,
            width: '120px',
        },
        {
            name: 'Tipo',
            width: '130px',
            cell: (row: EntradaInventarioInterface) => (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tipoConfig[row.tipo].color}`}>
                    {tipoConfig[row.tipo].label}
                </span>
            ),
        },
        {
            name: 'Descripción',
            selector: (row: EntradaInventarioInterface) => row.descripcion ?? '—',
            wrap: true,
        },
        {
            name: 'Productos',
            width: '100px',
            cell: (row: EntradaInventarioInterface) => (
                <span className="text-sm text-gray-600">{row.total_items} ítem(s)</span>
            ),
        },
        {
            name: 'Usuario',
            width: '140px',
            selector: (row: EntradaInventarioInterface) => row.usuario ?? '—',
        },
        {
            name: 'Detalle',
            width: '100px',
            cell: (row: EntradaInventarioInterface) => (
                <button
                    onClick={() => verDetalle(row)}
                    className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                >
                    Ver
                </button>
            ),
        },
    ];

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando registros..." />

            {/* Modal detalle */}
            {isDetailOpen && selectedEntrada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">
                                Detalle del registro #{selectedEntrada.id}
                            </h2>
                            <button onClick={cerrarDetalle} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium text-gray-700">Fecha:</span> {selectedEntrada.fecha}</p>
                            <p><span className="font-medium text-gray-700">Tipo:</span>{' '}
                                <span className={`px-2 py-0.5 text-xs rounded-full ${tipoConfig[selectedEntrada.tipo].color}`}>
                                    {tipoConfig[selectedEntrada.tipo].label}
                                </span>
                            </p>
                            {selectedEntrada.descripcion && (
                                <p><span className="font-medium text-gray-700">Descripción:</span> {selectedEntrada.descripcion}</p>
                            )}
                            {selectedEntrada.usuario && (
                                <p><span className="font-medium text-gray-700">Usuario:</span> {selectedEntrada.usuario}</p>
                            )}
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Desglose de productos</h3>
                            <div className="space-y-2">
                                {selectedEntrada.detalles.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-800">{d.producto}</p>
                                            {d.sku && <p className="text-xs text-gray-400">{d.sku}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-800">+{Number(d.cantidad).toFixed(2)}</p>
                                            <p className="text-xs text-gray-400">
                                                {Number(d.stock_anterior).toFixed(2)} → {Number(d.stock_resultante).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={cerrarDetalle}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/inventario/entradas/nuevo')}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                    >
                        + Nuevo registro
                    </button>
                    <button
                        onClick={() => navigate('/admin/inventario')}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        ← Ver stock
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Historial de movimientos</h1>
                        <p className="text-sm text-gray-500">{filteredData.length} registros</p>
                    </div>
                </div>

                <div className="flex justify-end mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por descripción o fecha..."
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
                        noDataComponent={<div className="py-6 text-sm text-gray-500">No hay registros</div>}
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