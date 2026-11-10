import { useState } from "react";

import QtyStepper from "../form/QtyStepper";
import { dinero } from "../../utils/formato";
import { GrupoModificadorInterface, ProductoMesaInterface } from "../../types/mesas";

type Opcion = GrupoModificadorInterface["opciones"][number];

// Elegir una opción en su grupo: «una sola» quita las demás; cualquier otra quita las «una sola»
const conOpcion = (g: GrupoModificadorInterface, actuales: number[], o: Opcion, veces: number): number[] => {
    const exclusiva = (id: number) => !!g.opciones.find((x) => x.id === id)?.exclusiva;
    const resto = o.exclusiva ? [] : actuales.filter((id) => id !== o.id && !exclusiva(id));
    return [...resto, ...Array<number>(veces).fill(o.id)];
};

interface Props {
    // Sirve para la mesa y la venta rápida: solo usa id, nombre, precio y grupos
    producto: Pick<ProductoMesaInterface, "id" | "nombre" | "precio" | "grupos"> | null;
    grupos: GrupoModificadorInterface[];
    // Al editar una línea ya agregada: abre con lo que tenía elegido
    inicial?: { modificadores: number[]; cantidad: number; notas?: string } | null;
    onCancel: () => void;
    onConfirm: (datos: { modificadores: number[]; cantidad: number; notas: string }) => void;
}

// Elegir extras (leche, saborizante, tamaño), cantidad y nota de un producto
export default function ModificadoresModal(props: Props) {
    // Se monta de cero por producto: empieza sin extras (o con los de la línea que se edita)
    return props.producto ? <Contenido key={props.producto.id} {...props} producto={props.producto} /> : null;
}

function Contenido({ producto, grupos, inicial, onCancel, onConfirm }: Props & { producto: NonNullable<Props["producto"]> }) {
    // Por grupo, los ids elegidos; uno repetido es la misma opción pedida varias veces (Huevo extra ×2)
    const [elegidos, setElegidos] = useState<Record<number, number[]>>(() => {
        const ids = inicial?.modificadores ?? [];
        // Las obligatorias empiezan marcadas (también al editar una línea que no las tenía)
        return Object.fromEntries(grupos.filter((g) => producto.grupos.includes(g.id))
            .map((g) => [g.id, g.opciones.flatMap((o) => {
                const n = ids.filter((x) => x === o.id).length;
                return Array<number>(o.obligatorio ? Math.max(1, n) : n).fill(o.id);
            })]));
    });
    const [cantidad, setCantidad] = useState(inicial?.cantidad ?? 1);
    const [notas, setNotas] = useState(inicial?.notas ?? "");

    const suyos = grupos.filter((g) => producto.grupos.includes(g.id));
    const veces = (g: GrupoModificadorInterface, id: number) => (elegidos[g.id] ?? []).filter((x) => x === id).length;
    const extra = suyos.reduce((s, g) => s + g.opciones.reduce((t, o) => t + o.precio * veces(g, o.id), 0), 0);
    const unitario = producto.precio + extra;
    // Grupo obligatorio: hay que elegir al menos una de sus opciones (Huevos: cómo van)
    const faltan = suyos.filter((g) => g.obligatorio && g.opciones.length > 0 && !(elegidos[g.id]?.length));

    // Tocar marca o quita; una obligatoria no se quita
    const alternar = (g: GrupoModificadorInterface, o: Opcion) =>
        setElegidos((e) => {
            const actuales = e[g.id] ?? [];
            if (actuales.includes(o.id)) return o.obligatorio ? e : { ...e, [g.id]: actuales.filter((x) => x !== o.id) };
            return { ...e, [g.id]: conOpcion(g, actuales, o, 1) };
        });

    // Opción con máximo (Huevo extra hasta 3): + y − cambian cuántas van
    // Una obligatoria no baja de 1
    const cambiarVeces = (g: GrupoModificadorInterface, o: Opcion, delta: number, maximo: number) =>
        setElegidos((e) => {
            const actuales = e[g.id] ?? [];
            const n = actuales.filter((x) => x === o.id).length;
            const nuevo = Math.min(maximo, Math.max(o.obligatorio ? 1 : 0, n + delta));
            if (nuevo === 0) return { ...e, [g.id]: actuales.filter((x) => x !== o.id) };
            return { ...e, [g.id]: conOpcion(g, actuales, o, nuevo) };
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
                                {g.obligatorio && <span className="ml-2 text-xs font-normal text-amber-700">elige al menos una</span>}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {g.opciones.map((o) => {
                                    const activo = elegidos[g.id]?.includes(o.id);
                                    // Sin existencia de su insumo no se elige (si ya venía elegida, se puede quitar)
                                    const agotada = !!o.agotado && !activo;
                                    const maximo = Math.max(1, o.maximo ?? 1);
                                    if (maximo > 1 && !agotada) {
                                        const n = veces(g, o.id);
                                        return (
                                            <div key={o.id} className={`min-h-14 rounded-xl border-2 px-3 py-2 text-sm ${n > 0 ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                                                <button type="button" onClick={() => n === 0 && cambiarVeces(g, o, 1, maximo)} className="block w-full text-left">
                                                    <span className={`block ${n > 0 ? "font-semibold text-blue-800" : "text-gray-700"}`}>{o.nombre}</span>
                                                    <span className="text-xs text-gray-500">{o.precio > 0 ? `+${dinero(o.precio)} c/u · ` : ""}hasta {maximo}{o.obligatorio ? " · siempre va" : ""}</span>
                                                </button>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <button type="button" onClick={() => cambiarVeces(g, o, -1, maximo)} disabled={n <= (o.obligatorio ? 1 : 0)} aria-label={`Quitar ${o.nombre}`}
                                                        className="h-9 w-9 rounded-lg bg-white text-lg font-bold text-gray-700 shadow-sm disabled:opacity-30">−</button>
                                                    <span className="w-6 text-center text-base font-bold">{n}</span>
                                                    <button type="button" onClick={() => cambiarVeces(g, o, 1, maximo)} disabled={n >= maximo} aria-label={`Agregar ${o.nombre}`}
                                                        className="h-9 w-9 rounded-lg bg-white text-lg font-bold text-gray-700 shadow-sm disabled:opacity-30">+</button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button key={o.id} type="button" onClick={() => alternar(g, o)} disabled={agotada}
                                            title={agotada ? "No hay existencia de su insumo" : undefined}
                                            className={`min-h-14 rounded-xl border-2 px-3 py-2 text-left text-sm transition ${activo ? "border-blue-600 bg-blue-50 font-semibold text-blue-800" : agotada ? "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 text-gray-400" : "border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                                            <span className={`block ${agotada ? "line-through" : ""}`}>{o.nombre}</span>
                                            {agotada ? <span className="text-xs font-semibold text-red-600">Agotado</span>
                                                : (o.precio > 0 || o.obligatorio) && <span className="text-xs text-gray-500">{[o.precio > 0 ? `+${dinero(o.precio)}` : "", o.obligatorio ? "siempre va" : ""].filter(Boolean).join(" · ")}</span>}
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
                            {inicial ? "Guardar" : "Agregar"} {dinero(unitario * cantidad)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
