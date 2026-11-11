import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import EditorConjuntoModificadores from './EditorConjuntoModificadores';
import VistaTarjetaModificadores from './VistaTarjetaModificadores';
import SelectBuscador from '../form/SelectBuscador';
import Cargando from '../ui/loading/Cargando';
import { asignarConjuntoProducto, getConjuntoProducto, getGruposConfig } from '../../services/mesas';
import { mensajeError } from '../../utils/formato';

type Config = Awaited<ReturnType<typeof getGruposConfig>>;
type Conjunto = Config['conjuntos'][number];

/**
 * La tarjeta de modificadores del producto (una sola): elegir una que ya existe, crear una nueva,
 * editarla o quitarla. Cada cambio se guarda al momento, aparte de «Guardar cambios».
 */
export default function ProductoModificadores({ productoId }: { productoId: number }) {
    const [config, setConfig] = useState<Config | null>(null);
    const [suya, setSuya] = useState<number | null>(null);
    const [guardando, setGuardando] = useState(false);
    // undefined: cerrado; null: tarjeta nueva
    const [editando, setEditando] = useState<Conjunto | null | undefined>(undefined);

    const cargar = useCallback(async () => {
        try {
            const [c, p] = await Promise.all([getGruposConfig(), getConjuntoProducto(productoId)]);
            setConfig(c);
            setSuya(p.conjunto_id);
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudieron cargar los modificadores'));
        }
    }, [productoId]);
    useEffect(() => { cargar(); }, [cargar]);

    const asignar = async (conjuntoId: number | null) => {
        setGuardando(true);
        try {
            toast.success((await asignarConjuntoProducto(productoId, conjuntoId)).message);
            await cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const tarjeta = config?.conjuntos.find(c => c.id === suya) ?? null;
    const otros = tarjeta?.productos.filter(p => p.id !== productoId) ?? [];

    return (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">Modificadores</h2>
                <p className="text-sm text-gray-500">Lo que se elige al vender este producto (tipo de leche, azúcar, extras). Lleva una sola tarjeta; se guarda al momento.</p>
            </div>

            {!config ? <Cargando className="py-6" /> : (
                <>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[260px] flex-1">
                            <SelectBuscador value={suya ?? 0} disabled={guardando} placeholder="Buscar tarjeta de modificadores..."
                                opciones={[{ value: 0, label: 'Sin modificadores' }, ...config.conjuntos.map(c => ({ value: c.id, label: c.nombre }))]}
                                onChange={v => (v || null) !== suya && asignar(v || null)} />
                        </div>
                        {tarjeta && (
                            <button type="button" onClick={() => setEditando(tarjeta)}
                                className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-100">Editar tarjeta</button>
                        )}
                        <button type="button" onClick={() => setEditando(null)}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Crear tarjeta nueva</button>
                    </div>

                    {tarjeta ? (
                        <div className="rounded-xl border border-gray-200 p-4">
                            <VistaTarjetaModificadores conjunto={tarjeta} />
                            {otros.length > 0 && <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">También la llevan: {otros.map(p => p.nombre).join(', ')}. Si la editas, cambia en todos.</p>}
                        </div>
                    ) : (
                        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                            Este producto no lleva modificadores. Elige una tarjeta que ya exista o crea una nueva.
                        </p>
                    )}
                </>
            )}

            {editando !== undefined && config && (
                <EditorConjuntoModificadores conjunto={editando} conjuntos={config.conjuntos}
                    // Desde aquí el producto se puede pasar a la tarjeta nueva aunque tenga otra: se le quita antes
                    productos={config.productos} insumos={config.insumos} unidades={config.unidades}
                    productosIniciales={suya ? [] : [productoId]}
                    onCerrar={() => setEditando(undefined)}
                    onGuardado={async (id) => {
                        const nueva = editando === null;
                        setEditando(undefined);
                        if (nueva && suya && id) await asignar(id);
                        else await cargar();
                    }} />
            )}
        </div>
    );
}
