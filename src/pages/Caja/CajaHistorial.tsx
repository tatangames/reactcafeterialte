import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { useCaja } from '../../context/CajaContext';
import { getHistorialTurnos } from '../../services/caja';
import { HistorialTurnosResponseInterface } from '../../types/caja';
import { dinero, haceDias, hoyLocal, mensajeError } from '../../utils/formato';

const selectClass = 'h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-blue-400 focus:outline-none';

export default function CajaHistorial() {
    const { catalogos } = useCaja();
    const [rango, setRango] = useState({ desde: haceDias(29), hasta: hoyLocal() });
    const [cajaId, setCajaId] = useState('');
    const [estado, setEstado] = useState('');
    const [usuarioId, setUsuarioId] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<HistorialTurnosResponseInterface | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!rango.desde || !rango.hasta) return;
        setLoading(true);
        getHistorialTurnos({ ...rango, caja_id: cajaId, usuario_id: usuarioId, estado, page: pagina })
            .then(setDatos)
            .catch(error => toast.error(mensajeError(error, 'Error al cargar el historial')))
            .finally(() => setLoading(false));
    }, [rango, cajaId, usuarioId, estado, pagina]);

    const filtrar = <T,>(setter: (v: T) => void) => (valor: T) => {
        setPagina(1);
        setter(valor);
    };

    return (
        <div className="p-6">
            <PageHeader title="Historial de cierres" subtitle="Turnos de caja con sus totales y diferencias" />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={filtrar(setRango)} />
                {catalogos && catalogos.cajas.length > 1 && (
                    <select value={cajaId} onChange={e => filtrar(setCajaId)(e.target.value)} className={selectClass}>
                        <option value="">Todas las cajas</option>
                        {catalogos.cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                )}
                <select value={usuarioId} onChange={e => filtrar(setUsuarioId)(e.target.value)} className={selectClass} aria-label="Cajero">
                    <option value="">Todos los cajeros</option>
                    {datos?.usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <select value={estado} onChange={e => filtrar(setEstado)(e.target.value)} className={selectClass}>
                    <option value="">Abiertos y cerrados</option>
                    <option value="cerrado">Cerrados</option>
                    <option value="abierto">Abiertos</option>
                </select>
            </div>

            {datos && (
                <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Turnos cerrados</p><p className="text-2xl font-semibold">{datos.totales.turnos}</p></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Ventas</p><p className="text-2xl font-semibold text-blue-700">{dinero(datos.totales.ventas)}</p></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Faltantes</p><p className="text-2xl font-semibold text-red-600">{dinero(Math.abs(datos.totales.faltantes))}</p></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Sobrantes</p><p className="text-2xl font-semibold text-amber-600">{dinero(datos.totales.sobrantes)}</p></div>
                </div>
            )}

            <div className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Turno</th>
                            <th className="px-4 py-3 text-left">Abrió</th>
                            <th className="px-4 py-3 text-left">Cerró</th>
                            <th className="px-4 py-3 text-right">Ventas</th>
                            <th className="px-4 py-3 text-right">Esperado</th>
                            <th className="px-4 py-3 text-right">Contado</th>
                            <th className="px-4 py-3 text-right">Diferencia</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {datos?.turnos.length === 0 && (
                            <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">No hay turnos en el período</td></tr>
                        )}
                        {datos?.turnos.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-800">#{t.id} · {t.caja}</div>
                                    {t.estado === 'abierto' && <StatusBadge tone="success">Abierto</StatusBadge>}
                                </td>
                                <td className="px-4 py-3"><div className="font-medium text-gray-800">{t.usuario_apertura}</div><div className="text-xs text-gray-500">{t.abierto_at}</div></td>
                                <td className="px-4 py-3">
                                    {t.cerrado_at
                                        ? <><div className="font-medium text-gray-800">{t.usuario_cierre}</div><div className="text-xs text-gray-500">{t.cerrado_at}</div></>
                                        : <span className="text-gray-400">En curso</span>}
                                </td>
                                <td className="px-4 py-3 text-right">{t.estado === 'cerrado' ? dinero(t.total_ventas) : '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{t.efectivo_esperado !== null ? dinero(t.efectivo_esperado) : '—'}</td>
                                <td className="px-4 py-3 text-right text-gray-600">{t.efectivo_contado !== null ? dinero(t.efectivo_contado) : '—'}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${t.diferencia === null || t.diferencia === 0 ? 'text-gray-500' : t.diferencia < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                    {t.diferencia === null ? '—' : t.diferencia === 0 ? 'Cuadra' : `${t.diferencia < 0 ? '−' : '+'}${dinero(Math.abs(t.diferencia))}`}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Link to={`/caja/turnos/${t.id}`} className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md">Ver</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
