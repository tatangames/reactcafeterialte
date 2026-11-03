import { useEffect, useState } from "react";

import NumericKeypad, { aplicarTecla } from "./NumericKeypad";
import { ProductoPosInterface } from "../../types/pos";
import { dinero } from "../../utils/formato";

interface Props {
    producto: ProductoPosInterface | null;
    cantidadInicial?: number;
    onCancel: () => void;
    onConfirm: (cantidad: number) => void;
}

// Cantidad exacta con teclado: productos por peso (2.35 lb) o muchas unidades a la vez
export default function CantidadModal({ producto, cantidadInicial, onCancel, onConfirm }: Props) {
    const [valor, setValor] = useState("");

    useEffect(() => {
        if (producto) setValor(cantidadInicial ? String(cantidadInicial) : "");
    }, [producto, cantidadInicial]);

    if (!producto) return null;

    const decimales = producto.permite_fraccion ? 3 : 0;
    const cantidad = Number(valor || 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
                <div>
                    <p className="text-lg font-semibold text-gray-800">{producto.nombre}</p>
                    <p className="text-sm text-gray-500">{dinero(producto.precio)} {producto.unidad ? `por ${producto.unidad}` : "c/u"}</p>
                </div>
                <div className="rounded-xl bg-gray-100 px-4 py-3 text-right">
                    <span className="text-3xl font-semibold text-gray-900">{valor || "0"}</span>
                    <span className="ml-2 text-gray-500">{producto.unidad ?? "u"}</span>
                    <p className="text-sm text-gray-500">{dinero(cantidad * producto.precio)}</p>
                </div>
                <NumericKeypad conPunto={decimales > 0} onTecla={(t) => setValor((v) => aplicarTecla(v, t, decimales))} />
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="flex-1 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                    <button type="button" disabled={cantidad <= 0} onClick={() => onConfirm(cantidad)}
                        className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}
