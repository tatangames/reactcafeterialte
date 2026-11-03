import { useEffect, useState } from "react";

import QtyStepper from "../form/QtyStepper";
import { dinero } from "../../utils/formato";
import { GrupoModificadorInterface, ProductoMesaInterface } from "../../types/mesas";

interface Props {
    producto: ProductoMesaInterface | null;
    grupos: GrupoModificadorInterface[];
    onCancel: () => void;
    onConfirm: (datos: { modificadores: number[]; cantidad: number; notas: string }) => void;
}

// Elegir extras (leche, saborizante, tamaño), cantidad y nota de un producto
export default function ModificadoresModal({ producto, grupos, onCancel, onConfirm }: Props) {
    const [elegidos, setElegidos] = useState<Record<number, number[]>>({});
    const [cantidad, setCantidad] = useState(1);
    const [notas, setNotas] = useState("");

    useEffect(() => {
        setElegidos({});
        setCantidad(1);
        setNotas("");
    }, [producto]);

    if (!producto) return null;

    const suyos = grupos.filter((g) => producto.grupos.includes(g.id));
    const extra = suyos.reduce((s, g) => s + g.opciones.filter((o) => elegidos[g.id]?.includes(o.id)).reduce((t, o) => t + o.precio, 0), 0);
    const faltan = suyos.filter((g) => g.obligatorio && !(elegidos[g.id]?.length));
    const unitario = producto.precio + extra;

    const alternar = (g: GrupoModificadorInterface, id: number) =>
        setElegidos((e) => {
            const actuales = e[g.id] ?? [];
            const siguiente = actuales.includes(id)
                ? actuales.filter((x) => x !== id)
                : g.multiple ? [...actuales, id] : [id];
            return { ...e, [g.id]: siguiente };
        });

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3">
            <div className="flex max-h-[94vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="text-xl font-semibold">{producto.nombre}</h2>
                    <p className="text-sm text-gray-500">{dinero(producto.precio)}</p>
                </div>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
                    {suyos.map((g) => (
                        <div key={g.id}>
                            <p className="mb-2 text-sm font-semibold text-gray-800">
                                {g.nombre}
                                <span className="ml-2 text-xs font-normal text-gray-500">{g.obligatorio ? "obligatorio" : "opcional"}{g.multiple ? " · varios" : ""}</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {g.opciones.map((o) => {
                                    const activo = elegidos[g.id]?.includes(o.id);
                                    return (
                                        <button key={o.id} type="button" onClick={() => alternar(g, o.id)}
                                            className={`min-h-14 rounded-xl border-2 px-3 py-2 text-left text-sm transition ${activo ? "border-blue-600 bg-blue-50 font-semibold text-blue-800" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                                            <span className="block">{o.nombre}</span>
                                            {o.precio > 0 && <span className="text-xs text-gray-500">+{dinero(o.precio)}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    <div>
                        <p className="mb-2 text-sm font-semibold text-gray-800">Nota para cocina</p>
                        <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={200} placeholder="Ej.: con hielo aparte, sin azúcar"
                            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-base focus:border-blue-400 focus:outline-none" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-6 py-4">
                    <QtyStepper value={cantidad} min={1} onChange={setCantidad} size="lg" ariaLabel="Cantidad" />
                    {faltan.length > 0 && <p className="text-sm text-amber-700">Elige {faltan.map((g) => g.nombre).join(", ")}</p>}
                    <div className="ml-auto flex gap-2">
                        <button type="button" onClick={onCancel} className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-200">Cancelar</button>
                        <button type="button" disabled={faltan.length > 0}
                            onClick={() => onConfirm({ modificadores: Object.values(elegidos).flat(), cantidad, notas: notas.trim() })}
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-40">
                            Agregar {dinero(unitario * cantidad)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
