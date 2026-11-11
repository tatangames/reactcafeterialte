import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import EditorConjuntoModificadores from './EditorConjuntoModificadores';
import VistaTarjetaModificadores from './VistaTarjetaModificadores';
import ConfirmDeleteModal from '../modal/ConfirmDeleteModal';
import Cargando from '../ui/loading/Cargando';
import { getGruposConfig, quitarModificadoresProducto } from '../../services/mesas';
import { mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';

type Config = Awaited<ReturnType<typeof getGruposConfig>>;
type Conjunto = Config['conjuntos'][number];

// Pestaña «Modificadores» del catálogo: los productos que tienen modificadores, cada uno con sus
// propios bloques (Tipo de leche, Azúcar, Extras). Cambiar los de uno no toca a ningún otro.
export default function ModificadoresPanel() {
    const [config, setConfig] = useState<Config | null>(null);
    const [buscar, setBuscar] = useState('');
    // undefined: cerrado; null: agregar a un producto que aún no tiene
    const [editando, setEditando] = useState<Conjunto | null | undefined>(undefined);
    const [quitando, setQuitando] = useState<Conjunto | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const cargar = useCallback(() => {
        getGruposConfig().then(setConfig).catch(e => toast.error(mensajeError(e, 'Error al cargar los modificadores')));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    // Busca por producto, bloque u opción, sin importar tildes
    const visibles = useMemo(() => {
        const t = sinTildes(buscar.trim());
        const lista = config?.conjuntos ?? [];
        if (!t) return lista;
        return lista.filter(c => [c.producto, ...c.bloques.flatMap(b => [b.nombre, ...b.opciones.map(o => o.nombre)])]
            .some(texto => sinTildes(texto).includes(t)));
    }, [config, buscar]);

    const quitar = async () => {
        if (!quitando) return;
        setIsDeleting(true);
        try {
            toast.success((await quitarModificadoresProducto(quitando.producto_id)).message);
            setQuitando(null);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo quitar'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setEditando(null)}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Agregar a un producto</button>
                <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar producto, bloque u opción..."
                    className="h-[42px] w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:w-[320px]" />
            </div>
            {config && <p className="mb-3 text-sm text-gray-500">{config.conjuntos.length} producto(s) con modificadores. Los de cada producto son solo suyos.</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {!config && <Cargando className="col-span-full py-10" />}
                {config && config.conjuntos.length === 0 && (
                    <p className="text-sm text-gray-500">Ningún producto tiene modificadores todavía. Agrégale al Chocolate sus bloques: Tipo de leche, Azúcar, Extras.</p>
                )}
                {config && config.conjuntos.length > 0 && visibles.length === 0 && <p className="text-sm text-gray-500">Nada coincide con «{buscar.trim()}».</p>}
                {visibles.map(c => (
                    <div key={c.id} className="flex flex-col rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                            <p className="flex-1 font-semibold">{c.producto}</p>
                            <button type="button" onClick={() => setEditando(c)} className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100">Editar</button>
                            <button type="button" onClick={() => setQuitando(c)} className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">Quitar</button>
                        </div>
                        <div className="flex-1 px-4 py-3"><VistaTarjetaModificadores conjunto={c} /></div>
                    </div>
                ))}
            </div>

            {editando !== undefined && config && (
                <EditorConjuntoModificadores producto={editando ? { id: editando.producto_id, nombre: editando.producto } : null}
                    conjunto={editando} conjuntos={config.conjuntos} productos={config.productos}
                    insumos={config.insumos} unidades={config.unidades}
                    onCerrar={() => setEditando(undefined)} onGuardado={() => { setEditando(undefined); cargar(); }} />
            )}
            <ConfirmDeleteModal isOpen={!!quitando} onClose={() => setQuitando(null)} onConfirm={quitar} isDeleting={isDeleting}
                title="Quitar modificadores"
                description="El producto se venderá sin elegir nada. Los demás productos no cambian, ni las ventas anteriores."
                itemName={quitando?.producto ?? ''} />
        </div>
    );
}
