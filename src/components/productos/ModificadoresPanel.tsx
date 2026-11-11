import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import EditorConjuntoModificadores from './EditorConjuntoModificadores';
import VistaTarjetaModificadores from './VistaTarjetaModificadores';
import ConfirmDeleteModal from '../modal/ConfirmDeleteModal';
import Cargando from '../ui/loading/Cargando';
import { borrarConjunto, getGruposConfig } from '../../services/mesas';
import { mensajeError } from '../../utils/formato';
import { sinTildes } from '../../utils/texto';

type Config = Awaited<ReturnType<typeof getGruposConfig>>;
type Conjunto = Config['conjuntos'][number];

// Tarjetas de modificadores (pestaña «Modificadores» del catálogo): cada una con sus bloques
// (Tipo de leche, Azúcar, Extras) y los productos que la llevan
export default function ModificadoresPanel() {
    const [config, setConfig] = useState<Config | null>(null);
    const [buscar, setBuscar] = useState('');
    // undefined: cerrado; null: tarjeta nueva
    const [editando, setEditando] = useState<Conjunto | null | undefined>(undefined);
    const [borrando, setBorrando] = useState<Conjunto | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const cargar = useCallback(() => {
        getGruposConfig().then(setConfig).catch(e => toast.error(mensajeError(e, 'Error al cargar los modificadores')));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    // Busca por nombre de la tarjeta, de sus bloques u opciones, o de los productos que la llevan
    const visibles = useMemo(() => {
        const t = sinTildes(buscar.trim());
        const lista = config?.conjuntos ?? [];
        if (!t) return lista;
        return lista.filter(c => [c.nombre, ...c.bloques.flatMap(b => [b.nombre, ...b.opciones.map(o => o.nombre)]), ...c.productos.map(p => p.nombre)]
            .some(texto => sinTildes(texto).includes(t)));
    }, [config, buscar]);

    const borrar = async () => {
        if (!borrando) return;
        setIsDeleting(true);
        try {
            toast.success((await borrarConjunto(borrando.id)).message);
            setBorrando(null);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo borrar'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setEditando(null)}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">+ Nueva tarjeta</button>
                <input type="text" value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar tarjeta, bloque, opción o producto..."
                    className="h-[42px] w-full rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:w-[320px]" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {!config && <Cargando className="col-span-full py-10" />}
                {config && config.conjuntos.length === 0 && (
                    <p className="text-sm text-gray-500">Aún no hay modificadores. Crea una tarjeta como «Bebidas con leche» con sus bloques: Tipo de leche, Azúcar, Extras.</p>
                )}
                {config && config.conjuntos.length > 0 && visibles.length === 0 && <p className="text-sm text-gray-500">Ninguna tarjeta coincide con «{buscar.trim()}».</p>}
                {visibles.map(c => (
                    <div key={c.id} className="flex flex-col rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                            <p className="flex-1 font-semibold">{c.nombre}</p>
                            <button type="button" onClick={() => setEditando(c)} className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100">Editar</button>
                            <button type="button" onClick={() => setBorrando(c)} className="rounded-md px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">Borrar</button>
                        </div>
                        <div className="flex-1 px-4 py-3"><VistaTarjetaModificadores conjunto={c} /></div>
                        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
                            {c.productos.length ? <>En: <span className="text-gray-700">{c.productos.map(p => p.nombre).join(', ')}</span></> : 'No está asignada a ningún producto'}
                        </p>
                    </div>
                ))}
            </div>

            {editando !== undefined && config && (
                <EditorConjuntoModificadores conjunto={editando} conjuntos={config.conjuntos} productos={config.productos}
                    insumos={config.insumos} unidades={config.unidades}
                    onCerrar={() => setEditando(undefined)} onGuardado={() => { setEditando(undefined); cargar(); }} />
            )}
            <ConfirmDeleteModal isOpen={!!borrando} onClose={() => setBorrando(null)} onConfirm={borrar} isDeleting={isDeleting}
                title="Borrar tarjeta de modificadores"
                description={`Sus productos quedan sin modificadores${borrando?.productos.length ? ` (${borrando.productos.map(p => p.nombre).join(', ')})` : ''}. Las ventas anteriores no cambian.`}
                itemName={borrando?.nombre ?? ''} />
        </div>
    );
}
