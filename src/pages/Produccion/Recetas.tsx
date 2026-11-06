import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormField, { inputClass } from '../../components/form/FormField';
import MoneyInput from '../../components/form/MoneyInput';
import SelectBuscador from '../../components/form/SelectBuscador';
import { useAuth } from '../../context/AuthContext';
import { activarReceta, getCatalogoProduccion, getReceta, getRecetas, guardarReceta } from '../../services/produccion';
import { cantidad, dinero, mensajeError } from '../../utils/formato';
import { CatalogoProduccionInterface, RecetaInterface } from '../../types/produccion';
import { sinTildes } from '../../utils/texto';

interface LineaReceta { clave: string; producto_id: number; unidad_medida_id: number | null; cantidad: string; merma: string }

const costo4 = (v: number) => dinero(v, '$', v < 1 ? 4 : 2);

export default function Recetas() {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const puedeEditar = hasPermission('recetas.gestionar');

    const [recetas, setRecetas] = useState<RecetaInterface[] | null>(null);
    const [catalogo, setCatalogo] = useState<CatalogoProduccionInterface | null>(null);
    const [buscar, setBuscar] = useState('');
    // '' = todas; venta = se descuenta al vender; produccion = se hornea por tandas
    const [uso, setUso] = useState<'' | 'venta' | 'produccion'>('');
    const visibles = useMemo(() => recetas?.filter(r => !uso || (uso === 'venta' ? r.uso === 'venta' : r.uso !== 'venta')) ?? null, [recetas, uso]);
    const [detalle, setDetalle] = useState<RecetaInterface | null>(null);

    // Editor
    const [editando, setEditando] = useState<RecetaInterface | 'nueva' | null>(null);
    const [productoId, setProductoId] = useState<number | null>(null);
    const [rendimiento, setRendimiento] = useState('');
    const [notas, setNotas] = useState('');
    const [lineas, setLineas] = useState<LineaReceta[]>([]);
    const [busquedaInsumo, setBusquedaInsumo] = useState('');
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        getRecetas({ buscar }).then(setRecetas).catch(e => toast.error(mensajeError(e, 'Error al cargar las recetas')));
    }, [buscar]);
    useEffect(() => { const t = setTimeout(cargar, buscar ? 300 : 0); return () => clearTimeout(t); }, [cargar, buscar]);
    useEffect(() => { getCatalogoProduccion().then(setCatalogo).catch(() => null); }, []);

    const abrir = (id: number) => getReceta(id).then(setDetalle).catch(e => toast.error(mensajeError(e, 'No se pudo abrir la receta')));

    const editar = (r: RecetaInterface | null) => {
        setProductoId(r?.producto_id ?? null);
        setRendimiento(r ? String(r.rendimiento) : '');
        setNotas(r?.notas ?? '');
        setLineas(r?.ingredientes?.map(i => ({
            clave: `i${i.id}`, producto_id: i.producto_id, unidad_medida_id: i.unidad_medida_id,
            cantidad: String(i.cantidad), merma: i.merma_porcentaje ? String(i.merma_porcentaje) : '',
        })) ?? []);
        setBusquedaInsumo('');
        setEditando(r ?? 'nueva');
    };

    const productos = useMemo(() => catalogo?.productos ?? [], [catalogo]);
    const unidades = useMemo(() => catalogo?.unidades ?? [], [catalogo]);

    // Costo en vivo con el costo promedio de hoy
    const costeo = useMemo(() => {
        const filas = lineas.map(l => {
            const insumo = productos.find(p => p.id === l.producto_id);
            const unidad = unidades.find(u => u.id === l.unidad_medida_id);
            const base = unidades.find(u => u.id === insumo?.unidad_medida_id);
            const cant = Number(l.cantidad || 0) * (1 + Number(l.merma || 0) / 100);
            const enBase = unidad && base ? cant * unidad.factor_base / base.factor_base : cant;
            return { clave: l.clave, enBase, unidadBase: base?.abreviatura ?? '', costo: enBase * (insumo?.costo_unitario ?? 0) };
        });
        const total = filas.reduce((s, f) => s + f.costo, 0);
        const rend = Number(rendimiento || 0);
        return { filas, total, unitario: rend > 0 ? total / rend : 0 };
    }, [lineas, productos, unidades, rendimiento]);

    const producto = productos.find(p => p.id === productoId);
    // Lo que no lleva existencia propia no se produce: su receta se descuenta al venderlo
    const deVenta = !!producto && !producto.controla_stock;
    const insumosSugeridos = useMemo(() => {
        const t = sinTildes(busquedaInsumo.trim());
        if (!t) return [];
        return productos.filter(p => p.id !== productoId && sinTildes(p.nombre).includes(t) && (!deVenta || p.controla_stock)).slice(0, 8);
    }, [busquedaInsumo, productos, productoId, deVenta]);

    const guardar = async () => {
        if (!productoId) return;
        setGuardando(true);
        try {
            const res = await guardarReceta({
                producto_id: productoId, rendimiento: Number(rendimiento), notas: notas.trim() || undefined,
                ingredientes: lineas.map(l => ({
                    producto_id: l.producto_id, unidad_medida_id: l.unidad_medida_id ?? 0,
                    cantidad: Number(l.cantidad), merma_porcentaje: Number(l.merma || 0),
                })),
            }, editando !== 'nueva' && editando ? editando.id : undefined);
            toast.success(res.message);
            setEditando(null);
            setDetalle(res.receta);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar la receta'));
        } finally {
            setGuardando(false);
        }
    };

    const cambiarVersion = async (id: number) => {
        try {
            const res = await activarReceta(id, true);
            toast.success(res.message);
            setDetalle(res.receta);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo activar la versión'));
        }
    };

    const conReceta = new Set((recetas ?? []).map(r => r.producto_id));

    return (
        <div className="p-6">
            {editando && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-xl space-y-4 max-h-[94vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold">{editando === 'nueva' ? 'Nueva receta' : `Editar receta de ${editando.producto}`}</h2>
                        {editando !== 'nueva' && <p className="text-sm text-gray-500">Si esta receta ya se usó en producciones, al guardar se crea la versión {editando.version + 1} y la actual queda en el historial.</p>}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Producto" required>
                                <SelectBuscador value={productoId} disabled={editando !== 'nueva'} onChange={setProductoId}
                                    placeholder="Escribí para buscar..."
                                    opciones={productos.filter(p => p.clase !== 'materia_prima' && (editando !== 'nueva' || !conReceta.has(p.id))).map(p => ({ value: p.id, label: p.nombre }))} />
                            </FormField>
                            <FormField label={`Rendimiento${producto?.unidad ? ` (${producto.unidad})` : ''}`} required
                                hint={deVenta ? 'Para cuántas unidades vendidas alcanzan los ingredientes (normalmente 1)' : 'Cuánto sale de una tanda'}>
                                <MoneyInput decimals={producto?.permite_fraccion ? 3 : 0} placeholder="100" value={rendimiento} onChange={setRendimiento} />
                            </FormField>
                        </div>

                        {producto && (
                            <p className={`rounded-lg px-3 py-2 text-sm ${deVenta ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>
                                {deVenta
                                    ? `Receta de venta: cada vez que se venda ${producto.nombre} se descuentan estos insumos del inventario${producto.consumo_interno ? ' (consumo interno, a $0.00)' : ''}.`
                                    : `Receta de producción: al registrar la producción se descuentan los insumos y suma existencia de ${producto.nombre}.`}
                            </p>
                        )}

                        <FormField label="Ingredientes" required>
                            <div className="relative">
                                <input className={inputClass} value={busquedaInsumo} onChange={e => setBusquedaInsumo(e.target.value)} placeholder="Buscar materia prima para agregar" />
                                {insumosSugeridos.length > 0 && (
                                    <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                        {insumosSugeridos.map(p => (
                                            <button key={p.id} type="button"
                                                onClick={() => { setLineas(ls => [...ls, { clave: `${p.id}-${Date.now()}`, producto_id: p.id, unidad_medida_id: p.unidad_medida_id, cantidad: '', merma: '' }]); setBusquedaInsumo(''); }}
                                                className="flex w-full justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50">
                                                <span>{p.nombre} <span className="text-xs text-gray-400">{p.unidad}</span></span>
                                                <span className="text-gray-500">{costo4(p.costo_unitario)}/{p.unidad}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </FormField>

                        {lineas.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                        <tr><th className="px-3 py-2">Ingrediente</th><th className="px-3 py-2 w-28">Cantidad</th><th className="px-3 py-2 w-32">Unidad</th>
                                            <th className="px-3 py-2 w-24">% merma</th><th className="px-3 py-2 w-24 text-right">Costo</th><th className="w-10"></th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lineas.map((l, n) => {
                                            const insumo = productos.find(p => p.id === l.producto_id);
                                            const fila = costeo.filas[n];
                                            return (
                                                <tr key={l.clave} className="align-top">
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium">{insumo?.nombre}</p>
                                                        {fila && fila.enBase > 0 && <p className="text-xs text-gray-500">{cantidad(Math.round(fila.enBase * 1000) / 1000, fila.unidadBase)} del inventario</p>}
                                                    </td>
                                                    <td className="px-3 py-2"><MoneyInput decimals={3} placeholder="0" value={l.cantidad} onChange={v => setLineas(ls => ls.map(x => x.clave === l.clave ? { ...x, cantidad: v } : x))} /></td>
                                                    <td className="px-3 py-2">
                                                        <select className={`${inputClass} !px-2`} value={l.unidad_medida_id ?? ''} onChange={e => setLineas(ls => ls.map(x => x.clave === l.clave ? { ...x, unidad_medida_id: Number(e.target.value) } : x))}>
                                                            {unidades.filter(u => !insumo?.unidad_tipo || u.tipo === insumo.unidad_tipo).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2"><MoneyInput suffix="%" placeholder="0" value={l.merma} onChange={v => setLineas(ls => ls.map(x => x.clave === l.clave ? { ...x, merma: v } : x))} /></td>
                                                    <td className="px-3 py-2 pt-4 text-right">{dinero(fila?.costo ?? 0)}</td>
                                                    <td className="px-1 py-2"><button type="button" onClick={() => setLineas(ls => ls.filter(x => x.clave !== l.clave))} className="mt-1 h-9 w-9 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar">✕</button></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-end gap-6 rounded-lg bg-gray-50 p-3 text-sm">
                            <span>Costo de la tanda: <strong>{dinero(costeo.total)}</strong></span>
                            <span>Costo por {producto?.unidad ?? 'unidad'}: <strong>{costo4(costeo.unitario)}</strong></span>
                            {producto && producto.precio_venta > 0 && costeo.unitario > 0 && (
                                <span>Margen: <strong className={costeo.unitario > producto.precio_venta ? 'text-red-600' : 'text-green-700'}>
                                    {Math.round((producto.precio_venta - costeo.unitario) / producto.precio_venta * 1000) / 10}%</strong> (precio {dinero(producto.precio_venta)})</span>
                            )}
                        </div>

                        <FormField label="Procedimiento y notas">
                            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} maxLength={1000}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                        </FormField>

                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditando(null)} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button type="button" onClick={guardar}
                                disabled={guardando || !productoId || Number(rendimiento || 0) <= 0 || lineas.length === 0 || lineas.some(l => Number(l.cantidad || 0) <= 0)}
                                className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                                {guardando ? 'Guardando...' : 'Guardar receta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detalle && !editando && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold">{detalle.producto}</h2>
                                <p className="text-sm text-gray-500">{detalle.uso === 'venta' ? 'Se descuenta al vender' : 'De producción'} · versión {detalle.version} · rinde {cantidad(detalle.rendimiento, detalle.unidad)} · {detalle.usuario} · {detalle.actualizada}</p>
                            </div>
                            <StatusBadge tone={detalle.activa ? 'success' : 'neutral'}>{detalle.activa ? 'Activa' : 'Inactiva'}</StatusBadge>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                    <tr><th className="px-3 py-2">Ingrediente</th><th className="px-3 py-2 text-right">Cantidad</th><th className="px-3 py-2 text-right">Merma</th>
                                        <th className="px-3 py-2 text-right">Costo unitario</th><th className="px-3 py-2 text-right">Costo</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {detalle.ingredientes?.map(i => (
                                        <tr key={i.id}>
                                            <td className="px-3 py-2">{i.producto}</td>
                                            <td className="px-3 py-2 text-right">{cantidad(i.cantidad, i.unidad)}</td>
                                            <td className="px-3 py-2 text-right">{i.merma_porcentaje ? `${i.merma_porcentaje}%` : '—'}</td>
                                            <td className="px-3 py-2 text-right">{costo4(i.costo_unitario)}/{i.unidad_base}</td>
                                            <td className="px-3 py-2 text-right">{dinero(i.costo)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap justify-end gap-6 text-sm">
                            <span>Tanda: <strong>{dinero(detalle.costo_total)}</strong></span>
                            <span>Por {detalle.unidad ?? 'unidad'}: <strong>{costo4(detalle.costo_unitario)}</strong></span>
                            {detalle.margen !== null && <span>Margen: <strong className={detalle.margen < 0 ? 'text-red-600' : 'text-green-700'}>{detalle.margen}%</strong></span>}
                        </div>
                        {detalle.notas && <p className="whitespace-pre-line rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{detalle.notas}</p>}
                        {(detalle.versiones?.length ?? 0) > 1 && (
                            <div className="text-sm">
                                <p className="mb-1 font-semibold text-gray-700">Versiones</p>
                                <div className="flex flex-wrap gap-2">
                                    {detalle.versiones!.map(v => (
                                        <button key={v.id} type="button" onClick={() => v.id !== detalle.id && abrir(v.id)}
                                            className={`rounded-lg px-3 py-1.5 ${v.id === detalle.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                            v{v.version}{v.activa ? ' (activa)' : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            {hasPermission('produccion.registrar') && detalle.activa && (
                                <button type="button" onClick={() => navigate(`/produccion?receta=${detalle.id}`)} className="px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg">Producir</button>
                            )}
                            {puedeEditar && !detalle.activa && (
                                <button type="button" onClick={() => cambiarVersion(detalle.id)} className="px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg">Usar esta versión</button>
                            )}
                            {puedeEditar && detalle.activa && (
                                <button type="button" onClick={() => editar(detalle)} className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Editar</button>
                            )}
                            <button type="button" onClick={() => setDetalle(null)} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader title="Recetas" subtitle="Ingredientes por tanda y costo con el precio promedio de hoy"
                actions={puedeEditar && <button type="button" onClick={() => editar(null)} className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">+ Nueva receta</button>} />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <input className={`${inputClass} max-w-sm`} placeholder="Buscar receta o producto" value={buscar} onChange={e => setBuscar(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                    {([['', 'Todas'], ['venta', 'Se descuentan al vender'], ['produccion', 'Producción']] as const).map(([valor, texto]) => (
                        <button key={valor} type="button" onClick={() => setUso(valor)}
                            className={`h-[42px] rounded-lg px-4 text-sm font-medium ${uso === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {texto}{recetas ? ` (${recetas.filter(r => !valor || (valor === 'venta' ? r.uso === 'venta' : r.uso !== 'venta')).length})` : ''}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3 text-right">Rinde</th><th className="px-4 py-3 text-right">Costo tanda</th>
                            <th className="px-4 py-3 text-right">Costo unitario</th><th className="px-4 py-3 text-right">Precio</th><th className="px-4 py-3 text-right">Margen</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!recetas && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>}
                        {visibles?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay recetas</td></tr>}
                        {visibles?.map(r => (
                            <tr key={r.id} onClick={() => abrir(r.id)} className="cursor-pointer hover:bg-gray-50">
                                <td className="px-4 py-3"><p className="font-medium">{r.producto}</p><p className="text-xs text-gray-500">v{r.version} · {r.uso === 'venta' ? 'se descuenta al vender' : 'producción'}</p></td>
                                <td className="px-4 py-3 text-right">{cantidad(r.rendimiento, r.unidad)}</td>
                                <td className="px-4 py-3 text-right">{dinero(r.costo_total)}</td>
                                <td className="px-4 py-3 text-right font-semibold">{costo4(r.costo_unitario)}</td>
                                <td className="px-4 py-3 text-right">{r.precio_venta > 0 ? dinero(r.precio_venta) : '—'}</td>
                                <td className={`px-4 py-3 text-right font-semibold ${r.margen !== null && r.margen < 20 ? 'text-red-600' : 'text-green-700'}`}>{r.margen !== null ? `${r.margen}%` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
