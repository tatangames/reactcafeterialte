import { useEffect, useState } from "react";

import NumericKeypad, { aplicarTecla } from "./NumericKeypad";
import { DescuentoInterface, TipoDescuento } from "../../types/pos";
import { montoDescuento } from "../../utils/carrito";
import { dinero } from "../../utils/formato";

interface Props {
    isOpen: boolean;
    titulo: string;
    importe: number;                    // sobre qué monto se aplica
    actual: DescuentoInterface | null;
    maximoSinAutorizacion: number;      // % de la configuración
    onCancel: () => void;
    onConfirm: (descuento: DescuentoInterface | null) => void;
}

// Descuento por porcentaje o monto, para una línea o para toda la venta
export default function DescuentoModal({ isOpen, titulo, importe, actual, maximoSinAutorizacion, onCancel, onConfirm }: Props) {
    const [tipo, setTipo] = useState<TipoDescuento>("porcentaje");
    const [valor, setValor] = useState("");

    useEffect(() => {
        if (isOpen) {
            setTipo(actual?.tipo ?? "porcentaje");
            setValor(actual ? String(actual.valor) : "");
        }
    }, [isOpen, actual]);

    if (!isOpen) return null;

    const descuento = { tipo, valor: Number(valor || 0) };
    const monto = montoDescuento(importe, descuento);
    const porcentaje = importe > 0 ? (monto / importe) * 100 : 0;
    const requiereAutorizacion = porcentaje > maximoSinAutorizacion + 0.001;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl space-y-4">
                <div>
                    <p className="text-lg font-semibold text-gray-800">{titulo}</p>
                    <p className="text-sm text-gray-500">Sobre {dinero(importe)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {(["porcentaje", "monto"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => { setTipo(t); setValor(""); }}
                            className={`py-2.5 rounded-xl text-sm font-semibold ${tipo === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                            {t === "porcentaje" ? "Porcentaje %" : "Monto $"}
                        </button>
                    ))}
                </div>

                {tipo === "porcentaje" && (
                    <div className="flex gap-2">
                        {[5, 10, 15, 20].map((p) => (
                            <button key={p} type="button" onClick={() => setValor(String(p))}
                                className="flex-1 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200">{p}%</button>
                        ))}
                    </div>
                )}

                <div className="rounded-xl bg-gray-100 px-4 py-3 text-right">
                    <span className="text-3xl font-semibold text-gray-900">{tipo === "monto" ? "$" : ""}{valor || "0"}{tipo === "porcentaje" ? "%" : ""}</span>
                    <p className="text-sm text-gray-500">− {dinero(monto)}</p>
                </div>
                {requiereAutorizacion && (
                    <p className="text-xs text-amber-700">Supera el {maximoSinAutorizacion}% permitido: al cobrar se pedirá el PIN o la contraseña del administrador.</p>
                )}

                <NumericKeypad size="md" onTecla={(t) => setValor((v) => aplicarTecla(v, t, 2))} />

                <div className="flex gap-2">
                    {actual && (
                        <button type="button" onClick={() => onConfirm(null)} className="px-3 py-3 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-xl">Quitar</button>
                    )}
                    <button type="button" onClick={onCancel} className="flex-1 py-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-xl">Cancelar</button>
                    <button type="button" disabled={monto <= 0} onClick={() => onConfirm(descuento)}
                        className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                        Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
