import { useEffect, useState } from 'react';
import DataTable from 'react-data-table-component';
import { Link, useNavigate } from 'react-router-dom';

import LoadingModal from '../../components/Loading/LoadingModal';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import MoneyInput from '../../components/form/MoneyInput';
import { CanAccess } from '../../components/auth/CanAccess';
import { useInventarioStockHook } from '../../hooks/inventario/useInventarioStockHook';
import { InventarioStockInterface } from '../../types/interfaces';
import { STORAGE_URL } from '../../services/api';
import { CLASES_PRODUCTO, cantidad, dinero } from '../../utils/formato';

const selectClass = 'h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none';

function StockMinimoModal({ producto, onClose, onSave, isSaving }: {
    producto: InventarioStockInterface;
    onClose: () => void;
    onSave: (valor: number) => void;
    isSaving: boolean;
}) {
    const [valor, setValor] = useState(String(producto.stock_minimo || ''));
    useEffect(() => setValor(String(producto.stock_minimo || '')), [producto]);

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Stock mínimo</h2>
                    <p className="text-sm text-gray-500">{producto.producto} · existencia {cantidad(producto.stock_actual, producto.unidad)}</p>
                </div>
                <MoneyInput value={valor} onChange={setValor} suffix={producto.unidad ?? undefined}
                    decimals={producto.permite_fraccion ? 4 : 0} placeholder="0" />
                <p className="text-xs text-gray-500">Al llegar a esta cantidad se muestra una alerta. 0 = sin alerta.</p>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={isSaving}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={() => onSave(Number(valor || 0))} disabled={isSaving}
                        className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function InventarioStock() {
    const navigate = useNavigate();
    const {
        filteredData, categorias, loading, filterText, setFilterText,
        filtros, setFiltro, resumen, editando, setEditando, isSavingMinimo, guardarMinimo,
    } = useInventarioStockHook();

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
            name: 'Producto',
            selector: (row: InventarioStockInterface) => row.producto,
            sortable: true,
            wrap: true,
            minWidth: '200px',
            cell: (row: InventarioStockInterface) => (
                <div className="py-2">
                    <div className="font-medium text-gray-800">{row.producto}</div>
                    <div className="text-xs text-gray-500">{CLASES_PRODUCTO[row.clase]}{row.sku ? ` · ${row.sku}` : ''}</div>
                </div>
            ),
        },
        {
            name: 'Existencia',
            width: '150px',
            sortable: true,
            right: true,
            selector: (row: InventarioStockInterface) => row.stock_actual,
            cell: (row: InventarioStockInterface) => (
                <div className="text-right">
                    <div className={`font-semibold ${row.stock_actual < 0 ? 'text-red-600' : row.bajo_minimo ? 'text-amber-600' : 'text-gray-800'}`}>
                        {cantidad(row.stock_actual, row.unidad)}
                    </div>
                    {row.bajo_minimo && (
                        <StatusBadge tone={row.stock_actual < 0 ? 'danger' : 'warning'}>
                            {row.stock_actual < 0 ? 'Negativo' : 'Bajo mínimo'}
                        </StatusBadge>
                    )}
                </div>
            ),
        },
        {
            name: 'Mínimo',
            width: '120px',
            sortable: true,
            right: true,
            selector: (row: InventarioStockInterface) => row.stock_minimo,
            cell: (row: InventarioStockInterface) => (
                <CanAccess permissions={['inventario.ajustar', 'productos.gestionar']}
                    fallback={<span className="text-gray-500">{cantidad(row.stock_minimo)}</span>}>
                    <button type="button" onClick={() => setEditando(row)}
                        className="text-gray-600 underline decoration-dotted underline-offset-4 hover:text-blue-600"
                        title="Cambiar stock mínimo">
                        {cantidad(row.stock_minimo)}
                    </button>
                </CanAccess>
            ),
        },
        {
            name: 'Costo prom.',
            width: '120px',
            sortable: true,
            right: true,
            selector: (row: InventarioStockInterface) => row.costo_unitario,
            cell: (row: InventarioStockInterface) => (
                <span className="text-gray-600">{dinero(row.costo_unitario, '$', row.costo_unitario < 1 ? 4 : 2)}</span>
            ),
        },
        {
            name: 'Valor',
            width: '120px',
            sortable: true,
            right: true,
            selector: (row: InventarioStockInterface) => row.valor_inventario,
            cell: (row: InventarioStockInterface) => <span className="text-gray-800">{dinero(row.valor_inventario)}</span>,
        },
        {
            name: '',
            width: '100px',
            cell: (row: InventarioStockInterface) => (
                <CanAccess permission="inventario.kardex">
                    <Link to={`/admin/inventario/kardex/${row.producto_id}`}
                        className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition">
                        Kardex
                    </Link>
                </CanAccess>
            ),
        },
    ];

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando stock..." />

            {editando && (
                <StockMinimoModal producto={editando} onClose={() => setEditando(null)}
                    onSave={guardarMinimo} isSaving={isSavingMinimo} />
            )}

            <div className="p-6">
                <PageHeader
                    title="Inventario"
                    subtitle="Existencias, costo y valor de cada producto"
                    actions={
                        <>
                            <CanAccess permissions={['inventario.registrar', 'inventario.ajustar']}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/inventario/entradas/nuevo')}
                                    className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition"
                                >
                                    + Nuevo registro
                                </button>
                            </CanAccess>
                            <CanAccess permission="inventario.ajustar">
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/inventario/conteo')}
                                    className="px-4 py-2.5 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition"
                                >
                                    Conteo físico
                                </button>
                            </CanAccess>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/inventario/movimientos')}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Movimientos
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/inventario/entradas')}
                                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Registros
                            </button>
                        </>
                    }
                />

                {/* Resumen */}
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs text-gray-500">Productos</p>
                        <p className="text-2xl font-semibold text-gray-800">{resumen.productos}</p>
                    </div>
                    <button type="button" onClick={() => setFiltro('estado', filtros.estado === 'alerta' ? '' : 'alerta')}
                        className={`rounded-xl border p-4 text-left transition ${filtros.estado === 'alerta' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">En alerta {filtros.estado === 'alerta' ? '(filtrando)' : ''}</p>
                        <p className={`text-2xl font-semibold ${resumen.enAlerta > 0 ? 'text-amber-600' : 'text-gray-800'}`}>{resumen.enAlerta}</p>
                    </button>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <p className="text-xs text-gray-500">Valor del inventario (al costo)</p>
                        <p className="text-2xl font-semibold text-gray-800">{dinero(resumen.valorTotal)}</p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap justify-end gap-3 mb-4">
                    <select value={filtros.clase} onChange={e => setFiltro('clase', e.target.value)} className={selectClass}>
                        <option value="">Todas las clases</option>
                        {Object.entries(CLASES_PRODUCTO).map(([valor, texto]) => (
                            <option key={valor} value={valor}>{texto}</option>
                        ))}
                    </select>
                    <select value={filtros.categoria_id} onChange={e => setFiltro('categoria_id', e.target.value)} className={selectClass}>
                        <option value="">Todas las categorías</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <select value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)} className={selectClass}>
                        <option value="">Todas las existencias</option>
                        <option value="alerta">En alerta</option>
                        <option value="sin_stock">Sin existencia</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o código..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        className="h-[42px] w-full sm:w-[280px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                    />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        pagination
                        paginationPerPage={25}
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
