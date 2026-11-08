import { useCallback, useEffect, useMemo, useState } from 'react';
import FechaInput from "../../components/form/FechaInput";
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import StatusBadge from '../../components/common/StatusBadge';
import FormField, { inputClass } from '../../components/form/FormField';
import MoneyInput from '../../components/form/MoneyInput';
import MotivoModal from '../../components/modal/MotivoModal';
import { useAuth } from '../../context/AuthContext';
import {
    anularProduccion, getCatalogoProduccion, getProduccion, getProducciones, getReceta, getRecetas, registrarProduccion,
} from '../../services/produccion';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { cantidad, dinero, fechaCorta, hoyLocal, mensajeError } from '../../utils/formato';
import { CatalogoProduccionInterface, ProduccionInterface, RecetaInterface } from '../../types/produccion';
import { FilaCargando } from '../../components/ui/loading/Cargando';

const redondear = (v: number) => Math.round(v * 1000) / 1000;

export default function Produccion() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { hasPermission } = useAuth();
    const puedeRegistrar = hasPermission('produccion.registrar');

    const [recetas, setRecetas] = useState<RecetaInterface[]>([]);
    const [catalogo, setCatalogo] = useState<CatalogoProduccionInterface | null>(null);
    const [receta, setReceta] = useState<RecetaInterface | null>(null);
    const [fecha, setFecha] = useState(hoyLocal());
    const [planificada, setPlanificada] = useState('');
    const [producida, setProducida] = useState('');
    const [reales, setReales] = useState<Record<number, string>>({});
    const [observaciones, setObservaciones] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [uuid, setUuid] = useState(nuevoUuid);

    const [rango, setRango] = useState({ desde: hoyLocal(), hasta: hoyLocal() });
    const [producciones, setProducciones] = useState<ProduccionInterface[] | null>(null);
    const [detalle, setDetalle] = useState<ProduccionInterface | null>(null);
    const [anulando, setAnulando] = useState(false);

    const cargar = useCallback(() => {
        getProducciones(rango).then(setProducciones).catch(e => toast.error(mensajeError(e, 'Error al cargar la producción')));
    }, [rango]);
    useEffect(() => { cargar(); }, [cargar]);

    const cargarCatalogo = () => getCatalogoProduccion().then(setCatalogo).catch(() => null);
    useEffect(() => {
        // Las recetas de venta (limonada, platos) no se producen: se descuentan al vender
        getRecetas().then(rs => setRecetas(rs.filter(r => r.uso !== 'venta'))).catch(() => null);
        cargarCatalogo();
    }, []);

    const elegirReceta = (id: number | null) => {
        setReales({});
        if (!id) { setReceta(null); return; }
        getReceta(id).then(r => {
            setReceta(r);
            setPlanificada(String(r.rendimiento));
            setProducida(String(r.rendimiento));
        }).catch(e => toast.error(mensajeError(e, 'No se pudo cargar la receta')));
    };

    // ?receta=ID desde la pantalla de recetas
    useEffect(() => {
        const id = Number(params.get('receta'));
        if (id) {
            elegirReceta(id);
            setParams({}, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    // Consumo teórico para la cantidad planificada, agrupado por insumo
    const consumos = useMemo(() => {
        if (!receta?.ingredientes) return [];
        const factor = Number(planificada || 0) / receta.rendimiento;
        const agrupado = new Map<number, { producto_id: number; producto: string; unidad: string | null; teorica: number; costo: number }>();
        receta.ingredientes.forEach(i => {
            const actual = agrupado.get(i.producto_id) ?? { producto_id: i.producto_id, producto: i.producto, unidad: i.unidad_base, teorica: 0, costo: i.costo_unitario };
            actual.teorica += i.cantidad_base * factor;
            agrupado.set(i.producto_id, actual);
        });
        return [...agrupado.values()].map(c => {
            const stock = catalogo?.productos.find(p => p.id === c.producto_id)?.stock ?? null;
            const real = reales[c.producto_id] !== undefined ? Number(reales[c.producto_id] || 0) : c.teorica;
            return { ...c, teorica: redondear(c.teorica), real, stock, falta: stock !== null && real > stock + 0.0001 };
        });
    }, [receta, planificada, reales, catalogo]);

    const costoEstimado = consumos.reduce((s, c) => s + c.real * c.costo, 0);
    const prod = Number(producida || 0);

    const registrar = async () => {
        if (!receta) return;
        // Un rendimiento muy distinto casi siempre es un número mal digitado (95 en vez de 195)
        const plan = Number(planificada || 0);
        if (plan > 0) {
            const pct = Math.round(prod / plan * 1000) / 10;
            if ((pct < 80 || pct > 120) && !window.confirm(
                `Salieron ${prod} de ${plan} planificados (${pct}%).

¿Es correcto? Si fue un error al digitar, toca Cancelar y corrígelo.`)) return;
        }
        setGuardando(true);
        try {
            const res = await registrarProduccion({
                uuid, receta_id: receta.id, fecha,
                cantidad_planificada: Number(planificada), cantidad_producida: prod,
                observaciones: observaciones.trim() || undefined,
                consumos: Object.keys(reales).length
                    ? consumos.map(c => ({ producto_id: c.producto_id, cantidad_real: redondear(c.real) }))
                    : undefined,
            });
            toast.success(res.message);
            setUuid(nuevoUuid());
            setReceta(null);
            setPlanificada('');
            setProducida('');
            setReales({});
            setObservaciones('');
            setDetalle(res.produccion);
            cargar();
            cargarCatalogo();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo registrar la producción'));
        } finally {
            setGuardando(false);
        }
    };

    const anular = async (motivo: string) => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const res = await anularProduccion(detalle.id, motivo);
            toast.success(res.message);
            setAnulando(false);
            setDetalle(res.produccion);
            cargar();
            cargarCatalogo();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular la producción'));
        } finally {
            setGuardando(false);
        }
    };

    const totalDia = (producciones ?? []).filter(p => p.estado === 'registrada').reduce((s, p) => s + p.costo_total, 0);

    return (
        <div className="p-6">
            <MotivoModal isOpen={anulando} titulo={`Anular producción ${detalle?.numero ?? ''}`}
                descripcion="Sale del inventario lo producido y los ingredientes vuelven a su existencia. Queda en auditoría."
                textoConfirmar="Anular producción" isLoading={guardando} onClose={() => setAnulando(false)} onConfirm={anular} />

            {detalle && !anulando && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">{detalle.numero} · {detalle.producto}</h2>
                                <p className="text-sm text-gray-500">{fechaCorta(detalle.fecha)} · receta v{detalle.version} · {detalle.usuario}</p>
                                {detalle.turno && <p className="text-xs text-gray-400">Turno {detalle.turno}</p>}
                            </div>
                            <StatusBadge tone={detalle.estado === 'anulada' ? 'danger' : 'success'}>{detalle.estado === 'anulada' ? 'Anulada' : 'Registrada'}</StatusBadge>
                        </div>
                        {detalle.motivo_anulacion && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Anulada: {detalle.motivo_anulacion}</p>}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Planificado</p><p className="text-lg font-semibold">{cantidad(detalle.cantidad_planificada, detalle.unidad)}</p></div>
                            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Producido</p><p className="text-lg font-semibold">{cantidad(detalle.cantidad_producida, detalle.unidad)}</p>
                                <p className={detalle.rendimiento !== null && detalle.rendimiento < 95 ? 'text-red-600' : 'text-green-700'}>{detalle.rendimiento}% de lo planificado</p></div>
                            <div className="rounded-lg bg-gray-50 p-3"><p className="text-gray-500">Costo</p><p className="text-lg font-semibold">{dinero(detalle.costo_total)}</p>
                                <p className="text-gray-500">{dinero(detalle.costo_unitario, '$', 4)} c/u</p></div>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-3 py-2">Ingrediente</th><th className="px-3 py-2 text-right">Teórico</th><th className="px-3 py-2 text-right">Real</th>
                                    <th className="px-3 py-2 text-right">Diferencia</th><th className="px-3 py-2 text-right">Costo</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {detalle.consumos?.map(c => (
                                    <tr key={c.producto_id}>
                                        <td className="px-3 py-2">{c.producto}</td>
                                        <td className="px-3 py-2 text-right">{cantidad(c.cantidad_teorica, c.unidad)}</td>
                                        <td className="px-3 py-2 text-right">{cantidad(c.cantidad_real, c.unidad)}</td>
                                        <td className={`px-3 py-2 text-right ${c.diferencia > 0 ? 'text-red-600' : c.diferencia < 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                            {c.diferencia === 0 ? '—' : `${c.diferencia > 0 ? '+' : ''}${cantidad(c.diferencia, c.unidad)}`}</td>
                                        <td className="px-3 py-2 text-right">{dinero(c.costo_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {detalle.observaciones && <p className="text-sm text-gray-600">Obs.: {detalle.observaciones}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            {puedeRegistrar && detalle.estado === 'registrada' && (
                                <button type="button" onClick={() => setAnulando(true)} className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Anular</button>
                            )}
                            <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Producción" subtitle="Lo que se horneó hoy: descuenta ingredientes y suma producto terminado"
                actions={<>
                    <button type="button" onClick={() => navigate('/produccion/recetas')} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Recetas</button>
                    <button type="button" onClick={() => navigate('/produccion/resumen')} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Resumen</button>
                </>} />

            {puedeRegistrar && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <FormField label="Receta" required>
                            <select className={inputClass} value={receta?.id ?? ''} onChange={e => elegirReceta(e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Elegir producto...</option>
                                {recetas.map(r => <option key={r.id} value={r.id}>{r.producto} (rinde {cantidad(r.rendimiento, r.unidad)})</option>)}
                            </select>
                        </FormField>
                        <FormField label="Fecha">
                            <FechaInput className={inputClass} value={fecha} max={hoyLocal()} onChange={(v) => setFecha(v)} />
                        </FormField>
                        <FormField label={`Planificado${receta?.unidad ? ` (${receta.unidad})` : ''}`} hint={receta ? `${redondear(Number(planificada || 0) / receta.rendimiento)} tanda(s)` : undefined}>
                            <MoneyInput decimals={3} placeholder="0" value={planificada} onChange={v => { setPlanificada(v); setReales({}); }} disabled={!receta} />
                        </FormField>
                        <FormField label={`Producido${receta?.unidad ? ` (${receta.unidad})` : ''}`} required
                            hint={receta && Number(planificada) > 0 ? `${Math.round(prod / Number(planificada) * 1000) / 10}% de lo planificado` : undefined}>
                            <MoneyInput decimals={3} placeholder="0" value={producida} onChange={setProducida} disabled={!receta} />
                        </FormField>
                    </div>

                    {receta && (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full min-w-[560px] text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                        <tr><th className="px-3 py-2">Ingrediente</th><th className="px-3 py-2 text-right">Según receta</th>
                                            <th className="px-3 py-2 w-36">Consumo real</th><th className="px-3 py-2 text-right">Existencia</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {consumos.map(c => (
                                            <tr key={c.producto_id}>
                                                <td className="px-3 py-2">{c.producto}</td>
                                                <td className="px-3 py-2 text-right">{cantidad(c.teorica, c.unidad)}</td>
                                                <td className="px-3 py-2">
                                                    <MoneyInput decimals={3} suffix={c.unidad ?? ''} placeholder={String(c.teorica)}
                                                        value={reales[c.producto_id] ?? ''} onChange={v => setReales(r => ({ ...r, [c.producto_id]: v }))} />
                                                </td>
                                                <td className={`px-3 py-2 text-right ${c.falta ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                                                    {c.stock === null ? 'Sin control' : cantidad(c.stock, c.unidad)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {consumos.some(c => c.falta) && <p className="text-sm text-red-600">No hay existencia suficiente de algún ingrediente: registra primero la compra o el ajuste.</p>}
                            <FormField label="Observaciones">
                                <input className={inputClass} value={observaciones} onChange={e => setObservaciones(e.target.value)} maxLength={500} />
                            </FormField>
                            <div className="flex flex-wrap items-center justify-end gap-4">
                                <span className="text-sm text-gray-600">Costo estimado: <strong>{dinero(costoEstimado)}</strong>
                                    {prod > 0 && <> · {dinero(costoEstimado / prod, '$', 4)} por {receta.unidad ?? 'unidad'}</>}</span>
                                <button type="button" onClick={registrar} disabled={guardando || prod <= 0 || Number(planificada || 0) <= 0}
                                    className="px-6 py-3 rounded-xl bg-green-600 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50">
                                    {guardando ? 'Registrando...' : 'Registrar producción'}
                                </button>
                            </div>
                        </>
                    )}
                    {recetas.length === 0 && <p className="text-sm text-gray-500">Aún no hay recetas. Créalas en la pantalla de Recetas.</p>}
                </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
                <span className="text-sm text-gray-600">Costo producido: <strong>{dinero(totalDia)}</strong></span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Producción</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3 text-right">Producido</th><th className="px-4 py-3 text-right">Rendimiento</th>
                            <th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">C/u</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!producciones && <FilaCargando colSpan={7} />}
                        {producciones?.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Sin producción en el periodo</td></tr>}
                        {producciones?.map(p => (
                            <tr key={p.id} onClick={() => getProduccion(p.id).then(setDetalle)} className={`cursor-pointer hover:bg-gray-50 ${p.estado === 'anulada' ? 'text-gray-400 line-through' : ''}`}>
                                <td className="px-4 py-3 font-medium">{p.numero}</td>
                                <td className="px-4 py-3">{fechaCorta(p.fecha)}</td>
                                <td className="px-4 py-3">{p.producto}</td>
                                <td className="px-4 py-3 text-right">{cantidad(p.cantidad_producida, p.unidad)}</td>
                                <td className={`px-4 py-3 text-right ${p.rendimiento !== null && p.rendimiento < 95 ? 'text-red-600' : ''}`}>{p.rendimiento}%</td>
                                <td className="px-4 py-3 text-right">{dinero(p.costo_total)}</td>
                                <td className="px-4 py-3 text-right">{dinero(p.costo_unitario, '$', 4)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
