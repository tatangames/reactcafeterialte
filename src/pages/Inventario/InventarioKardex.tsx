import LoadingModal from '../../components/Loading/LoadingModal';
import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import Paginacion from '../../components/common/Paginacion';
import StatusBadge from '../../components/common/StatusBadge';
import { useKardexHook } from '../../hooks/inventario/useKardexHook';
import { CLASES_PRODUCTO, cantidad, dinero, fechaHora } from '../../utils/formato';
import { TipoMovimiento } from '../../types/interfaces';
import { CapaCargando } from '../../components/ui/loading/Cargando';

const tonoTipo: Record<TipoMovimiento, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
    entrada: 'success', compra: 'success', produccion: 'info', devolucion: 'success', anulacion: 'neutral',
    salida: 'danger', venta: 'neutral', merma: 'danger', consumo_produccion: 'info', consumo_interno: 'info', ajuste: 'warning',
};

function Tarjeta({ titulo, valor, detalle, color = 'text-gray-800' }: { titulo: string; valor: string; detalle?: string; color?: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{titulo}</p>
            <p className={`text-xl font-semibold ${color}`}>{valor}</p>
            {detalle && <p className="text-xs text-gray-400">{detalle}</p>}
        </div>
    );
}

export default function InventarioKardex() {
    const { kardex, rango, cambiarRango, setPagina, loading } = useKardexHook();
    const unidad = kardex?.producto.unidad ?? null;

    return (
        <>
            <LoadingModal isOpen={loading && !kardex} text="Cargando kardex..." />

            <div className="p-6">
                <PageHeader
                    title={kardex ? `Kardex · ${kardex.producto.nombre}` : 'Kardex'}
                    subtitle={kardex
                        ? `${CLASES_PRODUCTO[kardex.producto.clase]}${kardex.producto.sku ? ` · ${kardex.producto.sku}` : ''} · existencia actual ${cantidad(kardex.producto.stock_actual, unidad)} · costo promedio ${dinero(kardex.producto.costo_unitario, '$', 4)}`
                        : undefined}
                    backTo="/admin/inventario"
                />

                <div className="mb-4">
                    <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={cambiarRango} />
                </div>

                {kardex && (
                    <>
                        <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Tarjeta titulo="Saldo inicial" valor={cantidad(kardex.saldo_inicial, unidad)} detalle={`al ${kardex.desde}`} />
                            <Tarjeta titulo="Entradas" valor={`+${cantidad(kardex.total_entradas, unidad)}`}
                                detalle={dinero(kardex.costo_entradas)} color="text-green-700" />
                            <Tarjeta titulo="Salidas" valor={`-${cantidad(kardex.total_salidas, unidad)}`}
                                detalle={dinero(kardex.costo_salidas)} color="text-red-600" />
                            <Tarjeta titulo="Saldo final" valor={cantidad(kardex.saldo_final, unidad)} detalle={`al ${kardex.hasta}`} />
                        </div>

                        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto relative`}>
                            <CapaCargando visible={loading} />
                            <table className="w-full min-w-[860px] text-sm">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Fecha</th>
                                        <th className="px-4 py-3 text-left">Movimiento</th>
                                        <th className="px-4 py-3 text-left">Documento / motivo</th>
                                        <th className="px-4 py-3 text-right">Entrada</th>
                                        <th className="px-4 py-3 text-right">Salida</th>
                                        <th className="px-4 py-3 text-right">Saldo</th>
                                        <th className="px-4 py-3 text-right">Costo unit.</th>
                                        <th className="px-4 py-3 text-right">Costo total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {kardex.pagina === 1 && (
                                        <tr className="bg-gray-50/60 text-gray-500">
                                            <td className="px-4 py-2">{kardex.desde}</td>
                                            <td className="px-4 py-2" colSpan={4}>Saldo inicial</td>
                                            <td className="px-4 py-2 text-right font-medium">{cantidad(kardex.saldo_inicial)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    )}
                                    {kardex.movimientos.length === 0 && (
                                        <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Sin movimientos en el período</td></tr>
                                    )}
                                    {kardex.movimientos.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-gray-600">{fechaHora(m.fecha)}</td>
                                            <td className="px-4 py-2">
                                                <StatusBadge tone={tonoTipo[m.tipo]}>{m.tipo_texto}</StatusBadge>
                                                {m.usuario && <div className="mt-0.5 text-xs text-gray-400">{m.usuario}</div>}
                                                {m.turno && <div className="text-xs text-gray-400">Turno {m.turno}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">
                                                {m.referencia && <div>{m.referencia}</div>}
                                                {m.motivo && <div className="text-xs text-gray-400">{m.motivo}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-right text-green-700">{m.entrada ? cantidad(m.entrada) : ''}</td>
                                            <td className="px-4 py-2 text-right text-red-600">{m.salida ? cantidad(m.salida) : ''}</td>
                                            <td className={`px-4 py-2 text-right font-semibold ${m.saldo < 0 ? 'text-red-600' : 'text-gray-800'}`}>{cantidad(m.saldo)}</td>
                                            <td className="px-4 py-2 text-right text-gray-600">{dinero(m.costo_unitario, '$', 4)}</td>
                                            <td className="px-4 py-2 text-right text-gray-800">{dinero(m.costo_total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Paginacion pagina={kardex.pagina} totalPaginas={kardex.total_paginas} total={kardex.total} onCambiar={setPagina} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
