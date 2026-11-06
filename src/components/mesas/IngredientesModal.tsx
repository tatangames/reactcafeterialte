import { useState } from "react";

import { AjusteNuevo } from "../../services/mesas";
import { AjusteReceta, IngredienteReceta } from "../../types/mesas";
import { cantidad as numero } from "../../utils/formato";

interface Props {
    titulo: string | null;
    receta: IngredienteReceta[];
    actuales: AjusteReceta[];
    isLoading?: boolean;
    onCancel: () => void;
    onConfirm: (ajustes: AjusteNuevo[]) => void;
}

// En unidades se sube de 1 en 1 (huevos); en gramos o mililitros, de media porción
const pasoDe = (i: IngredienteReceta) => (!i.unidad || i.unidad === "u" ? (Number.isInteger(i.base) ? 1 : i.base) : i.base / 2);
const conUnidad = (v: number, i: IngredienteReceta) => `${numero(Math.round(v * 1000) / 1000)}${i.unidad && i.unidad !== "u" ? ` ${i.unidad}` : ""}`;

/**
 * "Solo 1 huevo", "sin queso", "extra frijol": el precio es el mismo, pero en la
 * comanda sale el cambio y del inventario solo se descuenta lo que de verdad salió.
 */
export default function IngredientesModal(props: Props) {
    // Se monta de cero cada vez que se abre: así los valores no se pierden cuando la pantalla se refresca
    return props.titulo ? <Contenido {...props} titulo={props.titulo} /> : null;
}

function Contenido({ titulo, receta, actuales, isLoading, onCancel, onConfirm }: Props & { titulo: string }) {
    const [valores, setValores] = useState<Record<number, number>>(() =>
        Object.fromEntries(receta.map((i) => [i.producto_id, actuales.find((a) => a.producto_id === i.producto_id)?.cantidad ?? i.base])));

    const cambiados = receta.filter((i) => Math.abs((valores[i.producto_id] ?? i.base) - i.base) > 0.0001);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Ingredientes de {titulo}</h2>
                    <p className="text-sm text-gray-500">Lo que pide distinto el cliente. El precio no cambia; cocina lo ve en la comanda.</p>
                </div>

                <ul className="max-h-[55vh] divide-y divide-gray-100 overflow-y-auto">
                    {receta.map((i) => {
                        const valor = valores[i.producto_id] ?? i.base;
                        const paso = pasoDe(i);
                        const poner = (v: number) => setValores((s) => ({ ...s, [i.producto_id]: Math.max(0, Math.round(v * 10000) / 10000) }));
                        const cambio = valor === 0 ? "Sin" : valor < i.base ? "Menos" : valor > i.base ? "Extra" : null;
                        return (
                            <li key={i.producto_id} className="flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-800">{i.nombre}</p>
                                    <p className="text-xs text-gray-500">
                                        Lleva {conUnidad(i.base, i)}
                                        {cambio && <span className={`ml-2 rounded px-1.5 py-0.5 font-semibold ${valor === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{cambio}</span>}
                                    </p>
                                </div>
                                <button type="button" onClick={() => poner(0)} disabled={valor === 0}
                                    className="h-10 rounded-lg bg-red-50 px-3 text-sm font-semibold text-red-700 disabled:opacity-40">Sin</button>
                                <div className="inline-flex h-10 items-stretch overflow-hidden rounded-lg border border-gray-300">
                                    <button type="button" onClick={() => poner(valor - paso)} disabled={valor <= 0} className="w-10 text-xl text-gray-600 disabled:opacity-30" aria-label={`Menos ${i.nombre}`}>−</button>
                                    <span className="flex min-w-[64px] items-center justify-center border-x border-gray-200 px-1 text-sm font-semibold">{conUnidad(valor, i)}</span>
                                    <button type="button" onClick={() => poner(valor + paso)} disabled={valor >= i.base * 5} className="w-10 text-xl text-gray-600 disabled:opacity-30" aria-label={`Más ${i.nombre}`}>+</button>
                                </div>
                                <button type="button" onClick={() => poner(i.base)} disabled={valor === i.base} className="text-xs text-blue-700 disabled:invisible">Normal</button>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-medium">Cancelar</button>
                    <button type="button" disabled={isLoading}
                        onClick={() => onConfirm(cambiados.map((i) => ({ producto_id: i.producto_id, cantidad: valores[i.producto_id] })))}
                        className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {cambiados.length ? `Guardar ${cambiados.length} cambio(s)` : "Dejar normal"}
                    </button>
                </div>
            </div>
        </div>
    );
}
