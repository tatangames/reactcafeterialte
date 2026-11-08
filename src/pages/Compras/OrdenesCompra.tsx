import { useCallback, useEffect, useState } from 'react';
import FechaInput from "../../components/form/FechaInput";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import FormField, { inputClass } from '../../components/form/FormField';
import SelectBuscador from '../../components/form/SelectBuscador';
import MotivoModal from '../../components/modal/MotivoModal';
import LineasCompra, { LineaCompra, subtotalLinea } from '../../components/compras/LineasCompra';
import { useAuth } from '../../context/AuthContext';
import {
    accionOrden, descargarOrdenPdf, getCatalogoCompras, getOrden, getOrdenes, getProveedores, guardarOrden,
} from '../../services/compras';
import { cantidad, dinero, fechaCorta, hoyLocal, mensajeError } from '../../utils/formato';
import {
    ESTADOS_ORDEN, OrdenCompraInterface, ProductoCompraInterface, ProveedorInterface, UnidadCompraInterface,
} from '../../types/compras';
import { PaginaInterface } from '../../types/interfaces';
import { FilaCargando } from '../../components/ui/loading/Cargando';
import LoadingModal from '../../components/Loading/LoadingModal';

const FILTROS = [
    ['borrador,enviada,parcial', 'Abiertas'],
    ['recibida', 'Recibidas'],
    ['cancelada', 'Canceladas'],
    ['', 'Todas'],
] as const;

export default function OrdenesCompra() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const puedeGestionar = hasPermission('compras.gestionar');

    const [abriendo, setAbriendo] = useState(false);
    const [filtro, setFiltro] = useState<string>(FILTROS[0][0]);
    const [pagina, setPagina] = useState(1);
    const [datos, setDatos] = useState<(PaginaInterface & { ordenes: OrdenCompraInterface[] }) | null>(null);
    const [proveedores, setProveedores] = useState<ProveedorInterface[]>([]);
    const [productos, setProductos] = useState<ProductoCompraInterface[]>([]);
    const [unidades, setUnidades] = useState<UnidadCompraInterface[]>([]);

    const [detalle, setDetalle] = useState<OrdenCompraInterface | null>(null);
    const [editando, setEditando] = useState<OrdenCompraInterface | 'nueva' | null>(null);
    const [form, setForm] = useState({ proveedor_id: '', fecha: hoyLocal(), fecha_esperada: '', observaciones: '' });
    const [lineas, setLineas] = useState<LineaCompra[]>([]);
    const [motivoDe, setMotivoDe] = useState<'cancelar' | 'cerrar' | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        getOrdenes({ estado: filtro, page: pagina }).then(setDatos).catch(e => toast.error(mensajeError(e, 'Error al cargar las órdenes')));
    }, [filtro, pagina]);
    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        getProveedores().then(setProveedores).catch(() => null);
        if (puedeGestionar) {
            getCatalogoCompras().then(c => { setProductos(c.productos); setUnidades(c.unidades); }).catch(() => null);
        }
    }, [puedeGestionar]);

    const abrir = (id: number) => {
        setAbriendo(true);
        getOrden(id).then(setDetalle).catch(e => toast.error(mensajeError(e, 'No se pudo abrir la orden')))
            .finally(() => setAbriendo(false));
    }

    const editar = (orden: OrdenCompraInterface | null) => {
        setForm(orden
            ? { proveedor_id: String(orden.proveedor_id), fecha: orden.fecha, fecha_esperada: orden.fecha_esperada ?? '', observaciones: orden.observaciones ?? '' }
            : { proveedor_id: '', fecha: hoyLocal(), fecha_esperada: '', observaciones: '' });
        setLineas(orden?.items?.map(i => ({
            clave: `o${i.id}`, producto_id: i.producto_id, unidad_medida_id: i.unidad_medida_id,
            cantidad: String(i.cantidad), costo_unitario: String(i.costo_unitario),
        })) ?? []);
        setEditando(orden ?? 'nueva');
    };

    const guardar = async () => {
        setGuardando(true);
        try {
            const res = await guardarOrden({
                proveedor_id: Number(form.proveedor_id), fecha: form.fecha, fecha_esperada: form.fecha_esperada || null,
                observaciones: form.observaciones.trim() || undefined,
                items: lineas.map(l => ({ producto_id: l.producto_id, unidad_medida_id: l.unidad_medida_id, cantidad: Number(l.cantidad), costo_unitario: Number(l.costo_unitario || 0) })),
            }, editando !== 'nueva' && editando ? editando.id : undefined);
            toast.success(res.message);
            setEditando(null);
            setDetalle(res.orden);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar la orden'));
        } finally {
            setGuardando(false);
        }
    };

    const accion = async (tipo: 'enviar' | 'cancelar' | 'cerrar', motivo?: string) => {
        if (!detalle) return;
        setGuardando(true);
        try {
            const res = await accionOrden(detalle.id, tipo, motivo);
            toast.success(res.message);
            setMotivoDe(null);
            setDetalle(res.orden);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo actualizar la orden'));
        } finally {
            setGuardando(false);
        }
    };

    const totalForm = Math.round(lineas.reduce((s, l) => s + subtotalLinea(l), 0) * 100) / 100;

    return (
        <div className="p-6">
            <LoadingModal isOpen={abriendo} text="Abriendo orden..." />
            <MotivoModal isOpen={!!motivoDe} titulo={motivoDe === 'cerrar' ? `Cerrar orden ${detalle?.numero}` : `Cancelar orden ${detalle?.numero}`}
                descripcion={motivoDe === 'cerrar' ? 'Lo que falta por recibir ya no se espera. La orden queda como recibida.' : 'La orden queda cancelada.'}
                textoConfirmar={motivoDe === 'cerrar' ? 'Cerrar orden' : 'Cancelar orden'} isLoading={guardando}
                onClose={() => setMotivoDe(null)} onConfirm={m => motivoDe && accion(motivoDe, m)} />

            {editando && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl space-y-4 max-h-[94vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold">{editando === 'nueva' ? 'Nueva orden de compra' : `Editar orden ${editando.numero}`}</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField label="Proveedor" required>
                                <SelectBuscador value={form.proveedor_id ? Number(form.proveedor_id) : null}
                                    onChange={v => setForm(f => ({ ...f, proveedor_id: v ? String(v) : '' }))}
                                    placeholder="Buscar proveedor..." opciones={proveedores.map(p => ({ value: p.id, label: p.nombre }))} />
                            </FormField>
                            <FormField label="Fecha">
                                <FechaInput className={inputClass} value={form.fecha} onChange={(v) => setForm(f => ({ ...f, fecha: v }))} />
                            </FormField>
                            <FormField label="Entrega esperada">
                                <FechaInput className={inputClass} value={form.fecha_esperada} min={form.fecha} onChange={(v) => setForm(f => ({ ...f, fecha_esperada: v }))} />
                            </FormField>
                        </div>
                        <LineasCompra lineas={lineas} productos={productos} unidades={unidades} onChange={setLineas} />
                        <div className="flex justify-end text-lg font-semibold">Total estimado: {dinero(totalForm)}</div>
                        <FormField label="Observaciones">
                            <textarea value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} rows={2} maxLength={500}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                        </FormField>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditando(null)} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button type="button" onClick={guardar} disabled={guardando || !form.proveedor_id || lineas.length === 0 || lineas.some(l => Number(l.cantidad || 0) <= 0)}
                                className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'Guardar orden'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detalle && !editando && !motivoDe && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">Orden {detalle.numero}</h2>
                                <p className="text-sm text-gray-500">{detalle.proveedor} · {fechaCorta(detalle.fecha)}
                                    {detalle.fecha_esperada ? ` · entrega ${fechaCorta(detalle.fecha_esperada)}` : ''} · {detalle.usuario}</p>
                                {detalle.turno && <p className="text-xs text-gray-400">Turno {detalle.turno}</p>}
                            </div>
                            <StatusBadge tone={ESTADOS_ORDEN[detalle.estado].tono}>{ESTADOS_ORDEN[detalle.estado].texto}</StatusBadge>
                        </div>
                        {detalle.motivo_cancelacion && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{detalle.estado === 'cancelada' ? 'Cancelada' : 'Cerrada'}: {detalle.motivo_cancelacion}</p>}
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                    <tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2 text-right">Pedido</th><th className="px-3 py-2 text-right">Recibido</th>
                                        <th className="px-3 py-2 text-right">Costo</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {detalle.items?.map(i => (
                                        <tr key={i.id}>
                                            <td className="px-3 py-2">{i.producto}</td>
                                            <td className="px-3 py-2 text-right">{cantidad(i.cantidad, i.unidad)}</td>
                                            <td className={`px-3 py-2 text-right ${i.pendiente > 0 && i.cantidad_recibida > 0 ? 'text-amber-700' : ''}`}>{cantidad(i.cantidad_recibida, i.unidad)}</td>
                                            <td className="px-3 py-2 text-right">{dinero(i.costo_unitario, '$', i.costo_unitario < 1 ? 4 : 2)}</td>
                                            <td className="px-3 py-2 text-right">{dinero(i.subtotal)}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total estimado</td><td className="px-3 py-2 text-right">{dinero(detalle.total)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        {(detalle.compras?.length ?? 0) > 0 && (
                            <div className="text-sm text-gray-600">
                                <p className="font-semibold text-gray-700">Recepciones</p>
                                {detalle.compras!.map(c => (
                                    <p key={c.id} className={c.estado === 'anulada' ? 'line-through text-gray-400' : ''}>{c.numero} · {fechaCorta(c.fecha)} · {dinero(c.total)}</p>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <button type="button" onClick={() => descargarOrdenPdf(detalle).catch(e => toast.error(mensajeError(e, 'No se pudo generar el PDF')))}
                                className="px-4 py-2.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded-lg">PDF para el proveedor</button>
                            {puedeGestionar && detalle.estado === 'borrador' && (
                                <button type="button" onClick={() => accion('enviar')} className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">Marcar enviada</button>
                            )}
                            {puedeGestionar && ['borrador', 'enviada'].includes(detalle.estado) && (
                                <button type="button" onClick={() => editar(detalle)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Editar</button>
                            )}
                            {puedeGestionar && ['borrador', 'enviada', 'parcial'].includes(detalle.estado) && (
                                <button type="button" onClick={() => navigate(`/compras/nueva?orden=${detalle.id}`)} className="px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">Recibir mercadería</button>
                            )}
                            {puedeGestionar && ['borrador', 'enviada'].includes(detalle.estado) && (
                                <button type="button" onClick={() => setMotivoDe('cancelar')} className="px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg">Cancelar</button>
                            )}
                            {puedeGestionar && detalle.estado === 'parcial' && (
                                <button type="button" onClick={() => setMotivoDe('cerrar')} className="px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg">Cerrar sin recibir el resto</button>
                            )}
                            <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Órdenes de compra" subtitle="Lo que se le pide a cada proveedor y lo que ya llegó" backTo="/compras"
                actions={puedeGestionar && (
                    <button type="button" onClick={() => editar(null)} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nueva orden</button>
                )} />

            <div className="mb-4 flex flex-wrap gap-2">
                {FILTROS.map(([valor, texto]) => (
                    <button key={texto} type="button" onClick={() => { setFiltro(valor); setPagina(1); }}
                        className={`h-[42px] rounded-lg px-4 text-sm font-medium ${filtro === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {texto}
                    </button>
                ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Entrega</th>
                            <th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!datos && <FilaCargando colSpan={6} />}
                        {datos?.ordenes.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay órdenes</td></tr>}
                        {datos?.ordenes.map(o => (
                            <tr key={o.id} onClick={() => abrir(o.id)} className="cursor-pointer hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{o.numero}</td>
                                <td className="px-4 py-3">{fechaCorta(o.fecha)}</td>
                                <td className="px-4 py-3">{o.proveedor}</td>
                                <td className="px-4 py-3">{fechaCorta(o.fecha_esperada)}</td>
                                <td className="px-4 py-3 text-right font-semibold">{dinero(o.total)}</td>
                                <td className="px-4 py-3"><StatusBadge tone={ESTADOS_ORDEN[o.estado].tono}>{ESTADOS_ORDEN[o.estado].texto}</StatusBadge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {datos && <Paginacion pagina={datos.pagina} totalPaginas={datos.total_paginas} total={datos.total} onCambiar={setPagina} />}
            </div>
        </div>
    );
}
