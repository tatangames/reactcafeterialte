import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import FormField, { inputClass } from '../form/FormField';
import MoneyInput from '../form/MoneyInput';
import SelectBuscador from '../form/SelectBuscador';
import Cargando from '../ui/loading/Cargando';
import {
    getGruposConfig, GrupoConfigInterface, guardarGrupo, InsumoModificadorInterface, UnidadModificadorInterface,
} from '../../services/mesas';
import { dinero, mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';
import { minimoDe, reglaTexto } from '../../utils/modificadores';

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

// Una opción del formulario: el insumo es opcional (Revueltos no gasta nada; Fresa gasta 30 g)
// maximo: cuántas veces se puede pedir en un mismo producto (Huevo extra hasta 3); 1 = se marca o no
// obligatorio: siempre va; exclusiva: «una sola», al elegirla se quitan las demás; activo: apagada no sale al vender
type OpcionForm = {
    id?: number; nombre: string; precio: string; maximo: string; obligatorio: boolean; exclusiva: boolean; activo: boolean;
    producto_id: string; cantidad: string; unidad_medida_id: string;
};
const opcionVacia = (): OpcionForm => ({ nombre: '', precio: '', maximo: '1', obligatorio: false, exclusiva: false, activo: true, producto_id: '', cantidad: '', unidad_medida_id: '' });

// «¿Cómo funciona?» del grupo de modificadores: casillas, precio extra e insumo, con ejemplos
function AyudaModificadores() {
    const Bloque = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
        <div className="rounded-md border border-blue-100 bg-white/70 px-3 py-2">
            <p className="font-semibold">{titulo}</p>
            <div className="mt-1 space-y-1">{children}</div>
        </div>
    );
    return (
        <div className="space-y-2 rounded-lg bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            <p>Un <b>grupo</b> son las opciones que se eligen al tocar un producto en la venta o la mesa (tipo de leche, salsa, cómo van los huevos). Salen en el ticket y en la comanda debajo del producto.</p>
            <Bloque titulo="Nombre">
                <p>Corto, porque es lo que ve el mesero: «Salsa», «Leche», «Huevos». El producto al que aplica se elige abajo, en «Productos que lo usan» (no hace falta escribirlo en el nombre).</p>
            </Bloque>
            <Bloque titulo="Casillas de cada opción">
                <p><b>Obligatorio:</b> la opción siempre va marcada y no se puede quitar (si tiene máximo, se puede subir). Ej.: «Tortillas» del desayuno.</p>
                <p><b>Una sola:</b> al elegirla se quitan las demás opciones del grupo, y al elegir otra se quita ella. Ej.: «Sin azúcar» quita «Azúcar extra». Si todas son «una sola», solo se elige una (Estrellados, Revueltos o Picados).</p>
                <p><b>Mínimo y máximo</b> (del grupo): cuántas opciones se eligen en total, contando cada vez que se repite una. Ej.: «Huevos» mínimo 1; «Tipo de leche» mínimo 1, máximo 2. Con mínimo no deja agregar el producto hasta completarlo; con máximo no deja pasarse.</p>
                <p><b>Activa:</b> apagada no sale al vender, pero se conserva (ej. un sabor que se acabó por temporada).</p>
            </Bloque>
            <Bloque titulo="Precio extra (+$)">
                <p>Lo que se <b>suma al precio</b> del producto si el cliente elige esa opción. Waffle $2.75 + Nutella (+$0.50) = <b>$3.25</b>.</p>
                <p>En blanco o $0.00: la opción es <b>gratis</b>, el precio no cambia. Sirve para opciones que ya van incluidas o que solo son instrucciones («Sin azúcar», «Revueltos»).</p>
            </Bloque>
            <Bloque titulo="Insumo, cantidad y unidad">
                <p>Lo que se <b>descuenta del inventario</b> cada vez que se vende el producto con esa opción. Nutella, 30 g: se vende un waffle con Nutella y bajan 30 g de Nutella.</p>
                <p>Aunque la opción sea gratis, el insumo se descuenta igual y su costo se suma al costo de la venta (así la utilidad es real). Si el insumo se acaba, la opción sale «Agotado» cuando no se permite stock negativo.</p>
                <p>«No descuenta inventario»: para instrucciones que no gastan nada.</p>
            </Bloque>
            <Bloque titulo="Ejemplo: grupo «Salsa» para el Waffle">
                <p>Opcional, una sola opción. Nutella <b>+$0.50</b>, insumo Nutella 30 g · Caramelo <b>+$0.50</b>, insumo Caramelo 30 g · Sin salsa (en blanco), no descuenta inventario.</p>
            </Bloque>
        </div>
    );
}

// Grupos de extras de los productos (leche, salsa, huevo extra): pestaña «Modificadores» del catálogo
export default function ModificadoresPanel() {
    const [guardando, setGuardando] = useState(false);
    const [cargado, setCargado] = useState(false);
    const [buscar, setBuscar] = useState('');
    const [grupos, setGrupos] = useState<GrupoConfigInterface[]>([]);
    const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
    const [insumos, setInsumos] = useState<InsumoModificadorInterface[]>([]);
    const [unidades, setUnidades] = useState<UnidadModificadorInterface[]>([]);
    const [verAyudaGrupo, setVerAyudaGrupo] = useState(false);
    const [grupo, setGrupo] = useState<{
        id?: number; nombre: string; minimo: string; maximo: string; opciones: OpcionForm[]; productos: number[];
    } | null>(null);
    const [buscarProducto, setBuscarProducto] = useState('');

    const cargar = useCallback(() => {
        getGruposConfig().then(r => { setGrupos(r.grupos); setProductos(r.productos); setInsumos(r.insumos); setUnidades(r.unidades); })
            .catch(e => toast.error(mensajeError(e, 'Error al cargar los modificadores'))).finally(() => setCargado(true));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    // Busca por nombre del grupo, de sus opciones o de los productos que lo usan, sin importar tildes
    const visibles = useMemo(() => {
        const t = sinTildes(buscar.trim());
        if (!t) return grupos;
        return grupos.filter(g => [g.nombre, ...g.opciones.map(o => o.nombre), ...g.productos.map(p => p.nombre)]
            .some(texto => sinTildes(texto).includes(t)));
    }, [grupos, buscar]);

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
        <div>
                        {(
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => setGrupo({ nombre: '', minimo: '', maximo: '', opciones: [opcionVacia()], productos: [] })}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nuevo grupo</button>
                        <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar grupo, opción o producto..."
                            className="h-[42px] w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:w-[300px]" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {!cargado && <Cargando className="col-span-full py-10" />}
                        {cargado && grupos.length === 0 && <p className="text-sm text-gray-500">Aún no hay modificadores. Crea grupos como «Leche», «Saborizante» o «Tamaño».</p>}
                        {cargado && grupos.length > 0 && visibles.length === 0 && <p className="text-sm text-gray-500">Ningún grupo coincide con «{buscar.trim()}».</p>}
                        {visibles.map(g => (
                            <button key={g.id} type="button" onClick={() => setGrupo({
                                id: g.id, nombre: g.nombre,
                                minimo: minimoDe(g) ? String(minimoDe(g)) : '', maximo: g.maximo ? String(g.maximo) : '',
                                opciones: g.opciones.map(o => ({
                                    id: o.id, nombre: o.nombre, precio: o.precio ? String(o.precio) : '', maximo: String(o.maximo ?? 1),
                                    obligatorio: !!o.obligatorio, exclusiva: !!o.exclusiva, activo: o.activo,
                                    producto_id: o.producto_id ? String(o.producto_id) : '', cantidad: o.cantidad ? String(o.cantidad) : '',
                                    unidad_medida_id: o.unidad_medida_id ? String(o.unidad_medida_id) : '',
                                })),
                                productos: g.productos.map(p => p.id),
                            })} className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm">
                                <p className="font-semibold">{g.nombre}</p>
                                {reglaTexto(g) && <p className="text-xs font-medium text-amber-700">{reglaTexto(g).replace(/^./, c => c.toUpperCase())}</p>}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {g.opciones.map(o => (
                                        <span key={o.id} className={`rounded-full px-2.5 py-1 text-xs ${o.activo ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400 line-through'}`}>
                                            {o.nombre}{o.precio > 0 ? ` +${dinero(o.precio)}` : ''}{(o.maximo ?? 1) > 1 ? ` · hasta ${o.maximo}` : ''}
                                            {o.obligatorio && <b className="ml-1 text-amber-700">· obligatorio</b>}
                                            {o.exclusiva && <span className="ml-1 text-blue-700">· una sola</span>}
                                            {!o.activo && <span className="ml-1">(apagada)</span>}
                                        </span>
                                    ))}
                                </div>
                                {g.opciones.some(o => o.activo && o.insumo) && (
                                    <p className="mt-1 text-xs text-gray-500">Descuenta: {g.opciones.filter(o => o.activo && o.insumo).map(o => `${o.insumo} ${o.cantidad} ${o.unidad ?? ''}`.trim()).join(' · ')}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">{g.productos.length} producto(s)</p>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {grupo && (
                <Ventana titulo={grupo.id ? `Editar ${grupo.nombre}` : 'Nuevo grupo de modificadores'} ancho="max-w-2xl" guardando={guardando} onCerrar={() => setGrupo(null)}
                    onGuardar={() => guardar(() => guardarGrupo({
                        nombre: grupo.nombre.trim(),
                        ...(() => {
                            const minimo = Math.max(0, Math.floor(Number(grupo.minimo) || 0));
                            const maximo = grupo.maximo.trim() ? Math.max(1, Math.floor(Number(grupo.maximo) || 1)) : null;
                            return { minimo, maximo, obligatorio: minimo > 0 };
                        })(),
                        opciones: grupo.opciones.filter(o => o.nombre.trim()).map(o => ({
                            id: o.id, nombre: o.nombre.trim(), precio: Number(o.precio || 0),
                            obligatorio: o.obligatorio, exclusiva: o.exclusiva, activo: o.activo,
                            maximo: Math.min(20, Math.max(1, Math.floor(Number(o.maximo) || 1))),
                            producto_id: o.producto_id ? Number(o.producto_id) : null,
                            cantidad: o.producto_id ? Number(o.cantidad || 0) : null,
                            unidad_medida_id: o.producto_id && o.unidad_medida_id ? Number(o.unidad_medida_id) : null,
                        })),
                        productos: grupo.productos,
                    }, grupo.id), () => setGrupo(null))}>
                    <div className="flex justify-end">
                        <button type="button" onClick={() => setVerAyudaGrupo(v => !v)} aria-expanded={verAyudaGrupo}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${verAyudaGrupo ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600'}`}>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span>
                            ¿Cómo funciona?
                        </button>
                    </div>
                    {verAyudaGrupo && <AyudaModificadores />}
                    <FormField label="Nombre" required>
                        <input className={inputClass} value={grupo.nombre} maxLength={80} autoFocus placeholder="Leche, Saborizante, Tamaño..." onChange={e => setGrupo(g => g && { ...g, nombre: e.target.value })} />
                    </FormField>
                    {/* Unidades en total del grupo, contando cuántas veces se repite cada opción */}
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Mínimo a elegir" hint="En blanco o 0: es opcional. 1: hay que elegir al menos una.">
                            <input className={inputClass} type="number" inputMode="numeric" min={0} max={50} value={grupo.minimo} placeholder="0"
                                onChange={e => setGrupo(g => g && { ...g, minimo: e.target.value })} />
                        </FormField>
                        <FormField label="Máximo a elegir" hint="En blanco: sin tope. Ej.: Tipo de leche, máximo 2.">
                            <input className={inputClass} type="number" inputMode="numeric" min={1} max={50} value={grupo.maximo} placeholder="Sin tope"
                                onChange={e => setGrupo(g => g && { ...g, maximo: e.target.value })} />
                        </FormField>
                    </div>
                    {(() => {
                        const min = Number(grupo.minimo) || 0;
                        const max = grupo.maximo.trim() ? Number(grupo.maximo) : null;
                        if (max !== null && min > max) return <p className="text-xs font-medium text-red-600">El mínimo no puede ser mayor que el máximo.</p>;
                        const texto = reglaTexto({ minimo: min, maximo: max });
                        return texto && <p className="text-xs text-gray-500">Al vender se verá: «{grupo.nombre.trim() || 'Grupo'}: {texto}». Cuenta cada vez que se repite una opción.</p>;
                    })()}
                    <FormField label="Opciones" required hint="Precio extra en blanco: no cambia el precio. Insumo: lo que se descuenta del inventario por cada producto vendido con esa opción.">
                        <div className="space-y-3">
                            {grupo.opciones.map((o, n) => {
                                const cambiar = (c: Partial<OpcionForm>) => setGrupo(g => g && { ...g, opciones: g.opciones.map((x, i) => i === n ? { ...x, ...c } : x) });
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
                                            <button type="button" onClick={() => setGrupo(g => g && { ...g, opciones: g.opciones.filter((_, i) => i !== n) })}
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
                                            <label className="flex items-center gap-2" title="Al elegirla se quitan las demás opciones del grupo">
                                                <input type="checkbox" className="h-4 w-4" checked={o.exclusiva} onChange={e => cambiar({ exclusiva: e.target.checked })} /> Una sola</label>
                                            <label className="flex items-center gap-2" title="Apagada no sale al vender">
                                                <input type="checkbox" className="h-4 w-4" checked={o.activo} onChange={e => cambiar({ activo: e.target.checked })} /> Activa</label>
                                        </div>
                                    </div>
                                );
                            })}
                            <button type="button" onClick={() => setGrupo(g => g && { ...g, opciones: [...g.opciones, opcionVacia()] })}
                                className="text-sm font-medium text-blue-600 hover:underline">+ Agregar opción</button>
                        </div>
                    </FormField>
                    <FormField label={`Productos que lo usan (${grupo.productos.length})`}>
                        <input className={`${inputClass} mb-2`} value={buscarProducto} onChange={e => setBuscarProducto(e.target.value)} placeholder="Buscar producto" />
                        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                            {productos.filter(p => sinTildes(p.nombre).includes(sinTildes(buscarProducto.trim()))).map(p => (
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
