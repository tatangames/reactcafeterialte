import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import FormField, { inputClass } from '../../../components/form/FormField';
import MoneyInput from '../../../components/form/MoneyInput';
import { useCaja } from '../../../context/CajaContext';
import {
    AreaConfigInterface, asignarCategorias, getAreasConfig, getGruposConfig, getTerminalesConfig, GrupoConfigInterface, guardarArea, guardarGrupo,
    guardarTerminal, TerminalConfigInterface,
} from '../../../services/mesas';
import { dinero, mensajeError } from '../../../utils/formato';

type Pestana = 'terminales' | 'areas' | 'modificadores';
const TIPOS = { mesa: 'Mesa', caja: 'Caja de mostrador', llevar: 'Para llevar' };

function Ventana({ titulo, children, onCerrar, onGuardar, guardando, ancho = 'max-w-md' }: {
    titulo: string; children: React.ReactNode; onCerrar: () => void; onGuardar: () => void; guardando: boolean; ancho?: string;
}) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className={`max-h-[92vh] w-full ${ancho} space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl`}>
                <h2 className="text-lg font-semibold">{titulo}</h2>
                {children}
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm hover:bg-gray-200">Cancelar</button>
                    <button type="button" onClick={onGuardar} disabled={guardando} className="rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MesasConfig() {
    const { catalogos } = useCaja();
    const [pestana, setPestana] = useState<Pestana>('terminales');
    const [guardando, setGuardando] = useState(false);

    // Terminales
    const [terminales, setTerminales] = useState<TerminalConfigInterface[]>([]);
    const [zonas, setZonas] = useState<string[]>([]);
    const [terminal, setTerminal] = useState<Partial<TerminalConfigInterface> | null>(null);

    // Áreas
    const [areas, setAreas] = useState<AreaConfigInterface[]>([]);
    const [impresoras, setImpresoras] = useState<{ id: number; nombre: string; uso: string }[]>([]);
    const [categorias, setCategorias] = useState<{ id: number; nombre: string; area_preparacion_id: number | null }[]>([]);
    const [area, setArea] = useState<(Omit<AreaConfigInterface, 'id'> & { id?: number }) | null>(null);

    // Modificadores
    const [grupos, setGrupos] = useState<GrupoConfigInterface[]>([]);
    const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
    const [grupo, setGrupo] = useState<{
        id?: number; nombre: string; obligatorio: boolean; multiple: boolean; activo: boolean;
        opciones: { id?: number; nombre: string; precio: string }[]; productos: number[];
    } | null>(null);
    const [buscarProducto, setBuscarProducto] = useState('');

    const cargar = useCallback(() => {
        getTerminalesConfig().then(r => { setTerminales(r.terminales); setZonas(r.zonas); }).catch(e => toast.error(mensajeError(e, 'Error al cargar terminales')));
        getAreasConfig().then(r => { setAreas(r.areas); setImpresoras(r.impresoras); setCategorias(r.categorias); }).catch(() => null);
        getGruposConfig().then(r => { setGrupos(r.grupos); setProductos(r.productos); }).catch(() => null);
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const guardar = async (accion: () => Promise<{ message: string }>, cerrar: () => void) => {
        setGuardando(true);
        try {
            const r = await accion();
            toast.success(r.message);
            cerrar();
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="p-6">
            <PageHeader title="Mesas y cocina" subtitle="Terminales del mapa, áreas de preparación y extras de los productos" />

            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
                {([['terminales', 'Terminales'], ['areas', 'Áreas de preparación'], ['modificadores', 'Modificadores']] as const).map(([clave, texto]) => (
                    <button key={clave} type="button" onClick={() => setPestana(clave)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${pestana === clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{texto}</button>
                ))}
            </div>

            {/* ── Terminales ── */}
            {pestana === 'terminales' && (
                <>
                    <button type="button" onClick={() => setTerminal({ nombre: '', tipo: 'mesa', zona: zonas[0] ?? 'Salón', capacidad: 4, orden: terminales.length + 1, activo: true })}
                        className="mb-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nueva terminal</button>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="px-4 py-3">Orden</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Zona</th>
                                    <th className="px-4 py-3 text-right">Personas</th><th className="px-4 py-3">Estado</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {terminales.map(t => (
                                    <tr key={t.id} onClick={() => setTerminal(t)} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500">{t.orden}</td>
                                        <td className="px-4 py-3 font-medium">{t.nombre}</td>
                                        <td className="px-4 py-3">{TIPOS[t.tipo]}{t.caja ? ` · ${t.caja}` : ''}</td>
                                        <td className="px-4 py-3">{t.zona ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{t.tipo === 'mesa' ? t.capacidad : '—'}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge tone={!t.activo ? 'neutral' : t.ocupada ? 'warning' : 'success'}>{!t.activo ? 'Inactiva' : t.ocupada ? 'Ocupada' : 'Activa'}</StatusBadge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {terminal && (
                <Ventana titulo={terminal.id ? `Editar ${terminal.nombre}` : 'Nueva terminal'} guardando={guardando} onCerrar={() => setTerminal(null)}
                    onGuardar={() => guardar(() => guardarTerminal({
                        nombre: terminal.nombre?.trim(), tipo: terminal.tipo, zona: terminal.zona || null, capacidad: Number(terminal.capacidad ?? 0),
                        orden: Number(terminal.orden ?? 0), caja_id: terminal.tipo === 'caja' ? terminal.caja_id ?? catalogos?.cajas[0]?.id ?? null : null, activo: terminal.activo,
                    }, terminal.id), () => setTerminal(null))}>
                    <FormField label="Nombre" required>
                        <input className={inputClass} value={terminal.nombre ?? ''} maxLength={60} autoFocus onChange={e => setTerminal(t => t && { ...t, nombre: e.target.value })} />
                    </FormField>
                    <FormField label="Tipo">
                        <select className={inputClass} value={terminal.tipo} onChange={e => setTerminal(t => t && { ...t, tipo: e.target.value as TerminalConfigInterface['tipo'] })}>
                            {Object.entries(TIPOS).map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
                        </select>
                    </FormField>
                    {terminal.tipo === 'caja' && (
                        <FormField label="Caja" hint="Abre la venta rápida de mostrador">
                            <select className={inputClass} value={terminal.caja_id ?? catalogos?.cajas[0]?.id ?? ''} onChange={e => setTerminal(t => t && { ...t, caja_id: Number(e.target.value) })}>
                                {catalogos?.cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </FormField>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                        <FormField label="Zona">
                            <input className={inputClass} list="zonas" value={terminal.zona ?? ''} maxLength={60} onChange={e => setTerminal(t => t && { ...t, zona: e.target.value })} />
                            <datalist id="zonas">{zonas.map(z => <option key={z} value={z} />)}</datalist>
                        </FormField>
                        <FormField label="Personas">
                            <MoneyInput decimals={0} placeholder="4" value={String(terminal.capacidad ?? '')} onChange={v => setTerminal(t => t && { ...t, capacidad: Number(v || 0) })} />
                        </FormField>
                        <FormField label="Orden">
                            <MoneyInput decimals={0} placeholder="1" value={String(terminal.orden ?? '')} onChange={v => setTerminal(t => t && { ...t, orden: Number(v || 0) })} />
                        </FormField>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4" checked={terminal.activo ?? true} onChange={e => setTerminal(t => t && { ...t, activo: e.target.checked })} /> Activa
                    </label>
                </Ventana>
            )}

            {/* ── Áreas ── */}
            {pestana === 'areas' && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
                    <section className="space-y-3">
                        <p className="text-sm text-gray-600">
                            Cada área sale en su propio ticket impreso («COCINA», «BARRA») y tiene su pantalla de comandas.
                            Si el área no tiene impresora, el ticket sale en la de comandas o en la de tickets.
                        </p>
                        <button type="button" onClick={() => setArea({ nombre: '', color: '#7c3aed', impresora_id: null, activo: true })}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nueva área</button>
                        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                            {areas.map(a => (
                                <li key={a.id} onClick={() => setArea(a)} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50">
                                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: a.color }} />
                                    <span className="flex-1">
                                        <span className="block font-medium">{a.nombre}</span>
                                        <span className="block text-xs text-gray-500">🖨 {impresoras.find(i => i.id === a.impresora_id)?.nombre ?? 'Impresora general'}</span>
                                    </span>
                                    {!a.activo && <StatusBadge tone="neutral">Inactiva</StatusBadge>}
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="space-y-3">
                        <p className="text-sm text-gray-600">A qué área va la comanda de cada categoría. Todo sale en comanda: si el pan de vitrina lo despacha otra persona, crea un área para ella (por ejemplo, «Vitrina»).</p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Se prepara en</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {categorias.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-4 py-2 font-medium">{c.nombre}</td>
                                            <td className="px-4 py-2">
                                                <select className={`${inputClass} !w-auto ${c.area_preparacion_id ? '' : '!border-amber-400'}`} value={c.area_preparacion_id ?? ''}
                                                    onChange={e => setCategorias(cs => cs.map(x => x.id === c.id ? { ...x, area_preparacion_id: e.target.value ? Number(e.target.value) : null } : x))}>
                                                    <option value="" disabled>Elegir área…</option>
                                                    {areas.filter(a => a.activo).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {categorias.some(c => !c.area_preparacion_id) && (
                            <p className="text-sm text-amber-700">Las categorías sin área salen en una comanda general hasta que les asignes una.</p>
                        )}
                        <button type="button" disabled={guardando || categorias.some(c => !c.area_preparacion_id)}
                            onClick={() => guardar(() => asignarCategorias(categorias.map(c => ({ categoria_id: c.id, area_id: c.area_preparacion_id }))), () => null)}
                            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">Guardar áreas de las categorías</button>
                    </section>
                </div>
            )}

            {area && (
                <Ventana titulo={area.id ? `Editar ${area.nombre}` : 'Nueva área'} guardando={guardando} onCerrar={() => setArea(null)}
                    onGuardar={() => guardar(() => guardarArea({ nombre: area.nombre.trim(), color: area.color, impresora_id: area.impresora_id, activo: area.activo }, area.id), () => setArea(null))}>
                    <FormField label="Nombre" required>
                        <input className={inputClass} value={area.nombre} maxLength={60} autoFocus onChange={e => setArea(a => a && { ...a, nombre: e.target.value })} />
                    </FormField>
                    <FormField label="Color">
                        <input type="color" className="h-11 w-24 rounded-lg border border-gray-300" value={area.color} onChange={e => setArea(a => a && { ...a, color: e.target.value })} />
                    </FormField>
                    <FormField label="Impresora de sus tickets">
                        <select className={inputClass} value={area.impresora_id ?? ''}
                            onChange={e => setArea(a => a && { ...a, impresora_id: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">General (la de comandas o la de tickets)</option>
                            {impresoras.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                        </select>
                    </FormField>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="h-4 w-4" checked={area.activo} onChange={e => setArea(a => a && { ...a, activo: e.target.checked })} /> Activa
                    </label>
                </Ventana>
            )}

            {/* ── Modificadores ── */}
            {pestana === 'modificadores' && (
                <>
                    <button type="button" onClick={() => setGrupo({ nombre: '', obligatorio: false, multiple: false, activo: true, opciones: [{ nombre: '', precio: '' }], productos: [] })}
                        className="mb-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nuevo grupo</button>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {grupos.length === 0 && <p className="text-sm text-gray-500">Aún no hay modificadores. Crea grupos como «Leche», «Saborizante» o «Tamaño».</p>}
                        {grupos.map(g => (
                            <button key={g.id} type="button" onClick={() => setGrupo({
                                id: g.id, nombre: g.nombre, obligatorio: g.obligatorio, multiple: g.multiple, activo: g.activo,
                                opciones: g.opciones.filter(o => o.activo).map(o => ({ id: o.id, nombre: o.nombre, precio: o.precio ? String(o.precio) : '' })),
                                productos: g.productos.map(p => p.id),
                            })} className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{g.nombre}</p>
                                    {!g.activo && <StatusBadge tone="neutral">Inactivo</StatusBadge>}
                                </div>
                                <p className="text-xs text-gray-500">{g.obligatorio ? 'Obligatorio' : 'Opcional'} · {g.multiple ? 'varias opciones' : 'una opción'}</p>
                                <p className="mt-2 text-sm text-gray-700">{g.opciones.filter(o => o.activo).map(o => o.precio > 0 ? `${o.nombre} (+${dinero(o.precio)})` : o.nombre).join(', ')}</p>
                                <p className="mt-1 text-xs text-gray-500">{g.productos.length} producto(s)</p>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {grupo && (
                <Ventana titulo={grupo.id ? `Editar ${grupo.nombre}` : 'Nuevo grupo de modificadores'} ancho="max-w-2xl" guardando={guardando} onCerrar={() => setGrupo(null)}
                    onGuardar={() => guardar(() => guardarGrupo({
                        nombre: grupo.nombre.trim(), obligatorio: grupo.obligatorio, multiple: grupo.multiple, activo: grupo.activo,
                        opciones: grupo.opciones.filter(o => o.nombre.trim()).map(o => ({ id: o.id, nombre: o.nombre.trim(), precio: Number(o.precio || 0) })),
                        productos: grupo.productos,
                    }, grupo.id), () => setGrupo(null))}>
                    <FormField label="Nombre" required>
                        <input className={inputClass} value={grupo.nombre} maxLength={80} autoFocus placeholder="Leche, Saborizante, Tamaño..." onChange={e => setGrupo(g => g && { ...g, nombre: e.target.value })} />
                    </FormField>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={grupo.obligatorio} onChange={e => setGrupo(g => g && { ...g, obligatorio: e.target.checked })} /> Obligatorio</label>
                        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={grupo.multiple} onChange={e => setGrupo(g => g && { ...g, multiple: e.target.checked })} /> Se pueden elegir varias</label>
                        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={grupo.activo} onChange={e => setGrupo(g => g && { ...g, activo: e.target.checked })} /> Activo</label>
                    </div>
                    <FormField label="Opciones" required hint="Precio extra en blanco: no cambia el precio">
                        <div className="space-y-2">
                            {grupo.opciones.map((o, n) => (
                                <div key={n} className="flex gap-2">
                                    <input className={inputClass} value={o.nombre} maxLength={80} placeholder="Ej.: Deslactosada"
                                        onChange={e => setGrupo(g => g && { ...g, opciones: g.opciones.map((x, i) => i === n ? { ...x, nombre: e.target.value } : x) })} />
                                    <MoneyInput prefix="+$" className="!w-32 shrink-0" value={o.precio}
                                        onChange={v => setGrupo(g => g && { ...g, opciones: g.opciones.map((x, i) => i === n ? { ...x, precio: v } : x) })} />
                                    <button type="button" onClick={() => setGrupo(g => g && { ...g, opciones: g.opciones.filter((_, i) => i !== n) })}
                                        className="h-[42px] w-10 shrink-0 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar opción">✕</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setGrupo(g => g && { ...g, opciones: [...g.opciones, { nombre: '', precio: '' }] })}
                                className="text-sm font-medium text-blue-600 hover:underline">+ Agregar opción</button>
                        </div>
                    </FormField>
                    <FormField label={`Productos que lo usan (${grupo.productos.length})`}>
                        <input className={`${inputClass} mb-2`} value={buscarProducto} onChange={e => setBuscarProducto(e.target.value)} placeholder="Buscar producto" />
                        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                            {productos.filter(p => p.nombre.toLowerCase().includes(buscarProducto.trim().toLowerCase())).map(p => (
                                <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                                    <input type="checkbox" className="h-4 w-4" checked={grupo.productos.includes(p.id)}
                                        onChange={e => setGrupo(g => g && { ...g, productos: e.target.checked ? [...g.productos, p.id] : g.productos.filter(x => x !== p.id) })} />
                                    {p.nombre}
                                </label>
                            ))}
                        </div>
                    </FormField>
                </Ventana>
            )}
        </div>
    );
}
