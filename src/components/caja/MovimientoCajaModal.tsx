import { useEffect, useRef, useState } from "react";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { MetodoPagoInterface } from "../../types/caja";
import { nuevoUuid } from "../../utils/cajaDispositivo";

export interface MovimientoCajaForm {
    uuid: string;
    tipo: "ingreso" | "egreso";
    monto: number;
    concepto: string;
    metodo_pago_id?: number;
    referencia?: string;
}

interface Props {
    tipo: "ingreso" | "egreso" | null; // null = cerrado
    metodos: MetodoPagoInterface[];
    isLoading: boolean;
    onClose: () => void;
    onConfirm: (datos: MovimientoCajaForm) => void;
}

const SUGERENCIAS = {
    ingreso: ["Cambio adicional", "Reposición de fondo", "Pago de pedido"],
    egreso:  ["Pago a proveedor", "Compra menor", "Retiro a caja fuerte", "Adelanto de salario"],
};

// Ingreso o egreso manual de dinero en la caja
export default function MovimientoCajaModal({ tipo, metodos, isLoading, onClose, onConfirm }: Props) {
    const efectivo = metodos.find((m) => m.tipo === "efectivo");
    const [monto, setMonto] = useState("");
    const [concepto, setConcepto] = useState("");
    const [metodoId, setMetodoId] = useState<number | undefined>(efectivo?.id);
    const [referencia, setReferencia] = useState("");
    const [error, setError] = useState("");
    // Un uuid por intento: si la red falla y se reintenta, no se registra dos veces
    const uuid = useRef(nuevoUuid());

    useEffect(() => {
        if (tipo) {
            setMonto("");
            setConcepto("");
            setReferencia("");
            setError("");
            setMetodoId(efectivo?.id);
            uuid.current = nuevoUuid();
        }
    }, [tipo]);

    if (!tipo) return null;

    const metodo = metodos.find((m) => m.id === metodoId);

    const guardar = () => {
        if (!monto || Number(monto) <= 0) return setError("Indica el monto");
        if (!concepto.trim()) return setError("Indica el concepto");
        if (metodo?.requiere_referencia && !referencia.trim()) return setError(`${metodo.nombre} requiere número de referencia`);
        setError("");
        onConfirm({
            uuid: uuid.current,
            tipo,
            monto: Number(monto),
            concepto: concepto.trim(),
            metodo_pago_id: metodoId,
            referencia: referencia.trim() || undefined,
        });
    };

    const esIngreso = tipo === "ingreso";

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                <h2 className="text-lg font-semibold">{esIngreso ? "Ingreso de dinero" : "Egreso de dinero"}</h2>

                <FormField label="Monto" required>
                    <MoneyInput value={monto} onChange={setMonto} prefix="$" />
                </FormField>

                <FormField label="Concepto" required>
                    <input type="text" value={concepto} maxLength={300} onChange={(e) => setConcepto(e.target.value)} className={inputClass} />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {SUGERENCIAS[tipo].map((s) => (
                            <button key={s} type="button" onClick={() => setConcepto(s)}
                                className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200">
                                {s}
                            </button>
                        ))}
                    </div>
                </FormField>

                {metodos.length > 1 && (
                    <FormField label="Forma">
                        <div className="flex flex-wrap gap-2">
                            {metodos.filter((m) => m.tipo !== "credito").map((m) => (
                                <button key={m.id} type="button" onClick={() => setMetodoId(m.id)}
                                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                                        metodoId === m.id ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                    }`}>
                                    {m.nombre}
                                </button>
                            ))}
                        </div>
                    </FormField>
                )}

                {metodo?.requiere_referencia && (
                    <FormField label="Referencia" required>
                        <input type="text" value={referencia} maxLength={100} onChange={(e) => setReferencia(e.target.value)} className={inputClass} />
                    </FormField>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={guardar} disabled={isLoading}
                        className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${esIngreso ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                        {isLoading ? "Guardando..." : esIngreso ? "Registrar ingreso" : "Registrar egreso"}
                    </button>
                </div>
            </div>
        </div>
    );
}
