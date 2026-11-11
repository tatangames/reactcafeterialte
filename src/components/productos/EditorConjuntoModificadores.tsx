import { useState } from 'react';
import toast from 'react-hot-toast';

import { inputClass } from '../form/FormField';
import MoneyInput from '../form/MoneyInput';
import SelectBuscador from '../form/SelectBuscador';
import {
    BloqueGuardar, ConjuntoConfigInterface, guardarModificadoresProducto, InsumoModificadorInterface, UnidadModificadorInterface,
} from '../../services/mesas';
import { mensajeError } from '../../utils/formato';
import { minimoDe, reglaTexto } from '../../utils/modificadores';

// Una opción del formulario: el insumo es opcional (Revueltos no gasta nada; Fresa gasta 30 g)
// maximo: cuántas veces se puede pedir en un mismo producto (Huevo extra hasta 3); 1 = se marca o no
// obligatorio: siempre va; exclusiva: «una sola», al elegirla se quitan las demás; activo: apagada no sale al vender
type OpcionForm = {
    id?: number; nombre: string; precio: string; maximo: string; obligatorio: boolean; exclusiva: boolean; activo: boolean;
    producto_id: string; cantidad: string; unidad_medida_id: string;
};
type BloqueForm = { clave: string; id?: number; nombre: string; minimo: string; maximo: string; opciones: OpcionForm[] };

const opcionVacia = (): OpcionForm => ({ nombre: '', precio: '', maximo: '1', obligatorio: false, exclusiva: false, activo: true, producto_id: '', cantidad: '', unidad_medida_id: '' });
let siguiente = 0;
const bloqueVacio = (): BloqueForm => ({ clave: `n${++siguiente}`, nombre: '', minimo: '', maximo: '', opciones: [opcionVacia()] });

// copia: los bloques de otro producto sin sus ids, así se guardan como propios
const aBloques = (c: ConjuntoConfigInterface | null, copia = false): BloqueForm[] =>
    c ? c.bloques.map((g): BloqueForm => ({
        clave: `n${++siguiente}`, id: copia || g.id < 0 ? undefined : g.id, nombre: g.nombre,
        minimo: minimoDe(g) ? String(minimoDe(g)) : '', maximo: g.maximo ? String(g.maximo) : '',
        opciones: g.opciones.filter(o => !copia || o.activo).map(o => ({
            id: copia || o.id < 0 ? undefined : o.id, nombre: o.nombre, precio: o.precio ? String(o.precio) : '', maximo: String(o.maximo ?? 1),
            obligatorio: !!o.obligatorio, exclusiva: !!o.exclusiva, activo: o.activo,
            producto_id: o.producto_id ? String(o.producto_id) : '', cantidad: o.cantidad ? String(o.cantidad) : '',
            unidad_medida_id: o.unidad_medida_id ? String(o.unidad_medida_id) : '',
        })),
    })) : [bloqueVacio()];

// «¿Cómo funciona?»: tarjeta, bloques y opciones, con ejemplos
function Ayuda() {
    return (
        <div className="space-y-2 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            <p>Los modificadores de cada producto van en <b>bloques</b>, como en las apps de delivery. Ej.: el Chocolate con <b>1. Tipo de leche</b> (requerido, elige 1), <b>2. Azúcar</b> (opcional, máximo 1) y <b>3. Extras</b> (opcional). Son <b>solo de este producto</b>: cambiarlos no toca a ningún otro.</p>
            <p><b>Requerido:</b> no deja agregar el producto hasta elegir el mínimo. <b>Opcional:</b> se puede dejar sin elegir. Mínimo y máximo cuentan las opciones del bloque en total, contando cada vez que se repite una. Con máximo 1, tocar otra opción la cambia.</p>
            <p><b>Precio extra:</b> se suma al producto (Deslactosada +$0.25). En blanco: gratis. <b>Insumo:</b> lo que se descuenta del inventario al venderse con esa opción (Leche entera 250 ml).</p>
            <p>Casillas de cada opción: <b>Obligatorio</b> siempre va marcada; <b>Una sola</b> al elegirla quita todas las demás del bloque; <b>Activa</b> apagada no sale al vender.</p>
        </div>
    );
}

interface Props {
    producto: { id: number | null; nombre: string };  // id null: producto nuevo, todavía sin guardar
    conjunto: ConjuntoConfigInterface | null;          // sus modificadores actuales (null: aún no tiene)
    insumos: InsumoModificadorInterface[];
    unidades: UnidadModificadorInterface[];
    onCerrar: () => void;
    // Producto ya guardado: los guarda y avisa. Producto nuevo: los devuelve y se guardan junto con él
    onGuardado: (bloques: BloqueGuardar[]) => void;
}

/** Ventana para crear o editar los modificadores de un producto, en bloques, como en las apps de delivery. */
export default function EditorConjuntoModificadores({ producto, conjunto, insumos, unidades, onCerrar, onGuardado }: Props) {
    const [form, setForm] = useState(() => ({ bloques: aBloques(conjunto) }));
    const [guardando, setGuardando] = useState(false);
    const [verAyuda, setVerAyuda] = useState(false);

    const cambiarBloque = (n: number, c: Partial<BloqueForm>) => setForm(f => ({ ...f, bloques: f.bloques.map((b, i) => i === n ? { ...b, ...c } : b) }));
    // Arrastrar y soltar: se agarra el bloque por la manija ⠿ y se suelta donde va
    const [agarrado, setAgarrado] = useState<number | null>(null);
    const [arrastrando, setArrastrando] = useState<number | null>(null);
    const [sobre, setSobre] = useState<number | null>(null);
    const llevarBloque = (desde: number, hasta: number) => setForm(f => {
        if (desde === hasta) return f;
        const bloques = [...f.bloques];
        const [movido] = bloques.splice(desde, 1);
        bloques.splice(hasta, 0, movido);
        return { ...f, bloques };
    });
    const soltar = () => { setArrastrando(null); setSobre(null); setAgarrado(null); };

    const moverBloque = (n: number, d: -1 | 1) => setForm(f => {
        const bloques = [...f.bloques];
        [bloques[n], bloques[n + d]] = [bloques[n + d], bloques[n]];
        return { ...f, bloques };
    });
    const errorBloques = form.bloques.find(b => {
        const min = Number(b.minimo) || 0;
        return b.maximo.trim() !== '' && min > Number(b.maximo);
    });
    const error = form.bloques.length === 0 ? 'Agrega al menos un bloque'
            : form.bloques.some(b => !b.nombre.trim()) ? 'Cada bloque necesita un nombre'
                : form.bloques.some(b => !b.opciones.some(o => o.nombre.trim())) ? 'Cada bloque necesita al menos una opción'
                    : errorBloques ? `«${errorBloques.nombre}»: el mínimo no puede ser mayor que el máximo` : null;

    const aGuardar = (): BloqueGuardar[] => form.bloques.map(b => ({
        id: b.id, nombre: b.nombre.trim(),
        minimo: Math.max(0, Math.floor(Number(b.minimo) || 0)),
        maximo: b.maximo.trim() ? Math.max(1, Math.floor(Number(b.maximo) || 1)) : null,
        opciones: b.opciones.filter(o => o.nombre.trim()).map(o => ({
            id: o.id, nombre: o.nombre.trim(), precio: Number(o.precio || 0),
            obligatorio: o.obligatorio, exclusiva: o.exclusiva, activo: o.activo,
            maximo: Math.min(20, Math.max(1, Math.floor(Number(o.maximo) || 1))),
            producto_id: o.producto_id ? Number(o.producto_id) : null,
            cantidad: o.producto_id ? Number(o.cantidad || 0) : null,
            unidad_medida_id: o.producto_id && o.unidad_medida_id ? Number(o.unidad_medida_id) : null,
        })),
    }));

    const guardar = async () => {
        const bloques = aGuardar();
        if (!producto.id) return onGuardado(bloques);
        setGuardando(true);
        try {
            toast.success((await guardarModificadoresProducto(producto.id, bloques)).message);
            onGuardado(bloques);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[94vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold">Modificadores de {producto.nombre.trim() || 'producto nuevo'}</h2>
                    <button type="button" onClick={() => setVerAyuda(v => !v)} aria-expanded={verAyuda}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${verAyuda ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'}`}>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span>
                        ¿Cómo funciona?
                    </button>
                </div>
                {verAyuda && <Ayuda />}

                <div className="space-y-4">
                    {form.bloques.map((b, n) => {
                        const min = Number(b.minimo) || 0;
                        const max = b.maximo.trim() ? Number(b.maximo) : null;
                        const requerido = min > 0;
                        return (
                            <div key={b.clave}
                                draggable={agarrado === n}
                                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setArrastrando(n); }}
                                onDragOver={e => { if (arrastrando === null) return; e.preventDefault(); setSobre(n); }}
                                onDrop={e => { e.preventDefault(); if (arrastrando !== null) llevarBloque(arrastrando, n); soltar(); }}
                                onDragEnd={soltar}
                                className={`rounded-xl border-2 transition ${arrastrando === n ? 'border-blue-400 opacity-50'
                                    : sobre === n && arrastrando !== null ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'}`}>
                                <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                                    <span onMouseDown={() => setAgarrado(n)} onMouseUp={() => setAgarrado(null)}
                                        title="Arrastra para cambiar el orden" aria-label="Arrastrar bloque"
                                        className="cursor-grab select-none px-1 text-xl leading-none text-gray-400 hover:text-gray-700 active:cursor-grabbing">⠿</span>
                                    <span className="text-base font-bold text-gray-500">{n + 1}.</span>
                                    <input className={`${inputClass} min-w-[180px] flex-1 !h-10 font-semibold`} value={b.nombre} maxLength={80}
                                        placeholder="Nombre del bloque (Elige tu tipo de leche)" onChange={e => cambiarBloque(n, { nombre: e.target.value })} />
                                    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
                                        {([[false, 'Opcional'], [true, 'Requerido']] as const).map(([valor, texto]) => (
                                            <button key={texto} type="button"
                                                onClick={() => cambiarBloque(n, { minimo: valor ? String(Math.max(1, min)) : '' })}
                                                className={`rounded-md px-3 py-1 font-medium ${requerido === valor ? (valor ? 'bg-red-600 text-white' : 'bg-gray-700 text-white') : 'text-gray-600 hover:bg-gray-100'}`}>
                                                {texto}
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => moverBloque(n, -1)} disabled={n === 0} aria-label="Subir bloque"
                                        className="h-9 w-9 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30">↑</button>
                                    <button type="button" onClick={() => moverBloque(n, 1)} disabled={n === form.bloques.length - 1} aria-label="Bajar bloque"
                                        className="h-9 w-9 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30">↓</button>
                                    <button type="button" onClick={() => setForm(f => ({ ...f, bloques: f.bloques.filter((_, i) => i !== n) }))}
                                        className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50">Quitar bloque</button>
                                </div>

                                <div className="space-y-3 p-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <label className="text-xs text-gray-600">Mínimo
                                            <input className={`${inputClass} !w-24`} type="number" inputMode="numeric" min={0} max={50} value={b.minimo} placeholder="0"
                                                onChange={e => cambiarBloque(n, { minimo: e.target.value })} />
                                        </label>
                                        <label className="text-xs text-gray-600">Máximo
                                            <input className={`${inputClass} !w-24`} type="number" inputMode="numeric" min={1} max={50} value={b.maximo} placeholder="Sin tope"
                                                onChange={e => cambiarBloque(n, { maximo: e.target.value })} />
                                        </label>
                                        <p className={`pb-2 text-xs ${max !== null && min > max ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                                            {max !== null && min > max ? 'El mínimo no puede ser mayor que el máximo.'
                                                : `Al vender: «${b.nombre.trim() || 'Bloque'}» · ${requerido ? 'Requerido' : 'Opcional'}${reglaTexto({ minimo: min, maximo: max }) ? ` · ${reglaTexto({ minimo: min, maximo: max })}` : ''}${max === 1 ? ' (tocar otra la cambia)' : ''}`}
                                        </p>
                                    </div>

                                    {b.opciones.map((o, k) => {
                                        const cambiar = (c: Partial<OpcionForm>) => cambiarBloque(n, { opciones: b.opciones.map((x, i) => i === k ? { ...x, ...c } : x) });
                                        const insumo = insumos.find(i => String(i.id) === o.producto_id);
                                        return (
                                            <div key={k} className={`space-y-2 rounded-lg border border-gray-200 p-2 ${o.activo ? '' : 'bg-gray-50 opacity-70'}`}>
                                                <div className="flex gap-2">
                                                    <input className={inputClass} value={o.nombre} maxLength={80} placeholder="Opción (Leche entera)"
                                                        onChange={e => cambiar({ nombre: e.target.value })} />
                                                    <MoneyInput prefix="+$" className="!w-32 shrink-0" value={o.precio} onChange={v => cambiar({ precio: v })} />
                                                    <label className="flex shrink-0 items-center gap-1 text-xs text-gray-500" title="Cuántas veces se puede pedir esta opción en un mismo producto (ej. Huevo extra: hasta 3). 1 = se marca o no.">
                                                        Máx.
                                                        <input type="number" min={1} max={20} className={`${inputClass} !w-16`} value={o.maximo}
                                                            onChange={e => cambiar({ maximo: e.target.value })} aria-label="Máximo de esta opción" />
                                                    </label>
                                                    <button type="button" onClick={() => cambiarBloque(n, { opciones: b.opciones.filter((_, i) => i !== k) })}
                                                        className="h-[42px] w-10 shrink-0 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar opción">✕</button>
                                                </div>
                                                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                                    <div className="min-w-0 flex-1">
                                                        <SelectBuscador value={o.producto_id ? Number(o.producto_id) : 0} placeholder="Buscar insumo que descuenta..."
                                                            opciones={[{ value: 0, label: 'No descuenta inventario' },
                                                                ...insumos.map(i => ({ value: i.id, label: i.unidad ? `${i.nombre} (${i.unidad})` : i.nombre }))]}
                                                            onChange={v => {
                                                                const elegido = v ? insumos.find(i => i.id === v) : undefined;
                                                                cambiar({ producto_id: elegido ? String(elegido.id) : '', unidad_medida_id: elegido?.unidad_medida_id ? String(elegido.unidad_medida_id) : '' });
                                                            }} />
                                                    </div>
                                                    {o.producto_id && (
                                                        <>
                                                            <input type="number" min="0" step="any" inputMode="decimal" className={`${inputClass} !w-28 shrink-0`} placeholder="Cantidad"
                                                                value={o.cantidad} onChange={e => cambiar({ cantidad: e.target.value })} aria-label="Cantidad del insumo" />
                                                            <select className={`${inputClass} !w-36 shrink-0`} value={o.unidad_medida_id} aria-label="Unidad del insumo"
                                                                onChange={e => cambiar({ unidad_medida_id: e.target.value })}>
                                                                {unidades.filter(u => !insumo?.tipo || u.tipo === insumo.tipo).map(u => (
                                                                    <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>
                                                                ))}
                                                            </select>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-4 px-1 text-sm text-gray-700">
                                                    <label className="flex items-center gap-2" title="Siempre va marcada y no se puede quitar">
                                                        <input type="checkbox" className="h-4 w-4" checked={o.obligatorio} onChange={e => cambiar({ obligatorio: e.target.checked })} /> Obligatorio</label>
                                                    <label className="flex items-center gap-2" title="Al elegirla se quitan todas las demás opciones del bloque">
                                                        <input type="checkbox" className="h-4 w-4" checked={o.exclusiva} onChange={e => cambiar({ exclusiva: e.target.checked })} /> Una sola</label>
                                                    <label className="flex items-center gap-2" title="Apagada no sale al vender">
                                                        <input type="checkbox" className="h-4 w-4" checked={o.activo} onChange={e => cambiar({ activo: e.target.checked })} /> Activa</label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <button type="button" onClick={() => cambiarBloque(n, { opciones: [...b.opciones, opcionVacia()] })}
                                        className="text-sm font-medium text-blue-600 hover:underline">+ Agregar opción</button>
                                </div>
                            </div>
                        );
                    })}
                    <button type="button" onClick={() => setForm(f => ({ ...f, bloques: [...f.bloques, bloqueVacio()] }))}
                        className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50">
                        + Agregar bloque
                    </button>
                    {form.bloques.length > 1 && <p className="text-center text-xs text-gray-500">Arrastra un bloque por ⠿ (o usa ↑ ↓) para cambiar el orden: así se ven al vender.</p>}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {error && <p className="mr-auto text-sm text-red-600">{error}</p>}
                    <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm hover:bg-gray-200">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !!error}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                        {guardando ? 'Guardando...' : producto.id ? 'Guardar' : 'Listo'}
                    </button>
                </div>
            </div>
        </div>
    );
}
