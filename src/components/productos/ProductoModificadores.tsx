import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import EditorConjuntoModificadores from './EditorConjuntoModificadores';
import VistaTarjetaModificadores from './VistaTarjetaModificadores';
import Cargando from '../ui/loading/Cargando';
import { BloqueGuardar, ConjuntoConfigInterface, getGruposConfig, quitarModificadoresProducto } from '../../services/mesas';
import { mensajeError } from '../../utils/formato';

type Config = Awaited<ReturnType<typeof getGruposConfig>>;

/** Los bloques aún sin guardar (producto nuevo) con la forma de la vista. */
const aVista = (bloques: BloqueGuardar[], config: Config): ConjuntoConfigInterface => ({
    id: 0, producto_id: 0, producto: '',
    bloques: bloques.map((b, n) => ({
        id: -(n + 1), nombre: b.nombre, minimo: b.minimo, maximo: b.maximo, obligatorio: b.minimo > 0, multiple: true, activo: true,
        productos: [],
        opciones: b.opciones.map((o, k) => {
            const insumo = config.insumos.find(i => i.id === o.producto_id);
            return {
                id: -(n * 100 + k + 1), nombre: o.nombre, precio: o.precio, activo: o.activo, maximo: o.maximo,
                obligatorio: o.obligatorio, exclusiva: o.exclusiva, producto_id: o.producto_id, insumo: insumo?.nombre ?? null,
                cantidad: o.cantidad, unidad_medida_id: o.unidad_medida_id,
                unidad: config.unidades.find(u => u.id === o.unidad_medida_id)?.abreviatura ?? null,
            };
        }),
    })),
});

interface Props {
    productoId: number | null;   // null: producto nuevo; sus modificadores se guardan al guardar el producto
    nombre: string;
    pendientes?: BloqueGuardar[] | null;
    onPendientes?: (bloques: BloqueGuardar[] | null) => void;
}

/**
 * Los modificadores propios del producto, en bloques (Tipo de leche, Azúcar, Extras). En un producto
 * ya guardado se guardan al momento; en uno nuevo, junto con el producto.
 */
export default function ProductoModificadores({ productoId, nombre, pendientes = null, onPendientes }: Props) {
    const [config, setConfig] = useState<Config | null>(null);
    const [editando, setEditando] = useState(false);
    const [quitando, setQuitando] = useState(false);
    const [falla, setFalla] = useState<string | null>(null);

    const cargar = useCallback(() => {
        setFalla(null);
        getGruposConfig()
            .then(datos => {
                // Una respuesta sin la lista de modificadores (API sin actualizar) también es falla
                if (!datos || !Array.isArray(datos.conjuntos)) throw new Error('El servidor no envió los modificadores. ¿Está actualizada la API?');
                setConfig(datos);
            })
            .catch(e => setFalla(e?.code === 'ECONNABORTED' ? 'El servidor tardó demasiado en responder.' : mensajeError(e, 'No se pudieron cargar los modificadores.')));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const nuevo = productoId === null;
    const suyos = !config ? null
        : nuevo ? (pendientes?.length ? aVista(pendientes, config) : null)
            : config.conjuntos.find(c => c.producto_id === productoId) ?? null;

    const quitar = async () => {
        if (nuevo) return onPendientes?.(null);
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
                    <p className="text-sm text-gray-500">
                        Lo que se elige al vender este producto (tipo de leche, azúcar, extras). Son solo de este producto
                        {nuevo ? '; se guardan junto con él.' : '; se guardan al momento.'}
                    </p>
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

            {!config && falla ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700">
                    <p>No se pudieron cargar los modificadores. {falla}</p>
                    <button type="button" onClick={cargar}
                        className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-700 hover:bg-red-100">Reintentar</button>
                </div>
            ) : !config ? <Cargando className="py-6" /> : suyos ? (
                <div className="rounded-xl border border-gray-200 p-4"><VistaTarjetaModificadores conjunto={suyos} /></div>
            ) : (
                <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                    No lleva modificadores. Agrégale bloques como «Tipo de leche» o «Azúcar» si al venderlo hay que elegir algo.
                </p>
            )}

            {editando && config && (
                <EditorConjuntoModificadores producto={{ id: productoId, nombre }}
                    // En uno nuevo se vuelven a abrir los bloques que ya se armaron
                    conjunto={nuevo ? (pendientes?.length ? aVista(pendientes, config) : null) : suyos}
                    insumos={config.insumos} unidades={config.unidades}
                    onCerrar={() => setEditando(false)}
                    onGuardado={(bloques) => {
                        setEditando(false);
                        if (nuevo) onPendientes?.(bloques);
                        else cargar();
                    }} />
            )}
        </div>
    );
}
