import { ConsumoTurnoInterface, PorComprarInterface } from "../../types/caja";
import { cantidad, dinero } from "../../utils/formato";

/**
 * Lo que quedó en su mínimo o por debajo: la lista de compras que deja un turno
 * para el siguiente. Lo que está arriba del mínimo no aparece.
 */
export function PorComprar({ productos, titulo = "Por comprar" }: { productos: PorComprarInterface[]; titulo?: string }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold text-gray-800">{titulo}</h2>
            <p className="mb-3 text-xs text-gray-500">Insumos y productos en su mínimo o por debajo</p>
            {productos.length === 0
                ? <p className="text-sm text-green-700">Nada bajo el mínimo</p>
                : (
                    <ul className="space-y-2 text-sm">
                        {productos.map(p => (
                            <li key={p.producto_id} className="flex justify-between gap-3">
                                <span className="text-gray-800">{p.producto}</span>
                                <span className={`whitespace-nowrap text-right ${p.stock_actual <= 0 ? "text-red-600 font-medium" : "text-amber-700"}`}>
                                    hay {cantidad(p.stock_actual, p.unidad)}
                                    <span className="block text-xs text-gray-400">mín. {cantidad(p.stock_minimo, p.unidad)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
}

// Lo que salió del inventario con las ventas del turno, incluidos los insumos de las recetas
export function ConsumoTurno({ consumo }: { consumo: ConsumoTurnoInterface[] }) {
    if (consumo.length === 0) return null;
    const conInterno = consumo.some(c => c.consumo_interno > 0);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-800">Salió del inventario</h2>
            <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="text-left text-xs text-gray-500">
                        <tr>
                            <th className="pb-2">Producto</th>
                            <th className="pb-2 pl-3 text-right">Vendido</th>
                            {conInterno && <th className="pb-2 pl-3 text-right">Consumo int.</th>}
                            <th className="pb-2 pl-3 text-right">Costo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {consumo.map(c => (
                            <tr key={c.producto_id}>
                                <td className="py-1.5 text-gray-800">{c.producto}</td>
                                <td className="whitespace-nowrap py-1.5 pl-3 text-right">{c.vendido > 0 ? cantidad(c.vendido, c.unidad) : "—"}</td>
                                {conInterno && <td className="whitespace-nowrap py-1.5 pl-3 text-right">{c.consumo_interno > 0 ? cantidad(c.consumo_interno, c.unidad) : "—"}</td>}
                                <td className="whitespace-nowrap py-1.5 pl-3 text-right text-gray-500">{dinero(c.costo)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
