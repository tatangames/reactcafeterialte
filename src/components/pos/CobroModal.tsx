import { useEffect, useMemo, useState } from "react";

import NumericKeypad, { aplicarTecla } from "./NumericKeypad";
import { MetodoPagoInterface } from "../../types/caja";
import { PagoFormInterface } from "../../types/pos";
import { redondear, sugerenciasEfectivo } from "../../utils/carrito";
import { dinero } from "../../utils/formato";

interface Props {
    isOpen: boolean;
    total: number;
    metodos: MetodoPagoInterface[];
    // Para vender al crédito hace falta un cliente con crédito y conexión con el servidor
    cliente?: { nombre: string; limite_credito: number; credito_disponible: number } | null;
    enLinea?: boolean;
    anticipo?: number;
    isLoading: boolean;
    onCancel: () => void;
    onConfirm: (pagos: PagoFormInterface[]) => void;
}

// Cobro: efectivo con billetes rápidos, tarjeta, transferencia o pago combinado
export default function CobroModal({ isOpen, total, metodos, cliente = null, enLinea = true, anticipo = 0, isLoading, onCancel, onConfirm }: Props) {
    const conCredito = !!cliente && cliente.limite_credito > 0 && enLinea;
    const disponibles = useMemo(
        () => metodos.filter((m) => m.activo && (m.tipo !== "credito" || conCredito)),
        [metodos, conCredito]
    );
    const hayCredito = metodos.some((m) => m.activo && m.tipo === "credito");
    const efectivo = disponibles.find((m) => m.afecta_efectivo) ?? disponibles[0];

    const [pagos, setPagos] = useState<PagoFormInterface[]>([]);
    const [metodo, setMetodo] = useState<MetodoPagoInterface | undefined>(efectivo);
    const [monto, setMonto] = useState("");
    const [referencia, setReferencia] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setPagos([]);
            setMetodo(efectivo);
            setMonto("");
            setReferencia("");
            setError("");
        }
    }, [isOpen]);

    if (!isOpen || !metodo) return null;

    const pagado = redondear(pagos.reduce((s, p) => s + p.monto, 0));
    const restante = redondear(Math.max(total - pagado, 0));
    const montoActual = Number(monto || 0);
    // Lo que se cobraría si se presiona "Cobrar" ahora
    const enCurso = montoActual > 0 ? montoActual : metodo.afecta_efectivo ? 0 : restante;
    const cubierto = redondear(pagado + enCurso);
    const cambio = redondear(Math.max(cubierto - total, 0));

    const pagoActual = (valor: number): PagoFormInterface => ({
        metodo_pago_id: metodo.id, nombre: metodo.nombre, afecta_efectivo: metodo.afecta_efectivo,
        monto: valor, referencia: referencia.trim() || undefined,
    });

    const validarActual = (valor: number): boolean => {
        if (metodo.requiere_referencia && !referencia.trim()) {
            setError(`${metodo.nombre} requiere número de referencia`);
            return false;
        }
        if (!metodo.afecta_efectivo && valor > restante + 0.001) {
            setError(`${metodo.nombre} no puede ser mayor a lo que falta (${dinero(restante)})`);
            return false;
        }
        return true;
    };

    const agregar = () => {
        const valor = montoActual > 0 ? montoActual : restante;
        if (valor <= 0 || !validarActual(valor)) return;
        setPagos((p) => [...p, pagoActual(valor)]);
        setMonto("");
        setReferencia("");
        setError("");
        setMetodo(efectivo);
    };

    const cobrar = (montoDirecto?: number) => {
        const valor = montoDirecto ?? enCurso;
        const lista = [...pagos];
        if (valor > 0) {
            if (!validarActual(valor)) return;
            lista.push(pagoActual(valor));
        }
        const suma = redondear(lista.reduce((s, p) => s + p.monto, 0));
        if (suma + 0.001 < total) {
            setError(`Falta cobrar ${dinero(total - suma)}`);
            return;
        }
        setError("");
        onConfirm(lista);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4">
            <div className="bg-gray-50 rounded-2xl w-full max-w-3xl shadow-xl max-h-[96vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    {/* Resumen */}
                    <div className="p-6 space-y-4 bg-white rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
                        <div>
                            <p className="text-sm text-gray-500">{anticipo > 0 ? "Por cobrar" : "Total a cobrar"}</p>
                            <p className="text-5xl font-bold text-gray-900">{dinero(total)}</p>
                            {anticipo > 0 && <p className="text-sm text-green-700">Anticipo ya recibido: {dinero(anticipo)} (total {dinero(total + anticipo)})</p>}
                        </div>

                        {pagos.length > 0 && (
                            <ul className="space-y-2">
                                {pagos.map((p, i) => (
                                    <li key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                                        <span>{p.nombre}{p.referencia ? ` · ${p.referencia}` : ""}</span>
                                        <span className="flex items-center gap-3">
                                            <strong>{dinero(p.monto)}</strong>
                                            <button type="button" onClick={() => setPagos((l) => l.filter((_, j) => j !== i))}
                                                className="text-red-500 hover:text-red-700" aria-label="Quitar pago">✕</button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <dl className="space-y-1 text-lg">
                            <div className="flex justify-between"><dt className="text-gray-500">Recibido</dt><dd className="font-semibold">{dinero(cubierto)}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Falta</dt><dd className={`font-semibold ${cubierto < total ? "text-red-600" : "text-gray-400"}`}>{dinero(Math.max(total - cubierto, 0))}</dd></div>
                            <div className="flex justify-between text-2xl"><dt className="text-gray-700">Cambio</dt><dd className="font-bold text-green-700">{dinero(cambio)}</dd></div>
                        </dl>

                        {metodo.afecta_efectivo && (
                            <div>
                                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Cobro rápido en efectivo</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {sugerenciasEfectivo(restante).map((v) => (
                                        <button key={v} type="button" disabled={isLoading} onClick={() => cobrar(v)}
                                            className="py-3 rounded-xl bg-green-600 text-white text-lg font-semibold hover:bg-green-700 active:scale-95 disabled:opacity-50">
                                            {v === restante ? "Exacto" : dinero(v, "$", v % 1 === 0 ? 0 : 2)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Teclado y forma de pago */}
                    <div className="p-6 space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {disponibles.map((m) => (
                                <button key={m.id} type="button" onClick={() => { setMetodo(m); setError(""); }}
                                    className={`flex-1 min-w-[90px] py-3 rounded-xl text-sm font-semibold transition ${
                                        metodo.id === m.id ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-700"
                                    }`}>
                                    {m.nombre}
                                </button>
                            ))}
                        </div>

                        {metodo.tipo === "credito" && cliente && (
                            <div className={`rounded-xl px-4 py-3 text-sm ${(montoActual || restante) > cliente.credito_disponible + 0.001 ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
                                <p className="font-semibold">Al crédito de {cliente.nombre}</p>
                                <p>Disponible {dinero(cliente.credito_disponible)} de {dinero(cliente.limite_credito)}
                                    {(montoActual || restante) > cliente.credito_disponible + 0.001 ? ": supera el límite, se pedirá autorización" : ""}</p>
                            </div>
                        )}
                        {hayCredito && !conCredito && (
                            <p className="text-xs text-gray-500">{!enLinea ? "La venta al crédito necesita conexión con el servidor"
                                : cliente ? `${cliente.nombre} no tiene crédito autorizado` : "Para vender al crédito, asigna un cliente con crédito"}</p>
                        )}

                        <div className="rounded-xl bg-white border border-gray-200 px-4 py-3 text-right">
                            <p className="text-xs text-gray-500">{metodo.afecta_efectivo ? "Efectivo recibido" : `Monto con ${metodo.nombre}`}</p>
                            <p className="text-3xl font-semibold text-gray-900">{monto ? dinero(monto) : <span className="text-gray-300">{dinero(metodo.afecta_efectivo ? 0 : restante)}</span>}</p>
                        </div>

                        {metodo.requiere_referencia && (
                            <input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100}
                                placeholder="Número de referencia" inputMode="numeric"
                                className="w-full h-12 rounded-xl border border-gray-300 px-4 text-base focus:border-blue-400 focus:outline-none" />
                        )}

                        <NumericKeypad onTecla={(t) => setMonto((v) => aplicarTecla(v, t, 2))} />

                        {error && <p className="text-sm text-red-600">{error}</p>}

                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={onCancel} disabled={isLoading}
                                className="py-4 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300">Volver</button>
                            <button type="button" onClick={agregar} disabled={isLoading || restante <= 0}
                                className="py-4 rounded-xl bg-white border border-blue-600 text-blue-700 font-semibold hover:bg-blue-50 disabled:opacity-40"
                                title="Para pagar con varias formas">
                                + Pago
                            </button>
                            <button type="button" onClick={() => cobrar()} disabled={isLoading}
                                className="py-4 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {isLoading ? "..." : "Cobrar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
