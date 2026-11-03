import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { inputClass } from '../../components/form/FormField';
import PagoCajaModal, { PagoCajaForm } from '../../components/clientes/PagoCajaModal';
import PedidoEspecialModal from '../../components/clientes/PedidoEspecialModal';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { cancelarPedidoEspecial, getPedidosEspeciales, registrarAnticipo } from '../../services/clientes';
import { getCatalogoPos } from '../../services/pos';
import { getConfiguracionNegocio } from '../../services/configuracion';
import { cantidad, dinero, hoyLocal, mensajeError } from '../../utils/formato';
import { PedidoEspecialInterface } from '../../types/clientes';
import { ConfiguracionNegocioInterface } from '../../types/interfaces';
import { ProductoPosInterface } from '../../types/pos';

type Estado = 'abierto' | 'cobrado' | 'cancelado';

const textoFecha = (f: string | null) => {
    if (!f) return '—';
    const [dia, hora] = f.split(' ');
    return `${dia.split('-').reverse().join('/')} ${hora ?? ''}`;
};

// Comprobante del encargo para el cliente (80 mm, se imprime desde el navegador)
function ComprobantePedido({ pedido, negocio }: { pedido: PedidoEspecialInterface; negocio: ConfiguracionNegocioInterface | null }) {
    const fila = (izq: string, der: string, fuerte = false) => (
        <div className={`flex justify-between gap-3 ${fuerte ? 'font-bold' : ''}`}><span>{izq}</span><span className="whitespace-nowrap">{der}</span></div>
    );
    return (
        <div className="area-impresion mx-auto w-full max-w-[300px] bg-white p-4 font-mono text-[12px] leading-snug text-gray-900">
            <div className="text-center">
                <p className="text-sm font-bold">{negocio?.nombre ?? 'Panadería Eduardo'}</p>
                {negocio?.telefono && <p>Tel. {negocio.telefono}</p>}
                <p className="mt-1 font-bold">PEDIDO ESPECIAL {pedido.numero}</p>
            </div>
            <hr className="my-2 border-dashed border-gray-500" />
            <p>Cliente: {pedido.nombre}</p>
            {pedido.telefono && <p>Tel.: {pedido.telefono}</p>}
            <p className="font-bold">Entrega: {textoFecha(pedido.fecha_entrega)}</p>
            <hr className="my-2 border-dashed border-gray-500" />
            {pedido.items.map((i, n) => (
                <div key={n} className="mb-1">
                    <p>{i.nombre}</p>
                    {fila(`  ${cantidad(i.cantidad)} x ${dinero(i.precio_unitario)}`, dinero(i.cantidad * i.precio_unitario))}
                    {i.notas && <p className="pl-2">» {i.notas}</p>}
                </div>
            ))}
            {pedido.observaciones && <p className="mt-1">Obs.: {pedido.observaciones}</p>}
            <hr className="my-2 border-dashed border-gray-500" />
            {fila('TOTAL', dinero(pedido.total), true)}
            {fila('Anticipo', dinero(pedido.anticipo))}
            {fila('PENDIENTE', dinero(pedido.pendiente), true)}
            <hr className="my-2 border-dashed border-gray-500" />
            <p className="text-center text-[11px]">Presente este comprobante al retirar su pedido.</p>
            <p className="text-center text-[10px] text-gray-500">Recibido {pedido.creado} · {pedido.usuario}</p>
        </div>
    );
}

export default function PedidosEspeciales() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const turnoAbierto = !!actual?.turno;

    const [estado, setEstado] = useState<Estado>('abierto');
    const [buscar, setBuscar] = useState('');
    const [pedidos, setPedidos] = useState<PedidoEspecialInterface[]>([]);
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState<ProductoPosInterface[]>([]);
    const [negocio, setNegocio] = useState<ConfiguracionNegocioInterface | null>(null);

    const [editando, setEditando] = useState<PedidoEspecialInterface | null | 'nuevo'>(null);
    const [viendo, setViendo] = useState<PedidoEspecialInterface | null>(null);
    const [anticipo, setAnticipo] = useState<PedidoEspecialInterface | null>(null);
    const [cancelando, setCancelando] = useState<PedidoEspecialInterface | null>(null);
    const [motivo, setMotivo] = useState('');
    const [devolver, setDevolver] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        setLoading(true);
        getPedidosEspeciales({ estado, buscar })
            .then(setPedidos)
            .catch(e => toast.error(mensajeError(e, 'Error al cargar los pedidos')))
            .finally(() => setLoading(false));
    }, [estado, buscar]);

    useEffect(() => {
        const t = setTimeout(cargar, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [cargar, buscar]);

    useEffect(() => {
        getCatalogoPos().then(c => setProductos(c.productos)).catch(() => setProductos([]));
        getConfiguracionNegocio().then(setNegocio).catch(() => null);
    }, []);

    const guardado = (p: PedidoEspecialInterface) => {
        setEditando(null);
        setViendo(p);
        cargar();
        refrescar();
    };

    const recibirAnticipo = async (pago: PagoCajaForm) => {
        if (!anticipo || !cajaId) return;
        setGuardando(true);
        try {
            const res = await registrarAnticipo(anticipo.id, { ...pago, caja_id: cajaId });
            toast.success(res.message);
            setAnticipo(null);
            guardado(res.pedido);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo registrar el anticipo'));
        } finally {
            setGuardando(false);
        }
    };

    const cancelar = async () => {
        if (!cancelando) return;
        setGuardando(true);
        try {
            const res = await cancelarPedidoEspecial(cancelando.id, {
                motivo: motivo.trim(), devolver_anticipo: cancelando.anticipo > 0 && devolver, caja_id: cajaId,
            });
            toast.success(res.message);
            setCancelando(null);
            setViendo(null);
            cargar();
            refrescar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo cancelar el pedido'));
        } finally {
            setGuardando(false);
        }
    };

    const hoy = hoyLocal();
    const tonoEntrega = (p: PedidoEspecialInterface) => {
        const dia = p.fecha_entrega?.slice(0, 10) ?? '';
        if (p.estado !== 'abierto') return 'neutral';
        if (dia < hoy) return 'danger';
        return dia === hoy ? 'warning' : 'info';
    };

    return (
        <div className="p-6">
            <PedidoEspecialModal isOpen={editando !== null} pedido={editando === 'nuevo' ? null : editando}
                productos={productos} metodos={catalogos?.metodos_pago ?? []} cajaId={cajaId} turnoAbierto={turnoAbierto}
                onClose={() => setEditando(null)} onSaved={guardado} />
            <PagoCajaModal isOpen={!!anticipo} titulo={`Anticipo del pedido ${anticipo?.numero ?? ''}`}
                descripcion="Entra a la caja del turno y se descuenta al entregar el pedido."
                maximo={anticipo?.pendiente} metodos={catalogos?.metodos_pago ?? []} isLoading={guardando}
                onClose={() => setAnticipo(null)} onConfirm={recibirAnticipo} />

            {cancelando && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                        <h2 className="text-lg font-semibold">Cancelar pedido {cancelando.numero}</h2>
                        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} maxLength={300} autoFocus placeholder="Motivo (obligatorio)"
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                        {cancelando.anticipo > 0 && (
                            <div className="rounded-lg bg-amber-50 p-3 text-sm">
                                <label className="flex items-center gap-2 font-medium text-amber-900">
                                    <input type="checkbox" checked={devolver} onChange={e => setDevolver(e.target.checked)} className="h-4 w-4" />
                                    Devolver el anticipo de {dinero(cancelando.anticipo)} en efectivo
                                </label>
                                <p className="mt-1 text-amber-800">{devolver
                                    ? (turnoAbierto ? 'Sale de la caja del turno abierto.' : 'Abre el turno de caja para devolverlo.')
                                    : 'El anticipo queda en caja y no se devuelve al cliente.'}</p>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCancelando(null)} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Volver</button>
                            <button type="button" onClick={cancelar}
                                disabled={guardando || !motivo.trim() || (cancelando.anticipo > 0 && devolver && !turnoAbierto)}
                                className="px-4 py-2.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50">
                                {guardando ? 'Procesando...' : 'Cancelar pedido'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viendo && !editando && !anticipo && !cancelando && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2">
                        <div className="bg-gray-100 p-4"><ComprobantePedido pedido={viendo} negocio={negocio} /></div>
                        <div className="no-imprimir p-6 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">{viendo.numero}</h2>
                                    <p className="text-sm text-gray-500">Recibido {viendo.creado} · {viendo.usuario}</p>
                                </div>
                                <StatusBadge tone={viendo.estado === 'abierto' ? 'info' : viendo.estado === 'cobrado' ? 'success' : 'danger'}>
                                    {viendo.estado === 'abierto' ? 'Pendiente' : viendo.estado === 'cobrado' ? 'Entregado' : 'Cancelado'}
                                </StatusBadge>
                            </div>
                            {viendo.anticipos.length > 0 && (
                                <div>
                                    <p className="mb-1 text-sm font-semibold text-gray-700">Movimientos de caja</p>
                                    {viendo.anticipos.map((a, i) => (
                                        <p key={i} className="text-sm text-gray-600">{a.fecha} · {a.tipo === 'anticipo' ? 'Anticipo' : 'Devolución'} {dinero(a.monto)} ({a.metodo}{a.referencia ? ` ${a.referencia}` : ''})</p>
                                    ))}
                                </div>
                            )}
                            {viendo.venta && <p className="text-sm text-green-700">Cobrado en la venta {viendo.venta.numero}</p>}
                            {viendo.motivo_cancelacion && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Cancelado: {viendo.motivo_cancelacion}</p>}
                            <div className="grid grid-cols-1 gap-2 pt-2">
                                {viendo.estado === 'abierto' && hasPermission('pos.vender') && (
                                    <button type="button" onClick={() => navigate(`/pos/mostrador?pedido=${viendo.id}`)}
                                        className="py-3 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700">
                                        Entregar y cobrar {dinero(viendo.pendiente)}
                                    </button>
                                )}
                                <button type="button" onClick={() => window.print()} className="py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Imprimir comprobante</button>
                                {viendo.estado === 'abierto' && (
                                    <>
                                        {viendo.pendiente > 0 && (
                                            <button type="button" onClick={() => setAnticipo(viendo)} disabled={!turnoAbierto}
                                                title={turnoAbierto ? '' : 'Abre el turno de caja'}
                                                className="py-3 rounded-xl bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">Recibir anticipo</button>
                                        )}
                                        <button type="button" onClick={() => setEditando(viendo)} className="py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">Editar pedido</button>
                                        <button type="button" onClick={() => { setMotivo(''); setDevolver(true); setCancelando(viendo); }}
                                            className="py-3 rounded-xl bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100">Cancelar pedido</button>
                                    </>
                                )}
                                <button type="button" onClick={() => setViendo(null)} className="py-3 text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Pedidos especiales" subtitle="Encargos con fecha de entrega y anticipo"
                actions={<button type="button" onClick={() => setEditando('nuevo')}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nuevo pedido</button>} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex gap-2">
                    {([['abierto', 'Pendientes'], ['cobrado', 'Entregados'], ['cancelado', 'Cancelados']] as const).map(([valor, texto]) => (
                        <button key={valor} type="button" onClick={() => setEstado(valor)}
                            className={`h-[42px] rounded-lg px-4 text-sm font-medium ${estado === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {texto}
                        </button>
                    ))}
                </div>
                <input className={`${inputClass} max-w-xs`} placeholder="Buscar número, nombre o teléfono" value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>

            {loading && pedidos.length === 0 && <p className="text-gray-500">Cargando...</p>}
            {!loading && pedidos.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No hay pedidos</p>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pedidos.map(p => (
                    <button key={p.id} type="button" onClick={() => setViendo(p)}
                        className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-800">{p.nombre}</p>
                                <p className="text-xs text-gray-500">{p.numero}{p.telefono ? ` · ${p.telefono}` : ''}</p>
                            </div>
                            <StatusBadge tone={tonoEntrega(p)}>{textoFecha(p.fecha_entrega)}</StatusBadge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{p.items.map(i => `${cantidad(i.cantidad)} ${i.nombre}`).join(', ')}</p>
                        <div className="mt-3 flex justify-between text-sm">
                            <span className="text-gray-500">Total {dinero(p.total)} · Anticipo {dinero(p.anticipo)}</span>
                            {p.estado === 'abierto' && <span className="font-semibold">Pendiente {dinero(p.pendiente)}</span>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
