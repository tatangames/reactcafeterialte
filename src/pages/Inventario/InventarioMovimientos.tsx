import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { CanAccess } from '../../components/auth/CanAccess';
import { getMovimientos, getStock } from '../../services/inventario';
import { cantidad, dinero, haceDias, hoyLocal, mensajeError, TIPOS_MOVIMIENTO } from '../../utils/formato';
import { InventarioStockInterface, MovimientosResponseInterface } from '../../types/interfaces';

const selectClass = 'h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none';

export default function InventarioMovimientos() {
    const [rango, setRango] = useState({ desde: haceDias(6), hasta: hoyLocal() });
    const [tipo, setTipo] = useState('');
    const [productoId, setProductoId] = useState('');
    const [pagina, setPagina] = useState(1);
    const [productos, setProductos] = useState<InventarioStockInterface[]>([]);
    const [datos, setDatos] = useState<MovimientosResponseInterface | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStock().then(setProductos).catch(() => setProductos([]));
    }, []);

    useEffect(() => {
        if (!rango.desde || !rango.hasta) return;
        setLoading(true);
        getMovimientos({ ...rango, tipo, producto_id: productoId, page: pagina })
            .then(setDatos)
            .catch((error) => toast.error(mensajeError(error, 'Error al cargar movimientos')))
            .finally(() => setLoading(false));
    }, [rango, tipo, productoId, pagina]);

    // Al cambiar un filtro se vuelve a la primera página
    const filtrar = <T,>(setter: (v: T) => void) => (valor: T) => {
        setPagina(1);
        setter(valor);
    };

    return (
        <div className="p-6">
            <PageHeader title="Movimientos de inventario" subtitle="Historial de entradas, salidas y ajustes" backTo="/admin/inventario" />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={filtrar(setRango)} />
                <select value={tipo} onChange={e => filtrar(setTipo)(e.target.value)} className={selectClass}>
                    <option value="">Todos los tipos</option>
                    {Object.entries(TIPOS_MOVIMIENTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
                <select value={productoId} onChange={e => filtrar(setProductoId)(e.target.value)} className={`${selectClass} max-w-[240px]`}>
                    <option value="">Todos los productos</option>
                    {productos.map(p => <option key={p.producto_id} value={p.producto_id}>{p.producto}</option>)}
                </select>
            </div>

            <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Fecha</th>
                            <th className="px-4 py-3 text-left">Producto</th>
                            <th className="px-4 py-3 text-left">Movimiento</th>
                            <th className="px-4 py-3 text-left">Documento / motivo</th>
                            <th className="px-4 py-3 text-right">Cantidad</th>
                            <th className="px-4 py-3 text-right">Saldo</th>
                            <th className="px-4 py-3 text-right">Costo</th>
                            <th className="px-4 py-3 text-left">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {datos && datos.movimientos.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin movimientos con esos filtros</td></tr>
                        )}
                        {datos?.movimientos.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{m.fecha}</td>
                                <td className="px-4 py-2">
                                    <CanAccess permission="inventario.kardex" fallback={<span>{m.producto}</span>}>
                                        <Link to={`/admin/inventario/kardex/${m.producto_id}`} className="text-blue-600 hover:underline">{m.producto}</Link>
                                    </CanAccess>
                                </td>
                                <td className="px-4 py-2"><StatusBadge tone={m.salida ? 'danger' : m.entrada ? 'success' : 'neutral'}>{m.tipo_texto}</StatusBadge></td>
                                <td className="px-4 py-2 text-gray-600">
                                    {m.referencia && <div>{m.referencia}</div>}
                                    {m.motivo && <div className="text-xs text-gray-400">{m.motivo}</div>}
                                </td>
                                <td className={`px-4 py-2 text-right font-medium ${m.salida ? 'text-red-600' : 'text-green-700'}`}>
                                    {m.salida ? `-${cantidad(m.salida)}` : m.entrada ? `+${cantidad(m.entrada)}` : '0'}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-800">{cantidad(m.saldo)}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{dinero(m.costo_total)}</td>
                                <td className="px-4 py-2 text-gray-600">{m.usuario ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && (
                    <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />
                )}
            </div>
        </div>
    );
}
