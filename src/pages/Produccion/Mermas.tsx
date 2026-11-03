import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import StatusBadge from '../../components/common/StatusBadge';
import { inputClass } from '../../components/form/FormField';
import MoneyInput from '../../components/form/MoneyInput';
import MotivoModal from '../../components/modal/MotivoModal';
import { useAuth } from '../../context/AuthContext';
import { anularMerma, getCatalogoProduccion, getMermas, registrarMermas } from '../../services/produccion';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { cantidad, dinero, fechaCorta, hoyLocal, mensajeError } from '../../utils/formato';
import { CatalogoProduccionInterface, MermaInterface, MotivoMerma } from '../../types/produccion';

interface Fila { cantidad: string; motivo: MotivoMerma; detalle: string; uuid: string }

// Cierre del día: lo que no se vendió, se quemó o se dañó sale del inventario a su costo
export default function Mermas() {
    const { hasPermission } = useAuth();
    const puedeRegistrar = hasPermission('mermas.registrar');

    const [catalogo, setCatalogo] = useState<CatalogoProduccionInterface | null>(null);
    const [fecha, setFecha] = useState(hoyLocal());
    const [filas, setFilas] = useState<Record<number, Fila>>({});
    const [extras, setExtras] = useState<number[]>([]);           // productos agregados a mano (materia prima dañada...)
    const [busqueda, setBusqueda] = useState('');
    const [guardando, setGuardando] = useState(false);

    const [rango, setRango] = useState({ desde: hoyLocal(), hasta: hoyLocal() });
    const [mermas, setMermas] = useState<{ mermas: MermaInterface[]; total: number } | null>(null);
    const [anulando, setAnulando] = useState<MermaInterface | null>(null);

    const cargarCatalogo = () => getCatalogoProduccion().then(setCatalogo).catch(e => toast.error(mensajeError(e, 'Error al cargar los productos')));
    const cargar = useCallback(() => {
        getMermas(rango).then(setMermas).catch(e => toast.error(mensajeError(e, 'Error al cargar las mermas')));
    }, [rango]);
    useEffect(() => { cargarCatalogo(); }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const motivos = catalogo?.motivos ?? { vencido: 'Vencido', quemado: 'Quemado', danado: 'Dañado', otro: 'Otro' };

    // Lo que se vende y queda en vitrina, más lo agregado a mano
    const productos = useMemo(() => (catalogo?.productos ?? []).filter(p =>
        (p.se_vende && p.controla_stock && (p.stock ?? 0) > 0) || extras.includes(p.id)), [catalogo, extras]);

    const sugerencias = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        if (!t) return [];
        return (catalogo?.productos ?? []).filter(p => !productos.some(x => x.id === p.id) && p.nombre.toLowerCase().includes(t)).slice(0, 8);
    }, [busqueda, catalogo, productos]);

    const fila = (id: number): Fila => filas[id] ?? { cantidad: '', motivo: 'vencido', detalle: '', uuid: '' };
    const cambiar = (id: number, cambios: Partial<Fila>) =>
        setFilas(f => ({ ...f, [id]: { ...fila(id), uuid: fila(id).uuid || nuevoUuid(), ...cambios } }));

    const conCantidad = productos.filter(p => Number(fila(p.id).cantidad || 0) > 0);
    const costo = conCantidad.reduce((s, p) => s + Number(fila(p.id).cantidad) * p.costo_unitario, 0);
    const excede = conCantidad.some(p => p.stock !== null && Number(fila(p.id).cantidad) > p.stock + 0.0001);

    const registrar = async () => {
        setGuardando(true);
        try {
            const res = await registrarMermas(fecha, conCantidad.map(p => ({
                uuid: fila(p.id).uuid, producto_id: p.id, cantidad: Number(fila(p.id).cantidad),
                motivo: fila(p.id).motivo, detalle: fila(p.id).detalle.trim() || undefined,
            })));
            toast.success(res.message);
            setFilas({});
            setExtras([]);
            cargar();
            cargarCatalogo();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudieron registrar las mermas'));
        } finally {
            setGuardando(false);
        }
    };

    const anular = async (motivo: string) => {
        if (!anulando) return;
        setGuardando(true);
        try {
            const res = await anularMerma(anulando.id, motivo);
            toast.success(res.message);
            setAnulando(null);
            cargar();
            cargarCatalogo();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular la merma'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <MotivoModal isOpen={!!anulando} titulo="Anular merma"
                descripcion={anulando ? `${cantidad(anulando.cantidad, anulando.unidad)} de ${anulando.producto} vuelven al inventario.` : ''}
                textoConfirmar="Anular merma" isLoading={guardando} onClose={() => setAnulando(null)} onConfirm={anular} />

            <PageHeader title="Mermas y cierre del día" subtitle="Pan que no se vendió, producto quemado o dañado: sale del inventario a su costo" />

            {puedeRegistrar && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="text-sm text-gray-600">Fecha</label>
                        <input type="date" className={`${inputClass} !w-auto`} value={fecha} max={hoyLocal()} onChange={e => setFecha(e.target.value)} />
                        <div className="relative min-w-[260px] flex-1">
                            <input className={inputClass} value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Agregar otro producto (materia prima, empaque...)" />
                            {sugerencias.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                    {sugerencias.map(p => (
                                        <button key={p.id} type="button" onClick={() => { setExtras(x => [...x, p.id]); setBusqueda(''); }}
                                            className="flex w-full justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50">
                                            <span>{p.nombre}</span><span className="text-gray-500">{p.stock !== null ? cantidad(p.stock, p.unidad) : ''}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Existencia</th><th className="px-3 py-2 w-32">Merma</th>
                                    <th className="px-3 py-2 w-48">Motivo</th><th className="px-3 py-2">Detalle</th><th className="px-3 py-2 text-right">Costo</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {!catalogo && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Cargando...</td></tr>}
                                {catalogo && productos.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No hay producto en existencia</td></tr>}
                                {productos.map(p => {
                                    const f = fila(p.id);
                                    const cant = Number(f.cantidad || 0);
                                    return (
                                        <tr key={p.id} className={cant > 0 ? 'bg-amber-50/50' : ''}>
                                            <td className="px-3 py-2 font-medium">{p.nombre}</td>
                                            <td className="px-3 py-2 text-right text-gray-500">{p.stock !== null ? cantidad(p.stock, p.unidad) : '—'}</td>
                                            <td className="px-3 py-2">
                                                <MoneyInput decimals={p.permite_fraccion ? 3 : 0} placeholder="0" value={f.cantidad} onChange={v => cambiar(p.id, { cantidad: v })} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select className={`${inputClass} !px-2`} value={f.motivo} onChange={e => cambiar(p.id, { motivo: e.target.value as MotivoMerma })}>
                                                    {Object.entries(motivos).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2"><input className={inputClass} value={f.detalle} maxLength={300} onChange={e => cambiar(p.id, { detalle: e.target.value })} /></td>
                                            <td className="px-3 py-2 text-right">{cant > 0 ? dinero(cant * p.costo_unitario) : ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {excede && <p className="text-sm text-amber-700">Alguna merma es mayor que la existencia registrada.</p>}
                    <div className="flex flex-wrap items-center justify-end gap-4">
                        <span className="text-sm text-gray-600">{conCantidad.length} producto(s) · costo <strong>{dinero(costo)}</strong></span>
                        <button type="button" onClick={registrar} disabled={guardando || conCantidad.length === 0}
                            className="px-6 py-3 rounded-xl bg-amber-600 text-base font-bold text-white hover:bg-amber-700 disabled:opacity-50">
                            {guardando ? 'Registrando...' : 'Registrar mermas'}
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} />
                <span className="text-sm text-gray-600">Costo de mermas: <strong>{dinero(mermas?.total ?? 0)}</strong></span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Cantidad</th>
                            <th className="px-4 py-3">Motivo</th><th className="px-4 py-3">Registró</th><th className="px-4 py-3 text-right">Costo</th><th></th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {mermas?.mermas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Sin mermas en el periodo</td></tr>}
                        {mermas?.mermas.map(m => (
                            <tr key={m.id} className={m.anulada ? 'text-gray-400' : ''}>
                                <td className="px-4 py-3">{fechaCorta(m.fecha)}</td>
                                <td className="px-4 py-3 font-medium">{m.producto}</td>
                                <td className="px-4 py-3 text-right">{cantidad(m.cantidad, m.unidad)}</td>
                                <td className="px-4 py-3">{m.motivo_texto}{m.detalle ? ` · ${m.detalle}` : ''}</td>
                                <td className="px-4 py-3">{m.usuario}{m.turno && <div className="text-xs text-gray-400">Turno {m.turno}</div>}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${m.anulada ? 'line-through' : ''}`}>{dinero(m.costo_total)}</td>
                                <td className="px-4 py-3 text-right">
                                    {m.anulada
                                        ? <span title={m.motivo_anulacion ?? ''}><StatusBadge tone="danger">Anulada</StatusBadge></span>
                                        : puedeRegistrar && <button type="button" onClick={() => setAnulando(m)} className="text-sm font-medium text-red-600 hover:underline">Anular</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
