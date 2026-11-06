import { useEffect, useMemo, useState } from 'react';
import FechaInput from "../../components/form/FechaInput";
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import FormField, { inputClass } from '../../components/form/FormField';
import MoneyInput from '../../components/form/MoneyInput';
import SelectBuscador from '../../components/form/SelectBuscador';
import LineasCompra, { LineaCompra, subtotalLinea } from '../../components/compras/LineasCompra';
import { useAuth } from '../../context/AuthContext';
import { useCaja } from '../../context/CajaContext';
import { getCatalogoCompras, getOrden, getProveedores, registrarCompra } from '../../services/compras';
import { nuevoUuid } from '../../utils/cajaDispositivo';
import { dinero, hoyLocal, mensajeError } from '../../utils/formato';
import {
    OrdenCompraInterface, ProductoCompraInterface, ProveedorInterface, TIPOS_DOCUMENTO, TipoDocumentoCompra, UnidadCompraInterface,
} from '../../types/compras';

const sumarDias = (fecha: string, dias: number) => {
    const d = new Date(`${fecha}T12:00:00`);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
};

// Registro de una compra (recepción de mercadería), suelta o desde una orden de compra
export default function CompraNueva() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { hasPermission } = useAuth();
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const turnoAbierto = !!actual?.turno;
    const metodos = (catalogos?.metodos_pago ?? []).filter(m => m.tipo !== 'credito');

    const [proveedores, setProveedores] = useState<ProveedorInterface[]>([]);
    const [productos, setProductos] = useState<ProductoCompraInterface[]>([]);
    const [unidades, setUnidades] = useState<UnidadCompraInterface[]>([]);
    const [orden, setOrden] = useState<OrdenCompraInterface | null>(null);

    const [proveedorId, setProveedorId] = useState<number | null>(null);
    const [fecha, setFecha] = useState(hoyLocal());
    const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoCompra>('factura');
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [condicion, setCondicion] = useState<'contado' | 'credito'>('contado');
    const [vence, setVence] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [lineas, setLineas] = useState<LineaCompra[]>([]);
    const [origenPago, setOrigenPago] = useState<'caja' | 'externo'>('caja');
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [referencia, setReferencia] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [uuid] = useState(nuevoUuid);

    useEffect(() => {
        getProveedores().then(setProveedores).catch(e => toast.error(mensajeError(e, 'Error al cargar proveedores')));
        getCatalogoCompras().then(c => { setProductos(c.productos); setUnidades(c.unidades); })
            .catch(e => toast.error(mensajeError(e, 'Error al cargar los productos')));
    }, []);

    // ?orden=ID: recibir lo pendiente de una orden de compra; ?proveedor=ID: proveedor elegido
    useEffect(() => {
        const ordenId = Number(params.get('orden'));
        const provId = Number(params.get('proveedor'));
        if (ordenId) {
            getOrden(ordenId).then(o => {
                setOrden(o);
                setProveedorId(o.proveedor_id);
                setLineas((o.items ?? []).filter(i => i.pendiente > 0).map(i => ({
                    clave: `o${i.id}`, producto_id: i.producto_id, unidad_medida_id: i.unidad_medida_id,
                    cantidad: String(i.pendiente), costo_unitario: String(i.costo_unitario),
                    orden_detalle_id: i.id, pendiente: i.pendiente,
                })));
            }).catch(e => toast.error(mensajeError(e, 'No se pudo cargar la orden')));
        } else if (provId) {
            setProveedorId(provId);
        }
    }, [params]);

    const proveedor = proveedores.find(p => p.id === proveedorId);

    // El plazo del proveedor decide si de entrada es contado o crédito
    useEffect(() => {
        if (!proveedor) return;
        setCondicion(proveedor.dias_credito > 0 ? 'credito' : 'contado');
    }, [proveedor]);

    useEffect(() => {
        setVence(condicion === 'credito' ? sumarDias(fecha, proveedor?.dias_credito ?? 0) : '');
    }, [condicion, fecha, proveedor]);

    useEffect(() => {
        setOrigenPago(turnoAbierto ? 'caja' : 'externo');
        setMetodoId(metodos.find(m => m.tipo === 'efectivo')?.id ?? metodos[0]?.id ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [turnoAbierto, catalogos]);

    const subtotal = useMemo(() => Math.round(lineas.reduce((s, l) => s + subtotalLinea(l), 0) * 100) / 100, [lineas]);
    // El negocio no maneja IVA: el total de la compra es la suma de las líneas
    const total = subtotal;
    const metodo = metodos.find(m => m.id === metodoId);
    // Total impreso en la factura del proveedor: si no cuadra con lo digitado, algo está mal
    const [totalFactura, setTotalFactura] = useState('');
    const factura = totalFactura.trim() === '' ? null : Number(totalFactura);
    const diferencia = factura === null ? 0 : Math.round((total - factura) * 100) / 100;

    const errores: string[] = [];
    if (!proveedorId) errores.push('Elige el proveedor');
    if (lineas.length === 0) errores.push('Agrega al menos un producto');
    if (lineas.some(l => Number(l.cantidad || 0) <= 0)) errores.push('Falta la cantidad de algún producto (marcada en rojo)');
    if (diferencia !== 0) errores.push(`El total no cuadra con la factura: diferencia de ${dinero(Math.abs(diferencia))}. Revisa cantidades y costos.`);
    if (condicion === 'contado' && origenPago === 'caja' && !turnoAbierto) errores.push('Abre el turno de caja o marca el pago como fuera de caja');
    if (condicion === 'contado' && metodo?.requiere_referencia && !referencia.trim()) errores.push(`${metodo.nombre} requiere referencia`);

    const guardar = async () => {
        if (!proveedorId) return;
        setGuardando(true);
        try {
            const res = await registrarCompra({
                uuid, proveedor_id: proveedorId, orden_compra_id: orden?.id ?? null,
                fecha, tipo_documento: tipoDocumento, numero_documento: numeroDocumento.trim() || undefined,
                condicion, fecha_vencimiento: condicion === 'credito' ? vence || null : null,
                impuesto: 0, observaciones: observaciones.trim() || undefined,
                items: lineas.map(l => ({
                    producto_id: l.producto_id, unidad_medida_id: l.unidad_medida_id, cantidad: Number(l.cantidad),
                    costo_unitario: Number(l.costo_unitario || 0), orden_detalle_id: l.orden_detalle_id ?? null,
                })),
                pago: condicion === 'contado'
                    ? { origen: origenPago, caja_id: origenPago === 'caja' ? cajaId : null, metodo_pago_id: metodoId ?? undefined, referencia: referencia.trim() || undefined }
                    : undefined,
            });
            toast.success(res.message);
            refrescar();
            navigate(`/compras?ver=${res.compra.id}`);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo registrar la compra'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <PageHeader title={orden ? `Recibir orden ${orden.numero}` : 'Registrar compra'} backTo={orden ? '/compras/ordenes' : '/compras'}
                subtitle="La mercadería entra al inventario y actualiza el costo promedio" />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <FormField label="Proveedor" required>
                                <SelectBuscador value={proveedorId} disabled={!!orden} onChange={setProveedorId}
                                    placeholder="Buscar proveedor..." opciones={proveedores.map(p => ({ value: p.id, label: p.nombre }))} />
                            </FormField>
                            <FormField label="Fecha" required>
                                <FechaInput className={inputClass} value={fecha} max={hoyLocal()} onChange={(v) => setFecha(v)} />
                            </FormField>
                            <FormField label="Documento">
                                <select className={inputClass} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value as TipoDocumentoCompra)}>
                                    {Object.entries(TIPOS_DOCUMENTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Número de documento">
                                <input className={inputClass} value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} maxLength={50} />
                            </FormField>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="mb-3 font-semibold text-gray-800">Productos</h2>
                        <LineasCompra lineas={lineas} productos={productos} unidades={unidades} onChange={setLineas} />
                        {lineas.length === 0 && <p className="mt-3 text-sm text-gray-500">Busca y agrega lo que llegó. El costo es por la unidad de compra (por ejemplo, por quintal).</p>}
                    </div>

                    <FormField label="Observaciones">
                        <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} maxLength={500}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                    </FormField>
                </div>

                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                        <div className="space-y-1 text-sm">
                            <div className="flex items-end justify-between pt-2"><span className="text-gray-700">Total</span><span className="text-3xl font-bold">{dinero(total)}</span></div>
                            <div className="flex items-center justify-between gap-3 pt-2">
                                <span className="text-gray-500">Total de la factura<br /><span className="text-xs">para comparar (opcional)</span></span>
                                <MoneyInput prefix="$" value={totalFactura} onChange={setTotalFactura} className="max-w-[140px]" />
                            </div>
                            {factura !== null && (diferencia === 0
                                ? <p className="text-xs font-medium text-green-700">✓ Cuadra con la factura</p>
                                : <p className="text-xs font-medium text-red-600">No cuadra: {diferencia > 0 ? 'digitaste' : 'faltan'} {dinero(Math.abs(diferencia))} {diferencia > 0 ? 'de más' : ''}</p>)}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {(['contado', 'credito'] as const).map(c => (
                                <button key={c} type="button" onClick={() => setCondicion(c)}
                                    className={`h-11 rounded-lg border text-sm font-medium ${condicion === c ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>
                                    {c === 'contado' ? 'Contado' : 'Crédito'}
                                </button>
                            ))}
                        </div>

                        {condicion === 'credito' ? (
                            <FormField label="Vence" hint={proveedor ? `Plazo del proveedor: ${proveedor.dias_credito} días` : undefined}>
                                <FechaInput className={inputClass} value={vence} min={fecha} onChange={(v) => setVence(v)} />
                            </FormField>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    {([['caja', 'Desde la caja'], ['externo', 'Fuera de caja']] as const).map(([v, t]) => (
                                        <button key={v} type="button" onClick={() => setOrigenPago(v)} disabled={v === 'caja' && !turnoAbierto}
                                            className={`h-11 rounded-lg border text-sm font-medium disabled:opacity-40 ${origenPago === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500">{origenPago === 'caja' ? 'Sale de la gaveta del turno abierto (pago a proveedor).' : 'Pagada desde el banco u otra cuenta: no toca la caja.'}</p>
                                <select className={inputClass} value={metodoId ?? ''} onChange={e => setMetodoId(Number(e.target.value))}>
                                    {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                </select>
                                {(metodo?.requiere_referencia || origenPago === 'externo') && (
                                    <input className={inputClass} value={referencia} onChange={e => setReferencia(e.target.value)} maxLength={100} placeholder="Referencia del pago" />
                                )}
                            </div>
                        )}

                        {errores.length > 0 && lineas.length > 0 && <p className="text-sm text-amber-700">{errores[0]}</p>}
                        <button type="button" onClick={guardar} disabled={guardando || errores.length > 0 || !hasPermission('compras.gestionar')}
                            className="w-full py-4 rounded-xl bg-green-600 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50">
                            {guardando ? 'Registrando...' : `Registrar compra ${total > 0 ? dinero(total) : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
