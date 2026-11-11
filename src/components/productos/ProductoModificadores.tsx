import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import EditorConjuntoModificadores from './EditorConjuntoModificadores';
import VistaTarjetaModificadores from './VistaTarjetaModificadores';
import Cargando from '../ui/loading/Cargando';
import { getGruposConfig, quitarModificadoresProducto } from '../../services/mesas';
import { mensajeError } from '../../utils/formato';

type Config = Awaited<ReturnType<typeof getGruposConfig>>;

/**
 * Los modificadores propios del producto, en bloques (Tipo de leche, Azúcar, Extras): agregar,
 * editar (o copiar de otro producto) y quitar. Se guarda al momento, aparte de «Guardar cambios».
 */
export default function ProductoModificadores({ productoId, nombre }: { productoId: number; nombre: string }) {
    const [config, setConfig] = useState<Config | null>(null);
    const [editando, setEditando] = useState(false);
    const [quitando, setQuitando] = useState(false);

    const cargar = useCallback(() => {
        getGruposConfig().then(setConfig).catch(e => toast.error(mensajeError(e, 'No se pudieron cargar los modificadores')));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const suyos = config?.conjuntos.find(c => c.producto_id === productoId) ?? null;

    const quitar = async () => {
        if (!window.confirm(`¿Quitar los modificadores de «${nombre}»? Se venderá sin elegir nada.`)) return;
        setQuitando(true);
        try {
            toast.success((await quitarModificadoresProducto(productoId)).message);
            cargar();
        } catch (e) {
            toast.error(mensajeError(e, 'No se pudo quitar'));
        } finally {
            setQuitando(false);
        }
    };

    return (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-800">Modificadores</h2>
                    <p className="text-sm text-gray-500">Lo que se elige al vender este producto. Son solo de este producto; se guardan al momento.</p>
                </div>
                {config && (
                    <>
                        <button type="button" onClick={() => setEditando(true)}
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                            {suyos ? 'Editar modificadores' : '+ Agregar modificadores'}
                        </button>
                        {suyos && (
                            <button type="button" onClick={quitar} disabled={quitando}
                                className="rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Quitar</button>
                        )}
                    </>
                )}
            </div>

            {!config ? <Cargando className="py-6" /> : suyos ? (
                <div className="rounded-xl border border-gray-200 p-4"><VistaTarjetaModificadores conjunto={suyos} /></div>
            ) : (
                <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                    No lleva modificadores. Agrégale bloques como «Tipo de leche» o cópialos de otro producto.
                </p>
            )}

            {editando && config && (
                <EditorConjuntoModificadores producto={{ id: productoId, nombre }} conjunto={suyos} conjuntos={config.conjuntos}
                    productos={config.productos} insumos={config.insumos} unidades={config.unidades}
                    onCerrar={() => setEditando(false)} onGuardado={() => { setEditando(false); cargar(); }} />
            )}
        </div>
    );
}
