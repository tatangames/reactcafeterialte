import { ConjuntoConfigInterface } from '../../services/mesas';
import { dinero } from '../../utils/formato';
import { minimoDe, reglaTexto } from '../../utils/modificadores';

/** «Requerido · elige 1» u «Opcional · máximo 2», como en las apps de delivery. */
export function EtiquetaRegla({ grupo }: { grupo: { minimo?: number; maximo?: number | null; obligatorio?: boolean } }) {
    const regla = reglaTexto(grupo);
    const requerido = minimoDe(grupo) > 0;
    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${requerido ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            {requerido ? 'Requerido' : 'Opcional'}{regla ? ` · ${regla}` : ''}
        </span>
    );
}

/** Los bloques de una tarjeta, numerados y con sus opciones, como los verá el mesero. */
export default function VistaTarjetaModificadores({ conjunto }: { conjunto: ConjuntoConfigInterface }) {
    return (
        <div className="divide-y divide-gray-100">
            {conjunto.bloques.map((g, n) => (
                <div key={g.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{n + 1}. {g.nombre}</p>
                        <EtiquetaRegla grupo={g} />
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                        {g.opciones.filter(o => o.activo).map(o => (
                            <li key={o.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="h-3 w-3 shrink-0 rounded-full border border-gray-400" />
                                <span className="min-w-0 flex-1">
                                    {o.nombre}{o.precio > 0 ? ` (+${dinero(o.precio)})` : ''}
                                    {(o.maximo ?? 1) > 1 && <span className="ml-1 text-xs text-gray-400">hasta {o.maximo}</span>}
                                    {o.insumo && <span className="ml-1 text-xs text-gray-400">· descuenta {o.cantidad} {o.unidad ?? ''} de {o.insumo}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
