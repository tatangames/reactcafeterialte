import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import MotivoModal from '../../components/modal/MotivoModal';
import DevolucionModal, { DevolucionForm } from '../../components/pos/DevolucionModal';
import TicketVenta from '../../components/pos/TicketVenta';
import { useCaja } from '../../context/CajaContext';
import { getConfiguracionNegocio } from '../../services/configuracion';
import { anularVenta, devolverVenta, getVenta, getVentas } from '../../services/pos';
import { imprimirVentaServidor } from '../../services/impresion';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { imprimirConRespaldo } from '../../utils/imprimir';
import { dinero, hoyLocal, mensajeError, fechaHora } from '../../utils/formato';
import { ConfiguracionNegocioInterface } from '../../types/interfaces';
import { VentaInterface, VentasResponseInterface } from '../../types/pos';
import { CapaCargando, FilaCargando } from '../../components/ui/loading/Cargando';
import LoadingModal from '../../components/Loading/LoadingModal';

const tonoEstado = { completada: 'success', anulada: 'danger', devuelta: 'warning' } as const;
const textoEstado = { completada: 'Completada', anulada: 'Anulada', devuelta: 'Devuelta' };

export default function VentasHistorial() {
    const [params, setParams] = useSearchParams();
    const turnoParam = params.get('turno');
    const { cajaId, catalogos, actual, refrescar } = useCaja();

    // Desde el panel de inicio: ?desde=&hasta= y ?venta= abre su detalle
    const [abriendo, setAbriendo] = useState(false);
    const [rango, setRango] = useState({ desde: params.get('desde') ?? hoyLocal(), hasta: params.get('hasta') ?? hoyLocal() });
    const ventaParam = params.get('venta');
    const [estado, setEstado] = useState('');
    const [buscar, setBuscar] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<VentasResponseInterface | null>(null);
    const [loading, setLoading] = useState(true);
    const [recarga, setRecarga] = useState(0);

    const [negocio, setNegocio] = useState<ConfiguracionNegocioInterface | null>(null);
    const [detalle, setDetalle] = useState<VentaInterface | null>(null);
    const [anulando, setAnulando] = useState(false);
    const [devolviendo, setDevolviendo] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => { getConfiguracionNegocio().then(setNegocio).catch(() => null); }, []);

    useEffect(() => {
        setLoading(true);
        getVentas(turnoParam ? { turno_id: turnoParam, estado, buscar, page: pagina } : { ...rango, estado, buscar, page: pagina })
            .then(setDatos)
            .catch(e => toast.error(mensajeError(e, 'Error al cargar las ventas')))
            .finally(() => setLoading(false));
    }, [turnoParam, rango, estado, buscar, pagina, recarga]);

    const abrirDetalle = (id: number) => {
        setAbriendo(true);
        getVenta(id).then(setDetalle).catch(e => toast.error(mensajeError(e, 'No se pudo abrir la venta')))
            .finally(() => setAbriendo(false));
    }

    useEffect(() => {
        if (ventaParam) abrirDetalle(Number(ventaParam));
    }, [ventaParam]);

    const despues = (venta: VentaInterface, mensaje: string) => {
        toast.success(mensaje);
        setDetalle(venta);
        setRecarga(r => r + 1);
        refrescar();
    };

    const anular = async (motivo: string) => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const res = await anularVenta(detalle.id, motivo);
            if (res) {
                setAnulando(false);
                despues(res.venta, res.message);
            }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular la venta'));
        } finally {
            setGuardando(false);
        }
    };

    const devolver = async (form: DevolucionForm) => {
        if (!detalle || !cajaId) return;
        setGuardando(true);
        const uuid = nuevoUuid();
        try {
            const res = await devolverVenta(detalle.id, { ...form, uuid, caja_id: cajaId });
            if (res) {
                setDevolviendo(false);
                despues(res.venta, res.message);
            }
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo registrar la devolución'));
        } finally {
            setGuardando(false);
        }
    };

    const turnoAbiertoId = actual?.turno?.id;

    return (
        <div className="p-6">
            <LoadingModal isOpen={abriendo} text="Abriendo venta..." />
            <MotivoModal isOpen={anulando} titulo={`Anular venta ${detalle?.numero ?? ''}`}
                descripcion="Se devuelve el stock y el dinero sale de la caja del turno. Queda registrado en auditoría."
                textoConfirmar="Anular venta" isLoading={guardando} onClose={() => setAnulando(false)} onConfirm={anular} />
            <DevolucionModal venta={devolviendo ? detalle : null} metodos={catalogos?.metodos_pago ?? []} isLoading={guardando}
                onCancel={() => setDevolviendo(false)} onConfirm={devolver} />

            {detalle && !anulando && !devolviendo && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2">
                        <div className="bg-gray-100 p-4">
                            <TicketVenta venta={detalle} negocio={negocio} copia />
                        </div>
                        <div className="no-imprimir p-6 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">{detalle.numero}</h2>
                                    <p className="text-sm text-gray-500">{fechaHora(detalle.fecha)} · {detalle.usuario}</p>
                                </div>
                                <StatusBadge tone={tonoEstado[detalle.estado]}>{textoEstado[detalle.estado]}</StatusBadge>
                            </div>
                            {detalle.estado === 'anulada' && (
                                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Anulada por {detalle.anulada_por}
                                    {detalle.anulacion_autorizada_por && detalle.anulacion_autorizada_por !== detalle.anulada_por ? ` (autorizó ${detalle.anulacion_autorizada_por})` : ''}
                                    {' '}el {fechaHora(detalle.anulada_at)}: {detalle.motivo_anulacion}</p>
                            )}
                            {detalle.descuento_autorizado_por && (
                                <p className="text-sm text-amber-700">Descuento autorizado por {detalle.descuento_autorizado_por}</p>
                            )}
                            {detalle.devoluciones.length > 0 && (
                                <div>
                                    <p className="mb-1 text-sm font-semibold text-gray-700">Devoluciones</p>
                                    {detalle.devoluciones.map(d => (
                                        <p key={d.id} className="text-sm text-gray-600">{d.numero} · {fechaHora(d.fecha)} · {dinero(d.total)} ({d.metodo}) — {d.motivo}</p>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-2 pt-2">
                                <button type="button"
                                    onClick={() => imprimirConRespaldo(() => imprimirVentaServidor(detalle.id, { caja_id: cajaId, copia: true }))}
                                    className="py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Reimprimir ticket</button>
                                {detalle.estado === 'completada' && detalle.devoluciones.length === 0 && detalle.turno_id === turnoAbiertoId && (
                                    <button type="button" onClick={() => setAnulando(true)} className="py-3 rounded-xl bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100">Anular venta</button>
                                )}
                                {detalle.estado === 'completada' && (
                                    <button type="button" onClick={() => setDevolviendo(true)} disabled={!turnoAbiertoId}
                                        title={turnoAbiertoId ? '' : 'Abre el turno de caja para reembolsar'}
                                        className="py-3 rounded-xl bg-amber-50 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                                        Devolución
                                    </button>
                                )}
                                <button type="button" onClick={() => setDetalle(null)} className="py-3 rounded-xl bg-gray-900 text-sm font-semibold text-white">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Historial de ventas" subtitle={turnoParam ? `Ventas del turno #${turnoParam}` : 'Ventas por fecha'}
                backTo={turnoParam ? '/pos/mostrador' : undefined}
                actions={turnoParam ? (
                    <button type="button" onClick={() => setParams({})} className="px-4 py-2.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Ver por fechas</button>
                ) : undefined} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                {!turnoParam && <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={r => { setPagina(1); setRango(r); }} />}
                <select value={estado} onChange={e => { setPagina(1); setEstado(e.target.value); }}
                    className="h-[42px] rounded-lg border border-gray-300 bg-white px-3 text-sm">
                    <option value="">Todos los estados</option>
                    <option value="completada">Completadas</option>
                    <option value="anulada">Anuladas</option>
                    <option value="devuelta">Devueltas</option>
                </select>
                <input type="text" value={buscar} onChange={e => { setPagina(1); setBuscar(e.target.value); }} placeholder="N.º de ticket"
                    className="h-[42px] w-40 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-400 focus:outline-none" />
            </div>

            {datos && (
                <div className="mb-4 grid grid-cols-2 gap-3 max-w-md">
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Ventas</p><p className="text-2xl font-semibold">{datos.totales.cantidad}</p></div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">Total vendido</p><p className="text-2xl font-semibold text-blue-700">{dinero(datos.totales.total)}</p></div>
                </div>
            )}

            <div className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto relative`}>
                <CapaCargando visible={loading && !!datos} />
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3 text-left">Ticket</th>
                            <th className="px-4 py-3 text-left">Fecha</th>
                            <th className="px-4 py-3 text-left">Cajero</th>
                            <th className="px-4 py-3 text-left">Pago</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3 text-left">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!datos && <FilaCargando colSpan={6} />}
                        {datos?.ventas.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No hay ventas</td></tr>}
                        {datos?.ventas.map(v => (
                            <tr key={v.id} onClick={() => abrirDetalle(v.id)} className="cursor-pointer hover:bg-blue-50/40">
                                <td className="px-4 py-3 font-medium text-blue-700">{v.numero}</td>
                                <td className="px-4 py-3 text-gray-600">{fechaHora(v.fecha)}</td>
                                <td className="px-4 py-3 text-gray-600">{v.usuario}</td>
                                <td className="px-4 py-3 text-gray-600">{v.pagos.join(' + ')}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${v.estado === 'anulada' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{dinero(v.total)}</td>
                                <td className="px-4 py-3"><StatusBadge tone={tonoEstado[v.estado]}>{textoEstado[v.estado]}</StatusBadge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
