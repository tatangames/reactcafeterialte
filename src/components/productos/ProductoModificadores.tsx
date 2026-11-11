import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import EditorGrupoModificadores from './EditorGrupoModificadores';
import { EtiquetaRegla } from './ModificadoresPanel';
import SelectBuscador from '../form/SelectBuscador';
import Cargando from '../ui/loading/Cargando';
import {
    getBloquesProducto, getGruposConfig, GrupoConfigInterface, guardarBloquesProducto,
    InsumoModificadorInterface, UnidadModificadorInterface,
} from '../../services/mesas';
import { dinero, mensajeError } from '../../utils/formato';

/**
 * Bloques de modificadores del producto, uno debajo de otro como en las apps de delivery
 * (Tipo de leche, Leche extra...): agregar uno existente o nuevo, ordenarlos, editarlos y quitarlos.
 * Cada cambio de la lista se guarda al momento.
 */
export default function ProductoModificadores({ productoId }: { productoId: number }) {
    const [cargado, setCargado] = useState(false);
    const [grupos, setGrupos] = useState<GrupoConfigInterface[]>([]);
    const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
    const [insumos, setInsumos] = useState<InsumoModificadorInterface[]>([]);
    const [unidades, setUnidades] = useState<UnidadModificadorInterface[]>([]);
    const [suyos, setSuyos] = useState<number[]>([]);
    const [guardando, setGuardando] = useState(false);
    // undefined: cerrado; null: bloque nuevo
    const [editando, setEditando] = useState<GrupoConfigInterface | null | undefined>(undefined);

    const cargar = useCallback(async () => {
        try {
            const [config, bloques] = await Promise.all([getGruposConfig(), getBloquesProducto(productoId)]);
            setGrupos(config.grupos);
            setProductos(config.productos);
            setInsumos(config.insumos);
            setUnidades(config.unidades);
            setSuyos(bloques.grupos);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudieron cargar los modificadores'));
        } finally {
            setCargado(true);
        }
    }, [productoId]);
    useEffect(() => { cargar(); }, [cargar]);

    const guardarLista = async (lista: number[]) => {
        const antes = suyos;
        setSuyos(lista);
        setGuardando(true);
        try {
            await guardarBloquesProducto(productoId, lista);
        } catch (e) {
            setSuyos(antes);
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const mover = (n: number, d: -1 | 1) => {
        const lista = [...suyos];
        [lista[n], lista[n + d]] = [lista[n + d], lista[n]];
        guardarLista(lista);
    };

    const bloques = suyos.map(id => grupos.find(g => g.id === id)).filter((g): g is GrupoConfigInterface => !!g);
    const disponibles = grupos.filter(g => !suyos.includes(g.id));

    return (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Modificadores</h2>
                <p className="text-sm text-gray-500">Lo que se elige al vender este producto, en este orden. Cada bloque tiene sus opciones y cuántas se eligen.</p>
            </div>

            {!cargado && <Cargando className="py-6" />}
            {cargado && bloques.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                    Este producto no lleva modificadores. Agrega un bloque como «Tipo de leche» o «Salsa».
                </p>
            )}

            <div className="space-y-3">
                {bloques.map((g, n) => {
                    const otros = g.productos.filter(p => p.id !== productoId);
                    return (
                        <div key={g.id} className="rounded-xl border border-gray-200">
                            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                                <span className="text-sm font-semibold text-gray-400">{n + 1}</span>
                                <p className="font-semibold text-gray-800">{g.nombre}</p>
                                <EtiquetaRegla grupo={g} />
                                <div className="ml-auto flex items-center gap-1">
                                    <button type="button" onClick={() => mover(n, -1)} disabled={n === 0 || guardando} aria-label={`Subir ${g.nombre}`}
                                        className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30">↑</button>
                                    <button type="button" onClick={() => mover(n, 1)} disabled={n === bloques.length - 1 || guardando} aria-label={`Bajar ${g.nombre}`}
                                        className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-200 disabled:opacity-30">↓</button>
                                    <button type="button" onClick={() => setEditando(g)}
                                        className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100">Editar</button>
                                    <button type="button" onClick={() => guardarLista(suyos.filter(x => x !== g.id))} disabled={guardando}
                                        title="Lo quita de este producto; el bloque se conserva"
                                        className="rounded-md px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
                                </div>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {g.opciones.filter(o => o.activo).map(o => (
                                    <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                        <span className="text-gray-700">
                                            {o.nombre}
                                            {(o.maximo ?? 1) > 1 && <span className="ml-2 text-xs text-gray-400">hasta {o.maximo}</span>}
                                            {o.obligatorio && <span className="ml-2 text-xs font-medium text-amber-700">siempre va</span>}
                                            {o.exclusiva && <span className="ml-2 text-xs text-blue-700">una sola</span>}
                                            {o.insumo && <span className="ml-2 text-xs text-gray-400">descuenta {o.cantidad} {o.unidad ?? ''} de {o.insumo}</span>}
                                        </span>
                                        <span className="shrink-0 text-gray-500">{o.precio > 0 ? `+${dinero(o.precio)}` : 'Gratis'}</span>
                                    </li>
                                ))}
                            </ul>
                            {otros.length > 0 && (
                                <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">También en: {otros.map(p => p.nombre).join(', ')}</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {cargado && (
                <div className="flex flex-wrap items-center gap-3">
                    {disponibles.length > 0 && (
                        <div className="min-w-[240px] flex-1">
                            <SelectBuscador value={null} placeholder="Agregar un bloque que ya existe..." disabled={guardando}
                                opciones={disponibles.map(g => ({ value: g.id, label: g.nombre }))}
                                onChange={v => v && guardarLista([...suyos, v])} />
                        </div>
                    )}
                    <button type="button" onClick={() => setEditando(null)}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Crear bloque nuevo</button>
                </div>
            )}

            {editando !== undefined && (
                <EditorGrupoModificadores grupo={editando} productos={productos} insumos={insumos} unidades={unidades}
                    productosIniciales={[productoId]}
                    onCerrar={() => setEditando(undefined)}
                    onGuardado={async (id) => {
                        const nuevo = editando === null;
                        setEditando(undefined);
                        // Uno nuevo queda al final de la lista del producto
                        if (nuevo && id && !suyos.includes(id)) await guardarBloquesProducto(productoId, [...suyos, id]).catch(() => null);
                        cargar();
                    }} />
            )}
        </div>
    );
}
