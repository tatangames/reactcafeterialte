import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { inputClass } from '../../components/form/FormField';
import SelectBuscador from '../../components/form/SelectBuscador';
import MotivoModal from '../../components/modal/MotivoModal';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { anularCompra, getCompra, getCompras, getProveedores } from '../../services/compras';
import { cantidad, dinero, fechaCorta, haceDias, hoyLocal, mensajeError } from '../../utils/formato';
import { CompraInterface, ComprasResponseInterface, ProveedorInterface, TIPOS_DOCUMENTO } from '../../types/compras';

export default function Compras() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const { hasPermission } = useAuth();
    const { refrescar } = useCaja();

    const [rango, setRango] = useState({ desde: haceDias(29), hasta: hoyLocal() });
    const [proveedorId, setProveedorId] = useState(params.get('proveedor') ?? '');
    const [estado, setEstado] = useState('');
    const [buscar, setBuscar] = useState('');
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<ComprasResponseInterface | null>(null);
    const [proveedores, setProveedores] = useState<ProveedorInterface[]>([]);
    const [recarga, setRecarga] = useState(0);

    const [detalle, setDetalle] = useState<CompraInterface | null>(null);
    const [anulando, setAnulando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => { getProveedores({ estado: 'todos' }).then(setProveedores).catch(() => null); }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            getCompras({ ...rango, proveedor_id: proveedorId ? Number(proveedorId) : undefined, estado, buscar, page: pagina })
                .then(setDatos)
                .catch(e => toast.error(mensajeError(e, 'Error al cargar las compras')));
        }, buscar ? 300 : 0);
        return () => clearTimeout(t);
    }, [rango, proveedorId, estado, buscar, pagina, recarga]);

    // ?ver=ID: abre la compra recién registrada
    useEffect(() => {
        const ver = Number(params.get('ver'));
        if (ver) {
            abrir(ver);
            setParams({}, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const abrir = (id: number) => getCompra(id).then(setDetalle).catch(e => toast.error(mensajeError(e, 'No se pudo abrir la compra')));

    const anular = async (motivo: string) => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const res = await anularCompra(detalle.id, motivo);
            toast.success(res.message);
            setAnulando(false);
            setDetalle(res.compra);
            setRecarga(r => r + 1);
            refrescar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo anular la compra'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <MotivoModal isOpen={anulando} titulo={`Anular compra ${detalle?.numero ?? ''}`}
                descripcion="Sale del inventario lo que entró y se anula lo que se debe. Si fue de contado, también se anula su pago. Queda en auditoría."
                textoConfirmar="Anular compra" isLoading={guardando} onClose={() => setAnulando(false)} onConfirm={anular} />

            {detalle && !anulando && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">Compra {detalle.numero}</h2>
                                <p className="text-sm text-gray-500">
                                    {detalle.proveedor} · {fechaCorta(detalle.fecha)} · {TIPOS_DOCUMENTO[detalle.tipo_documento]} {detalle.numero_documento ?? ''}
                                    {detalle.orden ? ` · orden ${detalle.orden}` : ''} · {detalle.usuario}
                                </p>
                                {detalle.turno && <p className="text-xs text-gray-400">Turno {detalle.turno}</p>}
                            </div>
                            <StatusBadge tone={detalle.estado === 'anulada' ? 'danger' : detalle.saldo > 0 ? 'warning' : 'success'}>
                                {detalle.estado === 'anulada' ? 'Anulada' : detalle.saldo > 0 ? `Debe ${dinero(detalle.saldo)}` : 'Pagada'}
                            </StatusBadge>
                        </div>
                        {detalle.estado === 'anulada' && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Anulada por {detalle.anulada_por}: {detalle.motivo_anulacion}</p>}

                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                    <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-right">Costo</th>
                                        <th className="px-3 py-2 text-right">Subtotal</th><th className="px-3 py-2 text-right">Al inventario</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {detalle.items?.map((i, n) => (
                                        <tr key={n}>
                                            <td className="px-3 py-2">{i.producto}</td>
                                            <td className="px-3 py-2 text-right">{cantidad(i.cantidad, i.unidad)}</td>
                                            <td className="px-3 py-2 text-right">{dinero(i.costo_unitario, '$', i.costo_unitario < 1 ? 4 : 2)}</td>
                                            <td className="px-3 py-2 text-right">{dinero(i.subtotal)}</td>
                                            <td className="px-3 py-2 text-right text-gray-500">{cantidad(i.cantidad_base, i.unidad_base)} a {dinero(i.costo_base, '$', 4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap justify-between gap-4">
                            <div className="text-sm text-gray-600">
                                <p>{detalle.condicion === 'contado' ? 'De contado' : `Al crédito · vence ${fechaCorta(detalle.fecha_vencimiento)}`}</p>
                                {detalle.pagos?.map(p => (
                                    <p key={p.id} className={p.anulado ? 'line-through text-gray-400' : ''}>
                                        {p.numero} · {fechaCorta(p.fecha)} · {dinero(p.monto)} ({p.metodo}, {p.origen === 'caja' ? 'caja' : 'fuera de caja'})
                                    </p>
                                ))}
                                {detalle.observaciones && <p className="mt-1">Obs.: {detalle.observaciones}</p>}
                            </div>
                            <div className="min-w-[200px] space-y-1 text-sm">
                                {Number(detalle.impuesto) > 0 && <>
                                    <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{dinero(detalle.subtotal)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">IVA</span><span>{dinero(detalle.impuesto)}</span></div>
                                </>}
                                <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{dinero(detalle.total)}</span></div>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            {detalle.estado === 'registrada' && detalle.saldo > 0 && hasPermission('cuentas_pagar.gestionar') && (
                                <button type="button" onClick={() => navigate(`/compras/proveedores/${detalle.proveedor_id}`)}
                                    className="px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg">Ir a pagar</button>
                            )}
                            {detalle.estado === 'registrada' && hasPermission('compras.gestionar') && (
                                <button type="button" onClick={() => setAnulando(true)} className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Anular compra</button>
                            )}
                            <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Compras" subtitle="Recepciones de mercadería de los proveedores"
                actions={<>
                    <button type="button" onClick={() => navigate('/compras/ordenes')} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Órdenes de compra</button>
                    {hasPermission('compras.gestionar') && (
                        <button type="button" onClick={() => navigate('/compras/nueva')} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Registrar compra</button>
                    )}
                </>} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={r => { setRango(r); setPagina(1); }} />
                {/* 0 = todos */}
                <div className="w-64">
                    <SelectBuscador value={proveedorId ? Number(proveedorId) : 0} placeholder="Buscar proveedor..."
                        onChange={v => { setProveedorId(v ? String(v) : ''); setPagina(1); }}
                        opciones={[{ value: 0, label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]} />
                </div>
                <select className={`${inputClass} !w-auto`} value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }}>
                    <option value="">Registradas y anuladas</option>
                    <option value="registrada">Registradas</option>
                    <option value="anulada">Anuladas</option>
                </select>
                <input className={`${inputClass} max-w-[220px]`} placeholder="N.º de compra o documento" value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(1); }} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Compra</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Documento</th>
                            <th className="px-4 py-3">Condición</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Saldo</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!datos && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>}
                        {datos?.compras.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay compras en el periodo</td></tr>}
                        {datos?.compras.map(c => (
                            <tr key={c.id} onClick={() => abrir(c.id)} className={`cursor-pointer hover:bg-gray-50 ${c.estado === 'anulada' ? 'text-gray-400' : ''}`}>
                                <td className="px-4 py-3 font-medium">{c.numero}{c.estado === 'anulada' && <span className="ml-2"><StatusBadge tone="danger">Anulada</StatusBadge></span>}</td>
                                <td className="px-4 py-3">{fechaCorta(c.fecha)}</td>
                                <td className="px-4 py-3">{c.proveedor}</td>
                                <td className="px-4 py-3">{TIPOS_DOCUMENTO[c.tipo_documento]} {c.numero_documento ?? ''}</td>
                                <td className="px-4 py-3">{c.condicion === 'contado' ? 'Contado' : 'Crédito'}</td>
                                <td className="px-4 py-3 text-right font-semibold">{dinero(c.total)}</td>
                                <td className="px-4 py-3 text-right">{c.estado === 'registrada' && c.saldo > 0 ? dinero(c.saldo) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                    {datos && datos.compras.length > 0 && (
                        <tfoot><tr className="bg-gray-50 font-semibold"><td colSpan={5} className="px-4 py-3 text-right">Total del periodo (sin anuladas)</td><td className="px-4 py-3 text-right">{dinero(datos.totales.total)}</td><td></td></tr></tfoot>
                    )}
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
