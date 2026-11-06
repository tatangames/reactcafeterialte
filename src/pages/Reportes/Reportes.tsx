import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import SelectBuscador from '../../components/form/SelectBuscador';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import { inputClass } from '../../components/form/FormField';
import { useAuth } from '../../context/AuthContext';
import { exportarReporte, FiltrosReporte, FormatoColumna, getCatalogoReportes, getReporte, ReporteInfoInterface, ReporteInterface } from '../../services/reportes';
import { getCatalogoCompras, getProveedores } from '../../services/compras';
import { getCategoriasGasto } from '../../services/gastos';
import { hoyLocal, mensajeError } from '../../utils/formato';
import { formatearValor } from '../../utils/reportes';

const numerico = (f: FormatoColumna) => ['dinero', 'costo', 'numero', 'porcentaje'].includes(f);
const COLORES = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

function GraficaReporte({ reporte }: { reporte: ReporteInterface }) {
    const g = reporte.grafica;
    const opciones = useMemo(() => {
        if (!g || reporte.filas.length === 0) return null;
        const filas = g.limite ? reporte.filas.slice(0, g.limite) : reporte.filas;
        const columna = (clave: string) => reporte.columnas.find(c => c.clave === clave);
        const etiqueta = columna(g.etiqueta);
        const etiquetas = filas.map(f => formatearValor(f[g.etiqueta], etiqueta?.formato ?? 'texto'));
        const formato = columna(g.series[0])?.formato ?? 'dinero';

        if (g.tipo === 'dona') {
            return {
                tipo: 'donut' as const,
                series: filas.map(f => Number(f[g.series[0]] ?? 0)),
                options: { labels: etiquetas, colors: COLORES, legend: { position: 'bottom' }, tooltip: { y: { formatter: (v: number) => formatearValor(v, formato) } } } as ApexOptions,
            };
        }
        return {
            tipo: g.tipo === 'linea' ? 'line' as const : 'bar' as const,
            series: g.series.map(s => ({ name: columna(s)?.titulo ?? s, data: filas.map(f => Number(f[s] ?? 0)) })),
            options: {
                chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                colors: COLORES,
                plotOptions: { bar: { horizontal: g.tipo === 'barra_horizontal', borderRadius: 3, columnWidth: '60%' } },
                dataLabels: { enabled: false },
                stroke: { width: g.tipo === 'linea' ? 3 : 0, curve: 'smooth' },
                xaxis: { categories: etiquetas, labels: { formatter: g.tipo === 'barra_horizontal' ? (v: string) => formatearValor(v, formato) : undefined } },
                yaxis: g.tipo === 'barra_horizontal' ? {} : { labels: { formatter: (v: number) => formatearValor(v, formato) } },
                tooltip: { y: { formatter: (v: number) => formatearValor(v, formato) } },
                legend: { position: 'top' },
                grid: { borderColor: '#f1f5f9' },
            } as ApexOptions,
        };
    }, [reporte, g]);

    if (!opciones) return null;
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <Chart type={opciones.tipo} series={opciones.series} options={opciones.options} height={g?.tipo === 'barra_horizontal' ? 320 : 280} />
        </div>
    );
}

export default function Reportes() {
    const { hasPermission } = useAuth();
    const puedeExportar = hasPermission('reportes.exportar');

    const [catalogo, setCatalogo] = useState<ReporteInfoInterface[]>([]);
    // El panel de inicio abre un reporte con su rango: /reportes?tipo=productos_vendidos&desde=&hasta=
    const [params] = useSearchParams();
    const [tipo, setTipo] = useState(params.get('tipo') ?? 'ventas_diarias');
    const [rango, setRango] = useState({ desde: params.get('desde') ?? hoyLocal().slice(0, 8) + '01', hasta: params.get('hasta') ?? hoyLocal() });
    const [extra, setExtra] = useState<FiltrosReporte>({});
    const [reporte, setReporte] = useState<ReporteInterface | null>(null);
    const [cargando, setCargando] = useState(false);
    const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);

    const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
    const [proveedores, setProveedores] = useState<{ id: number; nombre: string }[]>([]);
    const [categoriasGasto, setCategoriasGasto] = useState<{ id: number; nombre: string }[]>([]);

    useEffect(() => { getCatalogoReportes().then(setCatalogo).catch(() => null); }, []);

    // Listas para los filtros propios de algunos reportes
    useEffect(() => {
        if (tipo === 'kardex' && productos.length === 0) getCatalogoCompras().then(c => setProductos(c.productos)).catch(() => null);
        if (tipo === 'compras' && proveedores.length === 0) getProveedores({ estado: 'todos' }).then(setProveedores).catch(() => null);
        if (tipo === 'gastos' && categoriasGasto.length === 0) getCategoriasGasto(true).then(setCategoriasGasto).catch(() => null);
    }, [tipo, productos.length, proveedores.length, categoriasGasto.length]);

    const info = catalogo.find(r => r.tipo === tipo);
    const filtros: FiltrosReporte = { ...(info?.fechas === false ? {} : rango), ...extra };

    useEffect(() => {
        if (tipo === 'kardex' && !extra.producto_id) { setReporte(null); return; }
        setCargando(true);
        getReporte(tipo, filtros)
            .then(setReporte)
            .catch(e => { setReporte(null); toast.error(mensajeError(e, 'No se pudo generar el reporte')); })
            .finally(() => setCargando(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, rango, extra, info?.fechas]);

    const exportar = async (formato: 'excel' | 'pdf') => {
        setExportando(formato);
        try {
            await exportarReporte(tipo, formato, filtros);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo exportar el reporte'));
        } finally {
            setExportando(null);
        }
    };

    const grupos = catalogo.reduce<Record<string, ReporteInfoInterface[]>>((acc, r) => ({ ...acc, [r.grupo]: [...(acc[r.grupo] ?? []), r] }), {});

    return (
        <div className="p-6">
            <PageHeader title="Reportes" subtitle="Ventas, utilidad, caja, compras, gastos, inventario y producción"
                actions={puedeExportar && reporte && (
                    <>
                        <button type="button" onClick={() => exportar('excel')} disabled={!!exportando}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-lg disabled:opacity-50">
                            {exportando === 'excel' ? 'Generando...' : 'Excel'}
                        </button>
                        <button type="button" onClick={() => exportar('pdf')} disabled={!!exportando}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg disabled:opacity-50">
                            {exportando === 'pdf' ? 'Generando...' : 'PDF'}
                        </button>
                    </>
                )} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
                <nav className="space-y-4">
                    {Object.entries(grupos).map(([grupo, reportes]) => (
                        <div key={grupo}>
                            <p className="mb-1 px-3 text-xs font-semibold uppercase text-gray-400">{grupo}</p>
                            {reportes.map(r => (
                                <button key={r.tipo} type="button" onClick={() => { setTipo(r.tipo); setExtra({}); }}
                                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${tipo === r.tipo ? 'bg-blue-600 font-medium text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    {r.titulo}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {info?.fechas !== false && <DateRangeFilter desde={rango.desde} hasta={rango.hasta} onChange={setRango} />}
                        {tipo === 'kardex' && (
                            <div className="w-64">
                                <SelectBuscador value={extra.producto_id ? Number(extra.producto_id) : null} placeholder="Buscar producto..."
                                    onChange={v => setExtra({ producto_id: v ? String(v) : '' })}
                                    opciones={productos.map(p => ({ value: p.id, label: p.nombre }))} />
                            </div>
                        )}
                        {tipo === 'compras' && (
                            <div className="w-64">
                                <SelectBuscador value={extra.proveedor_id ? Number(extra.proveedor_id) : 0} placeholder="Buscar proveedor..."
                                    onChange={v => setExtra({ proveedor_id: v ? String(v) : '' })}
                                    opciones={[{ value: 0, label: 'Todos los proveedores' }, ...proveedores.map(p => ({ value: p.id, label: p.nombre }))]} />
                            </div>
                        )}
                        {tipo === 'gastos' && (
                            <select className={`${inputClass} !w-auto`} value={extra.categoria_id ?? ''} onChange={e => setExtra({ categoria_id: e.target.value })}>
                                <option value="">Todas las categorías</option>
                                {categoriasGasto.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        )}
                        {tipo === 'inventario_valorizado' && (
                            <select className={`${inputClass} !w-auto`} value={extra.clase ?? ''} onChange={e => setExtra({ clase: e.target.value })}>
                                <option value="">Todas las clases</option>
                                <option value="producto_terminado">Producto terminado</option>
                                <option value="materia_prima">Materia prima</option>
                                <option value="reventa">Reventa</option>
                                <option value="empaque">Empaque</option>
                            </select>
                        )}
                        {tipo === 'mermas' && (
                            <select className={`${inputClass} !w-auto`} value={extra.motivo ?? ''} onChange={e => setExtra({ motivo: e.target.value })}>
                                <option value="">Todos los motivos</option>
                                <option value="vencido">Vencido</option>
                                <option value="quemado">Quemado</option>
                                <option value="danado">Dañado</option>
                                <option value="otro">Otro</option>
                            </select>
                        )}
                    </div>

                    {tipo === 'kardex' && !extra.producto_id && <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Elige un producto para ver su kárdex</p>}
                    {cargando && !reporte && <p className="text-gray-500">Generando...</p>}

                    {reporte && (
                        <div className={`space-y-4 ${cargando ? 'opacity-60' : ''}`}>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">{reporte.titulo}</h2>
                                <p className="text-sm text-gray-500">{reporte.periodo}</p>
                            </div>

                            {reporte.indicadores.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                                    {reporte.indicadores.map(i => (
                                        <div key={i.titulo} className="rounded-xl border border-gray-200 bg-white p-4">
                                            <p className="text-xs text-gray-500">{i.titulo}</p>
                                            <p className="text-xl font-semibold">{formatearValor(i.valor, i.formato)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <GraficaReporte reporte={reporte} />

                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                        <tr>{reporte.columnas.map(c => <th key={c.clave} className={`whitespace-nowrap px-3 py-3 ${numerico(c.formato) ? 'text-right' : ''}`}>{c.titulo}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {reporte.filas.length === 0 && <tr><td colSpan={reporte.columnas.length} className="px-4 py-8 text-center text-gray-500">Sin datos en el periodo</td></tr>}
                                        {reporte.filas.map((f, i) => (
                                            <tr key={i}>
                                                {reporte.columnas.map(c => {
                                                    const v = f[c.clave];
                                                    return <td key={c.clave} className={`px-3 py-2 ${numerico(c.formato) ? 'whitespace-nowrap text-right' : ''} ${typeof v === 'number' && v < 0 ? 'text-red-600' : ''}`}>{formatearValor(v, c.formato)}</td>;
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                    {reporte.totales && reporte.filas.length > 0 && (
                                        <tfoot>
                                            <tr className="bg-gray-50 font-semibold">
                                                {reporte.columnas.map((c, n) => (
                                                    <td key={c.clave} className={`px-3 py-3 ${numerico(c.formato) ? 'whitespace-nowrap text-right' : ''}`}>
                                                        {n === 0 ? 'Total' : c.clave in reporte.totales! ? formatearValor(reporte.totales![c.clave], c.formato) : ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                            {reporte.tipo === 'resultados' && (
                                <p className="text-xs text-gray-500">Estimado: utilidad bruta (ventas sin IVA menos su costo) menos mermas y gastos. Las compras no restan porque son inventario; su costo se reconoce al vender, producir o mermar.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
