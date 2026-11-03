import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import { getResumenProduccion } from '../../services/produccion';
import { cantidad, dinero, fechaCorta, haceDias, hoyLocal, mensajeError } from '../../utils/formato';
import { ResumenProduccionInterface } from '../../types/produccion';

const tarjeta = 'rounded-xl border border-gray-200 bg-white p-4';
const encabezado = 'bg-gray-50 text-left text-xs uppercase text-gray-500';

// Producción del periodo: rendimiento real frente al planificado, desvíos de consumo y mermas
export default function ResumenProduccion() {
    const [rango, setRango] = useState({ desde: haceDias(6), hasta: hoyLocal() });
    const [datos, setDatos] = useState<ResumenProduccionInterface | null>(null);

    useEffect(() => {
        getResumenProduccion(rango).then(setDatos).catch(e => toast.error(mensajeError(e, 'Error al cargar el resumen')));
    }, [rango]);

    return (
        <div className="p-6">
            <PageHeader title="Resumen de producción" subtitle="Rendimiento, consumo de ingredientes y mermas" backTo="/produccion" />
            <div className="mb-4"><DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} /></div>

            {!datos && <p className="text-gray-500">Cargando...</p>}
            {datos && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <div className={tarjeta}><p className="text-xs text-gray-500">Producciones</p><p className="text-2xl font-semibold">{datos.totales.producciones}</p></div>
                        <div className={tarjeta}><p className="text-xs text-gray-500">Costo producido</p><p className="text-2xl font-semibold">{dinero(datos.totales.costo)}</p></div>
                        <div className={tarjeta}><p className="text-xs text-gray-500">Mermas</p><p className="text-2xl font-semibold">{datos.totales.mermas}</p></div>
                        <div className={`${tarjeta} ${datos.totales.costo_mermas > 0 ? '!border-amber-200 !bg-amber-50' : ''}`}>
                            <p className="text-xs text-gray-500">Costo de mermas</p><p className="text-2xl font-semibold">{dinero(datos.totales.costo_mermas)}</p>
                            {datos.totales.costo > 0 && <p className="text-sm text-gray-500">{Math.round(datos.totales.costo_mermas / datos.totales.costo * 1000) / 10}% de lo producido</p>}
                        </div>
                    </div>

                    <section>
                        <h2 className="mb-2 font-semibold text-gray-800">Por producto</h2>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-sm">
                                <thead className={encabezado}><tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Planificado</th><th className="px-4 py-3 text-right">Producido</th>
                                    <th className="px-4 py-3 text-right">Rendimiento</th><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">C/u</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {datos.por_producto.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Sin producción</td></tr>}
                                    {datos.por_producto.map(p => (
                                        <tr key={p.producto_id}>
                                            <td className="px-4 py-3 font-medium">{p.producto}</td>
                                            <td className="px-4 py-3 text-right">{cantidad(p.planificada, p.unidad)}</td>
                                            <td className="px-4 py-3 text-right">{cantidad(p.producida, p.unidad)}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${p.rendimiento !== null && p.rendimiento < 95 ? 'text-red-600' : 'text-green-700'}`}>{p.rendimiento}%</td>
                                            <td className="px-4 py-3 text-right">{dinero(p.costo_total)}</td>
                                            <td className="px-4 py-3 text-right">{dinero(p.costo_unitario, '$', 4)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-2 font-semibold text-gray-800">Consumo de ingredientes (real frente a receta)</h2>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-sm">
                                <thead className={encabezado}><tr><th className="px-4 py-3">Ingrediente</th><th className="px-4 py-3 text-right">Según receta</th>
                                    <th className="px-4 py-3 text-right">Real</th><th className="px-4 py-3 text-right">Diferencia</th><th className="px-4 py-3 text-right">Costo</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {datos.consumos.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Sin consumos</td></tr>}
                                    {datos.consumos.map(c => (
                                        <tr key={c.producto_id}>
                                            <td className="px-4 py-3 font-medium">{c.producto}</td>
                                            <td className="px-4 py-3 text-right">{cantidad(c.teorica, c.unidad)}</td>
                                            <td className="px-4 py-3 text-right">{cantidad(c.real, c.unidad)}</td>
                                            <td className={`px-4 py-3 text-right ${c.diferencia > 0 ? 'text-red-600' : c.diferencia < 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                                {c.diferencia === 0 ? '—' : `${c.diferencia > 0 ? '+' : ''}${cantidad(c.diferencia, c.unidad)}`}</td>
                                            <td className="px-4 py-3 text-right">{dinero(c.costo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <section>
                            <h2 className="mb-2 font-semibold text-gray-800">Mermas por motivo</h2>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className={encabezado}><tr><th className="px-4 py-3">Motivo</th><th className="px-4 py-3 text-right">Registros</th><th className="px-4 py-3 text-right">Costo</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {datos.mermas.por_motivo.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">Sin mermas</td></tr>}
                                        {datos.mermas.por_motivo.map(m => (
                                            <tr key={m.motivo}><td className="px-4 py-3">{m.texto}</td><td className="px-4 py-3 text-right">{m.cantidad}</td><td className="px-4 py-3 text-right">{dinero(m.costo)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                        <section>
                            <h2 className="mb-2 font-semibold text-gray-800">Por día</h2>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className={encabezado}><tr><th className="px-4 py-3">Día</th><th className="px-4 py-3 text-right">Producciones</th><th className="px-4 py-3 text-right">Costo</th><th className="px-4 py-3 text-right">Mermas</th></tr></thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {datos.por_dia.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Sin datos</td></tr>}
                                        {datos.por_dia.map(d => (
                                            <tr key={d.fecha}><td className="px-4 py-3">{fechaCorta(d.fecha)}</td><td className="px-4 py-3 text-right">{d.producciones}</td>
                                                <td className="px-4 py-3 text-right">{dinero(d.costo)}</td><td className="px-4 py-3 text-right">{dinero(d.mermas)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
}
