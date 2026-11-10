import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import PageHeader from '../../../components/common/PageHeader';
import StatusBadge from '../../../components/common/StatusBadge';
import FormField, { inputClass } from '../../../components/form/FormField';
import MoneyInput from '../../../components/form/MoneyInput';
import { useCaja } from '../../../context/CajaContext';
import {
    AreaConfigInterface, asignarCategorias, borrarArea, borrarTerminal, getAreasConfig, getTerminalesConfig, guardarArea,
    guardarTerminal, ordenarTerminales, TerminalConfigInterface,
} from '../../../services/mesas';
import { mensajeError } from '../../../utils/formato';
import ConfirmDeleteModal from '../../../components/modal/ConfirmDeleteModal';
import Cargando, { FilaCargando } from '../../../components/ui/loading/Cargando';

type Pestana = 'terminales' | 'areas';
const TIPOS = { mesa: 'Mesa', caja: 'Caja de mostrador' };

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
    const [cargado, setCargado] = useState(false);
    const [zonas, setZonas] = useState<string[]>([]);
    const [terminal, setTerminal] = useState<Partial<TerminalConfigInterface> | null>(null);
    const [arrastrando, setArrastrando] = useState<number | null>(null);

    // Áreas
    const [areas, setAreas] = useState<AreaConfigInterface[]>([]);
    const [impresoras, setImpresoras] = useState<{ id: number; nombre: string; uso: string }[]>([]);
    const [categorias, setCategorias] = useState<{ id: number; nombre: string; area_preparacion_id: number | null }[]>([]);
    const [area, setArea] = useState<(Omit<AreaConfigInterface, 'id'> & { id?: number }) | null>(null);

    // Borrar: solo terminales y áreas que nunca se usaron (el botón no aparece en las usadas)
    const [borrando, setBorrando] = useState<{ tipo: 'terminal' | 'area'; id: number; nombre: string } | null>(null);
    const confirmarBorrado = () => {
        if (!borrando) return;
        const { tipo, id } = borrando;
        guardar(() => (tipo === 'terminal' ? borrarTerminal(id) : borrarArea(id)), () => setBorrando(null));
    };
    const botonBorrar = (tipo: 'terminal' | 'area', id: number, nombre: string) => (
        <button type="button" onClick={e => { e.stopPropagation(); setBorrando({ tipo, id, nombre }); }}
            className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-100">Borrar</button>
    );


    const cargar = useCallback(() => {
        getTerminalesConfig().then(r => { setTerminales(r.terminales); setZonas(r.zonas); }).catch(e => toast.error(mensajeError(e, 'Error al cargar terminales'))).finally(() => setCargado(true));
        getAreasConfig().then(r => { setAreas(r.areas); setImpresoras(r.impresoras); setCategorias(r.categorias); }).catch(() => null);
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

    // Mientras se arrastra, la fila se mueve en la tabla; al soltar se guarda la nueva posición
    const moverTerminal = (sobre: number) => {
        if (arrastrando === null || arrastrando === sobre) return;
        setTerminales(ts => {
            const desde = ts.findIndex(t => t.id === arrastrando);
            const hasta = ts.findIndex(t => t.id === sobre);
            const copia = [...ts];
            copia.splice(hasta, 0, ...copia.splice(desde, 1));
            return copia;
        });
    };

    const soltarTerminal = async () => {
        if (arrastrando === null) return;
        setArrastrando(null);
        try {
            await ordenarTerminales(terminales.map(t => t.id));
            setTerminales(ts => ts.map((t, n) => ({ ...t, orden: n + 1 })));
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar el orden'));
            cargar();
        }
    };

    return (
        <div className="p-6">
            <PageHeader title="Mesas y cocina" subtitle="Terminales del mapa y áreas de preparación (los extras están en Catálogo de productos › Modificadores)" />

            <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200">
                {([['terminales', 'Terminales'], ['areas', 'Áreas de preparación']] as const).map(([clave, texto]) => (
                    <button key={clave} type="button" onClick={() => setPestana(clave)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${pestana === clave ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{texto}</button>
                ))}
            </div>

            {/* ── Terminales ── */}
            {pestana === 'terminales' && (
                <>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => setTerminal({ nombre: '', tipo: 'mesa', zona: zonas[0] ?? 'Salón', capacidad: 4, activo: true })}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nueva terminal</button>
                        <p className="text-sm text-gray-500">Arrastra las filas para cambiar el orden en que salen en el mapa.</p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                                <tr><th className="w-10 px-2 py-3" /><th className="px-4 py-3">Posición</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Zona</th>
                                    <th className="px-4 py-3 text-right">Personas</th><th className="px-4 py-3">Estado</th><th className="w-24 px-4 py-3" /></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {!cargado && <FilaCargando colSpan={8} />}
                                {terminales.map((t, n) => (
                                    <tr key={t.id} onClick={() => setTerminal(t)} draggable
                                        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setArrastrando(t.id); }}
                                        onDragOver={e => { e.preventDefault(); moverTerminal(t.id); }}
                                        onDrop={e => e.preventDefault()}
                                        onDragEnd={soltarTerminal}
                                        className={`cursor-pointer hover:bg-gray-50 ${arrastrando === t.id ? 'bg-blue-50 opacity-60' : ''}`}>
                                        <td className="cursor-grab px-2 py-3 text-center text-gray-400 active:cursor-grabbing" title="Arrastrar para mover">⠿</td>
                                        <td className="px-4 py-3 text-gray-500">{n + 1}</td>
                                        <td className="px-4 py-3 font-medium">{t.nombre}</td>
                                        <td className="px-4 py-3">{TIPOS[t.tipo]}{t.caja ? ` · ${t.caja}` : ''}</td>
                                        <td className="px-4 py-3">{t.zona ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">{t.tipo === 'mesa' ? t.capacidad : '—'}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge tone={!t.activo ? 'neutral' : t.ocupada ? 'warning' : 'success'}>{!t.activo ? 'Inactiva' : t.ocupada ? 'Ocupada' : 'Activa'}</StatusBadge>
                                        </td>
                                        <td className="px-4 py-3 text-right">{!t.usada && botonBorrar('terminal', t.id, t.nombre)}</td>
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
                        caja_id: terminal.tipo === 'caja' ? terminal.caja_id ?? catalogos?.cajas[0]?.id ?? null : null, activo: terminal.activo,
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
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Zona">
                            <input className={inputClass} list="zonas" value={terminal.zona ?? ''} maxLength={60} onChange={e => setTerminal(t => t && { ...t, zona: e.target.value })} />
                            <datalist id="zonas">{zonas.map(z => <option key={z} value={z} />)}</datalist>
                        </FormField>
                        <FormField label="Personas">
                            <MoneyInput decimals={0} placeholder="4" value={String(terminal.capacidad ?? '')} onChange={v => setTerminal(t => t && { ...t, capacidad: Number(v || 0) })} />
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
                            {!cargado && <li><Cargando /></li>}
                            {areas.map(a => (
                                <li key={a.id} onClick={() => setArea(a)} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50">
                                    <span className="h-5 w-5 rounded-full" style={{ backgroundColor: a.color }} />
                                    <span className="flex-1">
                                        <span className="block font-medium">{a.nombre}</span>
                                        <span className="block text-xs text-gray-500">🖨 {impresoras.find(i => i.id === a.impresora_id)?.nombre ?? 'Impresora general'}</span>
                                    </span>
                                    {!a.activo && <StatusBadge tone="neutral">Inactiva</StatusBadge>}
                                    {!a.usada && botonBorrar('area', a.id, a.nombre)}
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section className="space-y-3">
                        <p className="text-sm text-gray-600">A qué área va la comanda de cada categoría. Lo que ya está hecho y se entrega directo (pan de vitrina, postres de vitrina, bebidas embotelladas) va en «Sin comanda»: solo sale el ticket de venta.</p>
                        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Se prepara en</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {categorias.map(c => (
                                        <tr key={c.id}>
                                            <td className="px-4 py-2 font-medium">{c.nombre}</td>
                                            <td className="px-4 py-2">
                                                <select className={`${inputClass} !w-auto`} value={c.area_preparacion_id ?? ''}
                                                    onChange={e => setCategorias(cs => cs.map(x => x.id === c.id ? { ...x, area_preparacion_id: e.target.value ? Number(e.target.value) : null } : x))}>
                                                    <option value="">Sin comanda (se entrega directo)</option>
                                                    {areas.filter(a => a.activo).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" disabled={guardando}
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

            <ConfirmDeleteModal
                isOpen={!!borrando}
                onClose={() => setBorrando(null)}
                onConfirm={confirmarBorrado}
                isDeleting={guardando}
                title={borrando?.tipo === 'area' ? 'Borrar área' : 'Borrar terminal'}
                description={borrando?.tipo === 'area' ? 'Nunca ha recibido comandas. Se borra definitivamente.' : 'Nunca ha tenido órdenes. Se borra definitivamente.'}
                itemName={borrando?.nombre ?? ''}
            />
        </div>
    );
}
