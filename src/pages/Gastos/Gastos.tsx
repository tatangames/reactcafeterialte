import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import FormField, { inputClass } from '../../components/form/FormField';
import MotivoModal from '../../components/modal/MotivoModal';
import GastoModal from '../../components/gastos/GastoModal';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import {
    anularGasto, CategoriaGastoInterface, GastoInterface, getCategoriasGasto, getGastos, getResumenGastos,
    guardarCategoriaGasto, ResumenGastosInterface, verComprobante,
} from '../../services/gastos';
import { dinero, fechaCorta, hoyLocal, mensajeError } from '../../utils/formato';
import { PaginaInterface } from '../../types/interfaces';

type Vista = 'gastos' | 'resumen' | 'categorias';
const inicioMes = () => hoyLocal().slice(0, 8) + '01';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Gastos() {
    const [params, setParams] = useSearchParams();
    const { hasPermission } = useAuth();
    const { actual, refrescar } = useCaja();
    const puedeRegistrar = hasPermission('gastos.registrar');
    const puedeVer = hasPermission('gastos.ver');
    const puedeCategorias = hasPermission('gastos.categorias');

    // Quien solo administra categorías entra directo a esa pestaña
    const [vista, setVista] = useState<Vista>(puedeVer || puedeRegistrar ? 'gastos' : 'categorias');
    const [categorias, setCategorias] = useState<CategoriaGastoInterface[]>([]);
    const [rango, setRango] = useState({ desde: inicioMes(), hasta: hoyLocal() });
    const [categoriaId, setCategoriaId] = useState('');
    const [origen, setOrigen] = useState('');
    const [buscar, setBuscar] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<(PaginaInterface & { gastos: GastoInterface[]; total_monto: number }) | null>(null);
    const [resumen, setResumen] = useState<ResumenGastosInterface | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [nuevo, setNuevo] = useState(false);
    const [detalle, setDetalle] = useState<GastoInterface | null>(null);
    const [anulando, setAnulando] = useState(false);
    const [categoriaForm, setCategoriaForm] = useState<{ id?: number; nombre: string; descripcion: string; activo: boolean } | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargarCategorias = useCallback(() => {
        getCategoriasGasto(vista === 'categorias').then(setCategorias).catch(() => null);
    }, [vista]);
    useEffect(() => { cargarCategorias(); }, [cargarCategorias]);

    // ?nuevo=1 desde la pantalla de caja
    useEffect(() => {
        if (params.get('nuevo')) {
            setNuevo(true);
            setParams({}, { replace: true });
        }
    }, [params, setParams]);

    useEffect(() => {
        if (vista !== 'gastos') return;
        const t = setTimeout(() => {
            getGastos({ ...rango, categoria_id: categoriaId, origen, buscar, page: pagina })
                .then(setDatos).catch(e => toast.error(mensajeError(e, 'Error al cargar los gastos')));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [vista, rango, categoriaId, origen, buscar, pagina, recarga]);

    useEffect(() => {
        if (vista !== 'resumen') return;
        getResumenGastos(rango).then(setResumen).catch(e => toast.error(mensajeError(e, 'Error al cargar el resumen')));
    }, [vista, rango, recarga]);

    const anular = async (motivo: string) => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const res = await anularGasto(detalle.id, motivo);
            if (res) {
                toast.success(res.message);
                setAnulando(false);
                setDetalle(res.gasto);
                setRecarga(r => r + 1);
                refrescar();
            }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular el gasto'));
        } finally {
            setGuardando(false);
        }
    };

    const guardarCategoria = async () => {
        if (!categoriaForm) return;
        setGuardando(true);
        try {
            const res = await guardarCategoriaGasto({
                nombre: categoriaForm.nombre.trim(), descripcion: categoriaForm.descripcion.trim() || null, activo: categoriaForm.activo,
            }, categoriaForm.id);
            toast.success(res.message);
            setCategoriaForm(null);
            cargarCategorias();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar la categoría'));
        } finally {
            setGuardando(false);
        }
    };

    const pestanas: [Vista, string, boolean][] = [['gastos', 'Gastos', puedeVer || puedeRegistrar], ['resumen', 'Resumen', puedeVer], ['categorias', 'Categorías', puedeCategorias]];
    const textoMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

    return (
        <div className="p-6">
            <GastoModal isOpen={nuevo} categorias={categorias.filter(c => c.activo)} onClose={() => setNuevo(false)}
                onSaved={g => { setNuevo(false); setDetalle(g); setRecarga(r => r + 1); }} />
            <MotivoModal isOpen={anulando} titulo={`Anular gasto ${detalle?.numero ?? ''}`}
                descripcion={detalle?.origen === 'caja' ? 'El dinero vuelve a la caja del turno. Queda en auditoría.' : 'Queda en auditoría.'}
                textoConfirmar="Anular gasto" isLoading={guardando} onClose={() => setAnulando(false)} onConfirm={anular} />

            {categoriaForm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold">{categoriaForm.id ? 'Editar categoría' : 'Nueva categoría'}</h2>
                        <FormField label="Nombre" required>
                            <input className={inputClass} value={categoriaForm.nombre} maxLength={100} autoFocus onChange={e => setCategoriaForm(f => f && { ...f, nombre: e.target.value })} />
                        </FormField>
                        <FormField label="Descripción">
                            <input className={inputClass} value={categoriaForm.descripcion} maxLength={300} onChange={e => setCategoriaForm(f => f && { ...f, descripcion: e.target.value })} />
                        </FormField>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" className="h-4 w-4" checked={categoriaForm.activo} onChange={e => setCategoriaForm(f => f && { ...f, activo: e.target.checked })} /> Activa
                        </label>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCategoriaForm(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button type="button" onClick={guardarCategoria} disabled={guardando || !categoriaForm.nombre.trim()}
                                className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {detalle && !anulando && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">Gasto {detalle.numero}</h2>
                                <p className="text-sm text-gray-500">{fechaCorta(detalle.fecha)} · {detalle.usuario} · {detalle.registrado.slice(11)}</p>
                                {detalle.turno && <p className="text-xs text-gray-400">Turno {detalle.turno}</p>}
                            </div>
                            <StatusBadge tone={detalle.anulado ? 'danger' : 'success'}>{detalle.anulado ? 'Anulado' : 'Registrado'}</StatusBadge>
                        </div>
                        <p className="text-3xl font-bold">{dinero(detalle.monto)}</p>
                        <dl className="space-y-1 text-sm">
                            <div className="flex justify-between gap-3"><dt className="text-gray-500">Categoría</dt><dd>{detalle.categoria}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-gray-500">Descripción</dt><dd className="text-right">{detalle.descripcion}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-gray-500">Pago</dt><dd>{detalle.metodo} · {detalle.origen === 'caja' ? `caja (turno #${detalle.turno_id})` : 'fuera de caja'}</dd></div>
                            {detalle.referencia && <div className="flex justify-between gap-3"><dt className="text-gray-500">Referencia</dt><dd>{detalle.referencia}</dd></div>}
                            {detalle.proveedor && <div className="flex justify-between gap-3"><dt className="text-gray-500">Proveedor</dt><dd>{detalle.proveedor}</dd></div>}
                            {detalle.numero_documento && <div className="flex justify-between gap-3"><dt className="text-gray-500">Documento</dt><dd>{detalle.numero_documento}</dd></div>}
                        </dl>
                        {detalle.anulado && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Anulado por {detalle.anulado_por}: {detalle.motivo_anulacion}</p>}
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            {detalle.tiene_comprobante && (
                                <button type="button" onClick={() => verComprobante(detalle).catch(e => toast.error(mensajeError(e, 'No se pudo abrir el comprobante')))}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Ver comprobante</button>
                            )}
                            {puedeRegistrar && !detalle.anulado && (detalle.origen === 'externo' || detalle.turno_id === actual?.turno?.id) && (
                                <button type="button" onClick={() => setAnulando(true)} className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Anular</button>
                            )}
                            <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Gastos" subtitle="Servicios, gas, planilla, mantenimiento y demás gastos del negocio"
                actions={puedeRegistrar && <button type="button" onClick={() => setNuevo(true)} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Registrar gasto</button>} />

            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
                {pestanas.filter(p => p[2]).map(([clave, texto]) => (
                    <button key={clave} type="button" onClick={() => setVista(clave)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${vista === clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{texto}</button>
                ))}
            </div>

            {vista !== 'categorias' && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={r => { setRango(r); setPagina(1); }} />
                    {vista === 'gastos' && (
                        <>
                            <select className={`${inputClass} !w-auto`} value={categoriaId} onChange={e => { setCategoriaId(e.target.value); setPagina(1); }}>
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <select className={`${inputClass} !w-auto`} value={origen} onChange={e => { setOrigen(e.target.value); setPagina(1); }}>
                                <option value="">Caja y fuera de caja</option>
                                <option value="caja">Desde la caja</option>
                                <option value="externo">Fuera de caja</option>
                            </select>
                            <input className={`${inputClass} max-w-[220px]`} placeholder="Buscar descripción o número" value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(1); }} />
                        </>
                    )}
                </div>
            )}

            {vista === 'gastos' && (
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Gasto</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Descripción</th>
                                <th className="px-4 py-3">Pago</th><th className="px-4 py-3 text-right">Monto</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!datos && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>}
                            {datos?.gastos.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay gastos en el periodo</td></tr>}
                            {datos?.gastos.map(g => (
                                <tr key={g.id} onClick={() => setDetalle(g)} className={`cursor-pointer hover:bg-gray-50 ${g.anulado ? 'text-gray-400' : ''}`}>
                                    <td className="px-4 py-3 font-medium">{g.numero}{g.tiene_comprobante && <span title="Tiene comprobante"> 📎</span>}</td>
                                    <td className="px-4 py-3">{fechaCorta(g.fecha)}</td>
                                    <td className="px-4 py-3">{g.categoria}</td>
                                    <td className="px-4 py-3">{g.descripcion}{g.anulado && <span className="ml-2"><StatusBadge tone="danger">Anulado</StatusBadge></span>}</td>
                                    <td className="px-4 py-3">{g.metodo} · {g.origen === 'caja' ? 'caja' : 'fuera de caja'}</td>
                                    <td className={`px-4 py-3 text-right font-semibold ${g.anulado ? 'line-through' : ''}`}>{dinero(g.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {datos && datos.gastos.length > 0 && (
                            <tfoot><tr className="bg-gray-50 font-semibold"><td colSpan={5} className="px-4 py-3 text-right">Total del periodo (sin anulados)</td><td className="px-4 py-3 text-right">{dinero(datos.total_monto)}</td></tr></tfoot>
                        )}
                    </table>
                    {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
                </div>
            )}

            {vista === 'resumen' && resumen && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-semibold">{dinero(resumen.total)}</p><p className="text-sm text-gray-500">{resumen.cantidad} gasto(s)</p></div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Desde la caja</p><p className="text-2xl font-semibold">{dinero(resumen.desde_caja)}</p></div>
                        <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Fuera de caja</p><p className="text-2xl font-semibold">{dinero(resumen.fuera_de_caja)}</p></div>
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
                        <section>
                            <h2 className="mb-2 font-semibold text-gray-800">Por categoría</h2>
                            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
                                {resumen.por_categoria.length === 0 && <p className="text-sm text-gray-500">Sin gastos en el periodo</p>}
                                {resumen.por_categoria.map(c => (
                                    <div key={c.categoria_id}>
                                        <div className="flex justify-between text-sm"><span>{c.categoria} <span className="text-gray-400">({c.cantidad})</span></span><span className="font-semibold">{dinero(c.total)} · {c.porcentaje}%</span></div>
                                        <div className="mt-1 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${c.porcentaje}%` }} /></div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <div className="space-y-6">
                            <section>
                                <h2 className="mb-2 font-semibold text-gray-800">Por mes</h2>
                                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
                                    {resumen.por_mes.map(m => <div key={m.mes} className="flex justify-between px-4 py-2.5"><span>{textoMes(m.mes)}</span><span className="font-semibold">{dinero(m.total)}</span></div>)}
                                </div>
                            </section>
                            <section>
                                <h2 className="mb-2 font-semibold text-gray-800">Por forma de pago</h2>
                                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
                                    {resumen.por_metodo.map(m => <div key={m.metodo} className="flex justify-between px-4 py-2.5"><span>{m.metodo}</span><span className="font-semibold">{dinero(m.total)}</span></div>)}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {vista === 'categorias' && (
                <div className="space-y-3">
                    <button type="button" onClick={() => setCategoriaForm({ nombre: '', descripcion: '', activo: true })}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nueva categoría</button>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Descripción</th><th className="px-4 py-3 text-right">Gastos</th><th className="px-4 py-3">Estado</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categorias.map(c => (
                                    <tr key={c.id} onClick={() => setCategoriaForm({ id: c.id, nombre: c.nombre, descripcion: c.descripcion ?? '', activo: c.activo })} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium">{c.nombre}</td>
                                        <td className="px-4 py-3 text-gray-600">{c.descripcion ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{c.gastos}</td>
                                        <td className="px-4 py-3"><StatusBadge tone={c.activo ? 'success' : 'neutral'}>{c.activo ? 'Activa' : 'Inactiva'}</StatusBadge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
