import { useMemo, useState } from "react";

import { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { cantidad as formatoCantidad, dinero } from "../../utils/formato";
import { ProductoCompraInterface, UnidadCompraInterface } from "../../types/compras";
import { sinTildes } from "../../utils/texto";

export interface LineaCompra {
    clave: string;
    producto_id: number;
    unidad_medida_id: number | null;
    cantidad: string;
    costo_unitario: string;
    orden_detalle_id?: number | null;
    pendiente?: number;           // lo que falta recibir de la orden (en la unidad de la línea)
}

interface Props {
    lineas: LineaCompra[];
    productos: ProductoCompraInterface[];
    unidades: UnidadCompraInterface[];
    onChange: (lineas: LineaCompra[]) => void;
    bloquearProductos?: boolean;  // recepción de una orden: no se agregan productos nuevos
}

// Filtro del buscador: se recuerda el último que usaste
const TIPOS = [
    { valor: "todos", texto: "Todos" },
    { valor: "materia_prima", texto: "Materia prima" },
    { valor: "reventa", texto: "Reventa" },
    { valor: "empaque", texto: "Empaque" },
    { valor: "producto_terminado", texto: "Elaborados" },
];
const CLAVE_TIPO = "compras.tipoBusqueda";
const leerTipo = () => {
    try {
        return localStorage.getItem(CLAVE_TIPO) ?? "todos";
    } catch {
        return "todos";
    }
};

export const subtotalLinea = (l: LineaCompra) => Math.round(Number(l.cantidad || 0) * Number(l.costo_unitario || 0) * 100) / 100;

// Productos de una orden o compra: unidad de compra con su conversión a la unidad del inventario
export default function LineasCompra({ lineas, productos, unidades, onChange, bloquearProductos = false }: Props) {
    const [busqueda, setBusqueda] = useState("");
    const [tipo, setTipo] = useState(leerTipo);
    const [abierto, setAbierto] = useState(false);

    const elegirTipo = (v: string) => {
        setTipo(v);
        try {
            localStorage.setItem(CLAVE_TIPO, v);
        } catch {
            /* sin almacenamiento: solo no se recuerda */
        }
    };

    const delTipo = useMemo(() => (tipo === "todos" ? productos : productos.filter((p) => p.clase === tipo)), [tipo, productos]);
    const cuantos = (v: string) => (v === "todos" ? productos.length : productos.filter((p) => p.clase === v).length);

    // Con un tipo elegido, al tocar el buscador ya aparece la lista de ese tipo sin escribir nada
    const sugerencias = useMemo(() => {
        const t = sinTildes(busqueda.trim());
        if (!t) return tipo !== "todos" && abierto ? delTipo.slice(0, 30) : [];
        return delTipo.filter((p) => sinTildes(p.nombre).includes(t) || p.sku?.toLowerCase() === t).slice(0, 8);
    }, [busqueda, delTipo, tipo, abierto]);
    const tipoActual = TIPOS.find((x) => x.valor === tipo);

    const [recienAgregada, setRecienAgregada] = useState<string | null>(null);

    // La cantidad empieza vacía (antes era 1 y se quedaba sin cambiar): el cursor salta ahí
    const agregar = (p: ProductoCompraInterface) => {
        if (!lineas.some((l) => l.producto_id === p.id)) {
            const clave = `${p.id}-${Date.now()}`;
            setRecienAgregada(clave);
            onChange([...lineas, {
                clave, producto_id: p.id, unidad_medida_id: p.unidad_medida_id,
                cantidad: "", costo_unitario: p.costo_unitario ? String(p.costo_unitario) : "",
            }]);
        }
        setBusqueda("");
    };

    const cambiar = (clave: string, cambios: Partial<LineaCompra>) =>
        onChange(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

    // Al cambiar la unidad se ajusta el costo para que siga representando lo mismo
    const cambiarUnidad = (l: LineaCompra, nueva: number) => {
        const antes = unidades.find((u) => u.id === l.unidad_medida_id);
        const despues = unidades.find((u) => u.id === nueva);
        const costo = Number(l.costo_unitario || 0);
        const ajustado = antes && despues && costo > 0 ? Math.round(costo * despues.factor_base / antes.factor_base * 10000) / 10000 : costo;
        cambiar(l.clave, { unidad_medida_id: nueva, costo_unitario: ajustado ? String(ajustado) : l.costo_unitario });
    };

    return (
        <div className="space-y-3">
            {!bloquearProductos && (
                <div className="relative space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        {TIPOS.filter((x) => x.valor === "todos" || cuantos(x.valor) > 0).map((x) => (
                            <button key={x.valor} type="button" onClick={() => elegirTipo(x.valor)}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${tipo === x.valor ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                {x.texto} <span className="opacity-70">({cuantos(x.valor)})</span>
                            </button>
                        ))}
                    </div>
                    <input className={inputClass} value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        onFocus={() => setAbierto(true)} onBlur={() => setAbierto(false)}
                        placeholder={tipo === "todos" ? "Buscar producto o materia prima para agregar" : `Buscar en ${tipoActual?.texto.toLowerCase()} o elegir de la lista`} />
                    {busqueda.trim() && sugerencias.length === 0 && (
                        <p className="text-xs text-gray-500">No hay coincidencias en {tipoActual?.texto.toLowerCase()}.{tipo !== "todos" && <button type="button" onClick={() => elegirTipo("todos")} className="ml-1 text-blue-600 hover:underline">Buscar en todos</button>}</p>
                    )}
                    {sugerencias.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {sugerencias.map((p) => (
                                <button key={p.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(p)}
                                    className="flex w-full justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50">
                                    <span>{p.nombre} <span className="text-xs text-gray-400">{p.unidad ?? ""}</span></span>
                                    <span className="text-gray-500">costo {dinero(p.costo_unitario, "$", p.costo_unitario < 1 ? 4 : 2)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {lineas.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-3 py-2">Producto</th>
                                <th className="px-3 py-2 w-32">Unidad</th>
                                <th className="px-3 py-2 w-28">Cantidad</th>
                                <th className="px-3 py-2 w-32">Costo unitario</th>
                                <th className="px-3 py-2 w-24 text-right">Subtotal</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lineas.map((l) => {
                                const producto = productos.find((p) => p.id === l.producto_id);
                                const unidad = unidades.find((u) => u.id === l.unidad_medida_id);
                                const base = unidades.find((u) => u.id === producto?.unidad_medida_id);
                                const opciones = unidades.filter((u) => !producto?.unidad_tipo || u.tipo === producto.unidad_tipo);
                                const cant = Number(l.cantidad || 0);
                                const cantBase = unidad && base ? cant * unidad.factor_base / base.factor_base : cant;
                                const sub = subtotalLinea(l);
                                const conversion = unidad && base && unidad.id !== base.id && cant > 0;
                                return (
                                    <tr key={l.clave} className="align-top">
                                        <td className="px-3 py-2">
                                            <p className="font-medium text-gray-800">{producto?.nombre ?? `#${l.producto_id}`}</p>
                                            {conversion && (
                                                <p className="text-xs text-gray-500">
                                                    = {formatoCantidad(Math.round(cantBase * 1000) / 1000, base.abreviatura)}
                                                    {sub > 0 && cantBase > 0 ? ` · ${dinero(sub / cantBase, "$", 4)}/${base.abreviatura}` : ""}
                                                </p>
                                            )}
                                            {l.pendiente !== undefined && <p className="text-xs text-amber-700">Pendiente de la orden: {formatoCantidad(l.pendiente, unidad?.abreviatura)}</p>}
                                            {producto && !producto.controla_stock && <p className="text-xs text-gray-400">No lleva inventario</p>}
                                        </td>
                                        <td className="px-3 py-2">
                                            <select className={`${inputClass} !px-2`} value={l.unidad_medida_id ?? ""} disabled={!!l.orden_detalle_id}
                                                onChange={(e) => cambiarUnidad(l, Number(e.target.value))}>
                                                {opciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <MoneyInput decimals={producto?.permite_fraccion || (unidad && base && unidad.id !== base.id) ? 3 : 0} placeholder="¿Cuánto?"
                                                autoFocus={l.clave === recienAgregada}
                                                className={Number(l.cantidad || 0) > 0 ? "" : "!border-red-300 bg-red-50"}
                                                value={l.cantidad} onChange={(v) => cambiar(l.clave, { cantidad: v })} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <MoneyInput prefix="$" decimals={4} value={l.costo_unitario} onChange={(v) => cambiar(l.clave, { costo_unitario: v })} />
                                        </td>
                                        <td className="px-3 py-2 pt-4 text-right font-semibold">{dinero(sub)}</td>
                                        <td className="px-1 py-2">
                                            <button type="button" onClick={() => onChange(lineas.filter((x) => x.clave !== l.clave))}
                                                className="mt-1 h-9 w-9 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar">✕</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
