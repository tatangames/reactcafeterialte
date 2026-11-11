import { useState } from 'react';
import toast from 'react-hot-toast';

import FormField, { inputClass } from '../form/FormField';
import MoneyInput from '../form/MoneyInput';
import SelectBuscador from '../form/SelectBuscador';
import {
    GrupoConfigInterface, guardarGrupo, InsumoModificadorInterface, UnidadModificadorInterface,
} from '../../services/mesas';
import { mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';
import { minimoDe, reglaTexto } from '../../utils/modificadores';

// Una opción del formulario: el insumo es opcional (Revueltos no gasta nada; Fresa gasta 30 g)
// maximo: cuántas veces se puede pedir en un mismo producto (Huevo extra hasta 3); 1 = se marca o no
// obligatorio: siempre va; exclusiva: «una sola», al elegirla se quitan las demás; activo: apagada no sale al vender
type OpcionForm = {
    id?: number; nombre: string; precio: string; maximo: string; obligatorio: boolean; exclusiva: boolean; activo: boolean;
    producto_id: string; cantidad: string; unidad_medida_id: string;
};
const opcionVacia = (): OpcionForm => ({ nombre: '', precio: '', maximo: '1', obligatorio: false, exclusiva: false, activo: true, producto_id: '', cantidad: '', unidad_medida_id: '' });

type GrupoForm = { id?: number; nombre: string; minimo: string; maximo: string; opciones: OpcionForm[]; productos: number[] };

const aFormulario = (g: GrupoConfigInterface | null, productos: number[]): GrupoForm => g ? {
    id: g.id, nombre: g.nombre,
    minimo: minimoDe(g) ? String(minimoDe(g)) : '', maximo: g.maximo ? String(g.maximo) : '',
    opciones: g.opciones.map(o => ({
        id: o.id, nombre: o.nombre, precio: o.precio ? String(o.precio) : '', maximo: String(o.maximo ?? 1),
        obligatorio: !!o.obligatorio, exclusiva: !!o.exclusiva, activo: o.activo,
        producto_id: o.producto_id ? String(o.producto_id) : '', cantidad: o.cantidad ? String(o.cantidad) : '',
        unidad_medida_id: o.unidad_medida_id ? String(o.unidad_medida_id) : '',
    })),
    productos: g.productos.map(p => p.id),
} : { nombre: '', minimo: '', maximo: '', opciones: [opcionVacia()], productos };

// «¿Cómo funciona?» del bloque de modificadores: casillas, precio extra e insumo, con ejemplos
function AyudaModificadores() {
    const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
        <div className="rounded-md border border-blue-100 bg-white/70 px-3 py-2">
            <p className="font-semibold">{titulo}</p>
            <div className="mt-1 space-y-1">{children}</div>
        </div>
    );
    return (
        <div className="space-y-2 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            <p>Un <b>bloque</b> son las opciones que se eligen al tocar un producto en la venta o la mesa (tipo de leche, salsa, cómo van los huevos), como en las apps de delivery. Salen en el ticket y en la comanda debajo del producto. Un producto puede llevar varios bloques, uno debajo de otro.</p>
            <Bloque titulo="Requerido u opcional, mínimo y máximo">
                <p><b>Requerido:</b> no deja agregar el producto hasta elegir el mínimo. <b>Opcional:</b> se puede dejar sin elegir.</p>
                <p>Mínimo y máximo cuentan las opciones en total, contando cada vez que se repite una. Ej.: «Tipo de leche» requerido, máximo 1; «Leche extra» opcional, máximo 2. Con máximo 1, tocar otra opción la cambia.</p>
            </Bloque>
            <Bloque titulo="Casillas de cada opción">
                <p><b>Obligatorio:</b> la opción siempre va marcada y no se puede quitar (si tiene máximo, se puede subir). Ej.: «Tortillas» del desayuno.</p>
                <p><b>Una sola:</b> al elegirla se quitan <b>todas</b> las demás opciones del bloque, y al elegir otra se quita ella. Ej.: «Sin azúcar» quita «Azúcar extra».</p>
                <p><b>Activa:</b> apagada no sale al vender, pero se conserva (ej. un sabor que se acabó por temporada).</p>
            </Bloque>
            <Bloque titulo="Precio extra (+$)">
                <p>Lo que se <b>suma al precio</b> del producto si el cliente elige esa opción. Waffle $2.75 + Nutella (+$0.50) = <b>$3.25</b>. En blanco: gratis.</p>
            </Bloque>
            <Bloque titulo="Insumo, cantidad y unidad">
                <p>Lo que se <b>descuenta del inventario</b> cada vez que se vende el producto con esa opción. Nutella, 30 g: se vende un waffle con Nutella y bajan 30 g de Nutella. Aunque la opción sea gratis, el insumo se descuenta igual y su costo se suma al costo de la venta.</p>
                <p>«No descuenta inventario»: para instrucciones que no gastan nada.</p>
            </Bloque>
        </div>
    );
}

interface Props {
    grupo: GrupoConfigInterface | null;      // null: bloque nuevo
    productos: { id: number; nombre: string }[];
    insumos: InsumoModificadorInterface[];
    unidades: UnidadModificadorInterface[];
    productosIniciales?: number[];           // bloque nuevo creado desde un producto: ya lo lleva
    onCerrar: () => void;
    onGuardado: (id: number) => void;
}

/** Ventana para crear o editar un bloque de modificadores con sus opciones y los productos que lo usan. */
export default function EditorGrupoModificadores({ grupo: inicial, productos, insumos, unidades, productosIniciales = [], onCerrar, onGuardado }: Props) {
    const [grupo, setGrupo] = useState<GrupoForm>(() => aFormulario(inicial, productosIniciales));
    const [guardando, setGuardando] = useState(false);
    const [verAyuda, setVerAyuda] = useState(false);
    const [buscarProducto, setBuscarProducto] = useState('');

    const min = Number(grupo.minimo) || 0;
    const max = grupo.maximo.trim() ? Number(grupo.maximo) : null;
    const requerido = min > 0;

    const guardar = async () => {
        setGuardando(true);
        try {
            const minimo = Math.max(0, Math.floor(min));
            const maximo = max !== null ? Math.max(1, Math.floor(max || 1)) : null;
            const r = await guardarGrupo({
                nombre: grupo.nombre.trim(), minimo, maximo, obligatorio: minimo > 0,
                opciones: grupo.opciones.filter(o => o.nombre.trim()).map(o => ({
                    id: o.id, nombre: o.nombre.trim(), precio: Number(o.precio || 0),
                    obligatorio: o.obligatorio, exclusiva: o.exclusiva, activo: o.activo,
                    maximo: Math.min(20, Math.max(1, Math.floor(Number(o.maximo) || 1))),
                    producto_id: o.producto_id ? Number(o.producto_id) : null,
                    cantidad: o.producto_id ? Number(o.cantidad || 0) : null,
                    unidad_medida_id: o.producto_id && o.unidad_medida_id ? Number(o.unidad_medida_id) : null,
                })),
                productos: grupo.productos,
            }, grupo.id);
            toast.success(r.message);
            onGuardado(r.id ?? grupo.id ?? 0);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const otros = grupo.productos.length;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold">{grupo.id ? `Editar ${inicial?.nombre ?? 'bloque'}` : 'Nuevo bloque de modificadores'}</h2>
                    <button type="button" onClick={() => setVerAyuda(v => !v)} aria-expanded={verAyuda}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${verAyuda ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'}`}>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span>
                        ¿Cómo funciona?
                    </button>
                </div>
                {verAyuda && <AyudaModificadores />}
                {grupo.id && otros > 1 && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Este bloque lo usan {otros} productos: lo que cambies aquí cambia en todos.
                    </p>
                )}

                <FormField label="Nombre" required>
                    <input className={inputClass} value={grupo.nombre} maxLength={80} autoFocus placeholder="Tipo de leche, Salsa, Tamaño..."
                        onChange={e => setGrupo(g => ({ ...g, nombre: e.target.value }))} />
                </FormField>

                {/* Requerido / Opcional y cuántas en total, como en las apps de delivery */}
                <div className="space-y-2">
                    <div className="inline-flex rounded-lg border border-gray-300 p-1 text-sm">
                        {([[false, 'Opcional'], [true, 'Requerido']] as const).map(([valor, texto]) => (
                            <button key={texto} type="button"
                                onClick={() => setGrupo(g => ({ ...g, minimo: valor ? String(Math.max(1, Number(g.minimo) || 0)) : '' }))}
                                className={`rounded-md px-4 py-1.5 font-medium ${requerido === valor ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                {texto}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Mínimo a elegir" hint={requerido ? 'Requerido: hay que elegir al menos esta cantidad.' : 'Opcional: se puede dejar sin elegir.'}>
                            <input className={inputClass} type="number" inputMode="numeric" min={0} max={50} value={grupo.minimo} placeholder="0"
                                onChange={e => setGrupo(g => ({ ...g, minimo: e.target.value }))} />
                        </FormField>
                        <FormField label="Máximo a elegir" hint="En blanco: sin tope. Con 1, tocar otra opción la cambia.">
                            <input className={inputClass} type="number" inputMode="numeric" min={1} max={50} value={grupo.maximo} placeholder="Sin tope"
                                onChange={e => setGrupo(g => ({ ...g, maximo: e.target.value }))} />
                        </FormField>
                    </div>
                    {max !== null && min > max
                        ? <p className="text-xs font-medium text-red-600">El mínimo no puede ser mayor que el máximo.</p>
                        : <p className="text-xs text-gray-500">
                            Al vender se verá: «{grupo.nombre.trim() || 'Bloque'}: {reglaTexto({ minimo: min, maximo: max }) || 'opcional'}». Cuenta cada vez que se repite una opción.
                        </p>}
                </div>

                <FormField label="Opciones" required hint="Precio extra en blanco: no cambia el precio. Insumo: lo que se descuenta del inventario por cada producto vendido con esa opción.">
                    <div className="space-y-3">
                        {grupo.opciones.map((o, n) => {
                            const cambiar = (c: Partial<OpcionForm>) => setGrupo(g => ({ ...g, opciones: g.opciones.map((x, i) => i === n ? { ...x, ...c } : x) }));
                            const insumo = insumos.find(i => String(i.id) === o.producto_id);
                            return (
                                <div key={n} className={`space-y-2 rounded-lg border border-gray-200 p-2 ${o.activo ? '' : 'bg-gray-50 opacity-70'}`}>
                                    <div className="flex gap-2">
                                        <input className={inputClass} value={o.nombre} maxLength={80} placeholder="Ej.: Deslactosada"
                                            onChange={e => cambiar({ nombre: e.target.value })} />
                                        <MoneyInput prefix="+$" className="!w-32 shrink-0" value={o.precio} onChange={v => cambiar({ precio: v })} />
                                        <label className="flex shrink-0 items-center gap-1 text-xs text-gray-500" title="Cuántas veces se puede pedir en un mismo producto (ej. Huevo extra: hasta 3). 1 = se marca o no.">
                                            Máx.
                                            <input type="number" min={1} max={20} className={`${inputClass} !w-16`} value={o.maximo}
                                                onChange={e => cambiar({ maximo: e.target.value })} aria-label="Máximo por producto" />
                                        </label>
                                        <button type="button" onClick={() => setGrupo(g => ({ ...g, opciones: g.opciones.filter((_, i) => i !== n) }))}
                                            className="h-[42px] w-10 shrink-0 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar opción">✕</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                                        {/* Insumo con buscador: se escribe «nut» y aparece Nutella */}
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
                        <button type="button" onClick={() => setGrupo(g => ({ ...g, opciones: [...g.opciones, opcionVacia()] }))}
                            className="text-sm font-medium text-blue-600 hover:underline">+ Agregar opción</button>
                    </div>
                </FormField>

                <FormField label={`Productos que lo usan (${grupo.productos.length})`}>
                    <input className={`${inputClass} mb-2`} value={buscarProducto} onChange={e => setBuscarProducto(e.target.value)} placeholder="Buscar producto" />
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                        {productos.filter(p => sinTildes(p.nombre).includes(sinTildes(buscarProducto.trim()))).map(p => (
                            <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                                <input type="checkbox" className="h-4 w-4" checked={grupo.productos.includes(p.id)}
                                    onChange={e => setGrupo(g => ({ ...g, productos: e.target.checked ? [...g.productos, p.id] : g.productos.filter(x => x !== p.id) }))} />
                                {p.nombre}
                            </label>
                        ))}
                    </div>
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm hover:bg-gray-200">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || (max !== null && min > max)}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
