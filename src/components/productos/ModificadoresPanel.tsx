import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import EditorGrupoModificadores from './EditorGrupoModificadores';
import Cargando from '../ui/loading/Cargando';
import {
    getGruposConfig, GrupoConfigInterface, InsumoModificadorInterface, UnidadModificadorInterface,
} from '../../services/mesas';
import { dinero, mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';
import { reglaTexto } from '../../utils/modificadores';

// Grupos de extras de los productos (leche, salsa, huevo extra): pestaña «Modificadores» del catálogo
export default function ModificadoresPanel() {
    const [cargado, setCargado] = useState(false);
    const [buscar, setBuscar] = useState('');
    const [grupos, setGrupos] = useState<GrupoConfigInterface[]>([]);
    const [productos, setProductos] = useState<{ id: number; nombre: string }[]>([]);
    const [insumos, setInsumos] = useState<InsumoModificadorInterface[]>([]);
    const [unidades, setUnidades] = useState<UnidadModificadorInterface[]>([]);
    // undefined: cerrado; null: bloque nuevo
    const [editando, setEditando] = useState<GrupoConfigInterface | null | undefined>(undefined);

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

    return (
        <div>
                        {(
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" onClick={() => setEditando(null)}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nuevo bloque</button>
                        <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar bloque, opción o producto..."
                            className="h-[42px] w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:w-[300px]" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {!cargado && <Cargando className="col-span-full py-10" />}
                        {cargado && grupos.length === 0 && <p className="text-sm text-gray-500">Aún no hay modificadores. Crea bloques como «Tipo de leche», «Salsa» o «Tamaño».</p>}
                        {cargado && grupos.length > 0 && visibles.length === 0 && <p className="text-sm text-gray-500">Ningún bloque coincide con «{buscar.trim()}».</p>}
                        {visibles.map(g => (
                            <button key={g.id} type="button" onClick={() => setEditando(g)} className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:shadow-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{g.nombre}</p>
                                    <EtiquetaRegla grupo={g} />
                                </div>
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
                                <p className="mt-1 text-xs text-gray-500">
                                    {g.productos.length ? <>En: <span className="text-gray-700">{g.productos.map(p => p.nombre).join(', ')}</span></> : 'No está asignado a ningún producto'}
                                </p>
                            </button>
                        ))}
                    </div>
                </>
            )}

            {editando !== undefined && (
                <EditorGrupoModificadores grupo={editando} productos={productos} insumos={insumos} unidades={unidades}
                    onCerrar={() => setEditando(undefined)} onGuardado={() => { setEditando(undefined); cargar(); }} />
            )}
        </div>
    );
}

/** «Requerido · elige 1» o «Opcional · máximo 2», como en las apps de delivery. */
export function EtiquetaRegla({ grupo }: { grupo: { minimo?: number; maximo?: number | null; obligatorio?: boolean } }) {
    const regla = reglaTexto(grupo);
    const requerido = (grupo.minimo ?? 0) > 0 || !!grupo.obligatorio;
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${requerido ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
            {requerido ? 'Requerido' : 'Opcional'}{regla ? ` · ${regla}` : ''}
        </span>
    );
}
