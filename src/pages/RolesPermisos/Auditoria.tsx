import { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import { inputClass } from '../../components/form/FormField';
import { getAuditoria, getFiltrosAuditoria, RegistroAuditoriaInterface } from '../../services/seguridad';
import { haceDias, hoyLocal, mensajeError, fechaHora } from '../../utils/formato';
import { PaginaInterface } from '../../types/interfaces';
import { FilaCargando } from '../../components/ui/loading/Cargando';

const valorTexto = (v: unknown): string => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'boolean') return v ? 'Sí' : 'No';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
};

// Antes y después lado a lado; las claves que cambiaron se resaltan
function Cambios({ antes, despues }: { antes: Record<string, unknown> | null; despues: Record<string, unknown> | null }) {
    const claves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})])];
    if (claves.length === 0) return <p className="text-sm text-gray-500">Sin datos de detalle</p>;
    return (
        <table className="w-full text-xs">
            <thead className="text-left text-gray-500"><tr><th className="py-1 pr-3">Dato</th>{antes && <th className="py-1 pr-3">Antes</th>}{despues && <th className="py-1">Después</th>}</tr></thead>
            <tbody className="divide-y divide-gray-100 align-top">
                {claves.map(c => {
                    const a = antes?.[c];
                    const d = despues?.[c];
                    const cambio = antes && despues && JSON.stringify(a) !== JSON.stringify(d);
                    return (
                        <tr key={c} className={cambio ? 'bg-amber-50' : ''}>
                            <td className="py-1 pr-3 font-medium text-gray-700">{c}</td>
                            {antes && <td className="py-1 pr-3 break-all text-gray-600">{valorTexto(a)}</td>}
                            {despues && <td className="py-1 break-all text-gray-900">{valorTexto(d)}</td>}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default function Auditoria() {
    const [rango, setRango] = useState({ desde: haceDias(6), hasta: hoyLocal() });
    const [usuarioId, setUsuarioId] = useState('');
    const [modulo, setModulo] = useState('');
    const [accion, setAccion] = useState('');
    const [buscar, setBuscar] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<(PaginaInterface & { registros: RegistroAuditoriaInterface[] }) | null>(null);
    const [filtros, setFiltros] = useState<{ modulos: string[]; acciones: string[]; usuarios: { id: number; nombre: string }[] } | null>(null);
    const [abierto, setAbierto] = useState<number | null>(null);

    useEffect(() => { getFiltrosAuditoria().then(setFiltros).catch(() => null); }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            getAuditoria({ ...rango, usuario_id: usuarioId, modulo, accion, buscar, page: pagina })
                .then(setDatos).catch(e => toast.error(mensajeError(e, 'Error al cargar la auditoría')));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [rango, usuarioId, modulo, accion, buscar, pagina]);

    const cambiar = (fn: () => void) => { fn(); setPagina(1); };

    return (
        <div className="p-6">
            <PageHeader title="Auditoría" subtitle="Quién hizo qué y cuándo: anulaciones, ajustes, cambios de precio, permisos y más" />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={r => cambiar(() => setRango(r))} />
                <select className={`${inputClass} !w-auto`} value={usuarioId} onChange={e => cambiar(() => setUsuarioId(e.target.value))}>
                    <option value="">Todos los usuarios</option>
                    {filtros?.usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <select className={`${inputClass} !w-auto`} value={modulo} onChange={e => cambiar(() => setModulo(e.target.value))}>
                    <option value="">Todos los módulos</option>
                    {filtros?.modulos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className={`${inputClass} !w-auto`} value={accion} onChange={e => cambiar(() => setAccion(e.target.value))}>
                    <option value="">Todas las acciones</option>
                    {filtros?.acciones.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
                <input className={`${inputClass} max-w-[220px]`} placeholder="Buscar en la descripción" value={buscar} onChange={e => cambiar(() => setBuscar(e.target.value))} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Módulo</th>
                            <th className="px-4 py-3">Acción</th><th className="px-4 py-3">Registro</th><th className="px-4 py-3">Descripción</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!datos && <FilaCargando colSpan={6} />}
                        {datos?.registros.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin registros con esos filtros</td></tr>}
                        {datos?.registros.map(r => (
                            <Fragment key={r.id}>
                                <tr onClick={() => setAbierto(abierto === r.id ? null : r.id)} className="cursor-pointer hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-4 py-3">{fechaHora(r.fecha)}</td>
                                    <td className="px-4 py-3">{r.usuario}</td>
                                    <td className="px-4 py-3">{r.modulo}</td>
                                    <td className="px-4 py-3 font-medium">{r.accion.replace(/_/g, ' ')}</td>
                                    <td className="px-4 py-3 text-gray-500">{r.entidad ?? '—'}</td>
                                    <td className="px-4 py-3">{r.descripcion ?? '—'}</td>
                                </tr>
                                {abierto === r.id && (
                                    <tr className="bg-gray-50/60">
                                        <td colSpan={6} className="px-4 py-3">
                                            <Cambios antes={r.antes} despues={r.despues} />
                                            <p className="mt-2 text-xs text-gray-400">IP {r.ip ?? '—'} · {r.dispositivo ?? ''}</p>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
