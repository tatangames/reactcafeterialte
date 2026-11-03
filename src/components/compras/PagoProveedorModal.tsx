import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { useCaja } from "../../context/CajaContext";
import { registrarPagoProveedor } from "../../services/compras";
import { nuevoUuid } from "../../utils/cajaDispositivo";
import { dinero, hoyLocal, mensajeError } from "../../utils/formato";
import { CuentaPagarInterface, ProveedorInterface } from "../../types/compras";

interface Props {
    proveedor: ProveedorInterface | null;   // null = cerrado
    pendientes: CuentaPagarInterface[];
    cuentaInicial?: number | null;          // abrir aplicado a una compra concreta
    onClose: () => void;
    onSaved: () => void;
}

// Pago a proveedor: desde la caja del turno (egreso) o fuera de caja (banco)
export default function PagoProveedorModal({ proveedor, pendientes, cuentaInicial = null, onClose, onSaved }: Props) {
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const metodos = (catalogos?.metodos_pago ?? []).filter((m) => m.tipo !== "credito");
    const turnoAbierto = !!actual?.turno;

    const [origen, setOrigen] = useState<"caja" | "externo">("caja");
    const [cuentaId, setCuentaId] = useState<number | null>(null);
    const [monto, setMonto] = useState("");
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [referencia, setReferencia] = useState("");
    const [fecha, setFecha] = useState(hoyLocal());
    const [guardando, setGuardando] = useState(false);
    const [uuid, setUuid] = useState(nuevoUuid);

    useEffect(() => {
        if (!proveedor) return;
        const cuenta = pendientes.find((c) => c.id === cuentaInicial);
        setUuid(nuevoUuid());
        setOrigen(turnoAbierto ? "caja" : "externo");
        setCuentaId(cuenta?.id ?? null);
        setMonto(cuenta ? String(cuenta.saldo) : "");
        setMetodoId(metodos.find((m) => m.tipo === "efectivo")?.id ?? metodos[0]?.id ?? null);
        setReferencia("");
        setFecha(hoyLocal());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [proveedor, cuentaInicial]);

    if (!proveedor) return null;

    const cuenta = pendientes.find((c) => c.id === cuentaId);
    const maximo = cuenta ? cuenta.saldo : proveedor.saldo;
    const valor = Number(monto || 0);
    const metodo = metodos.find((m) => m.id === metodoId);
    const valido = valor > 0 && valor <= maximo + 0.001 && !!metodo
        && (!metodo.requiere_referencia || referencia.trim() !== "") && (origen === "externo" || turnoAbierto);

    const guardar = async () => {
        setGuardando(true);
        try {
            const res = await registrarPagoProveedor(proveedor.id, {
                uuid, monto: valor, origen,
                caja_id: origen === "caja" ? cajaId : null,
                fecha: origen === "externo" ? fecha : undefined,
                metodo_pago_id: metodoId ?? undefined,
                referencia: referencia.trim() || undefined,
                aplicaciones: cuenta ? [{ cuenta_pagar_id: cuenta.id, monto: valor }] : undefined,
            });
            toast.success(res.message);
            refrescar();
            onSaved();
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo registrar el pago"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
                <div>
                    <h2 className="text-lg font-semibold">Pago a {proveedor.nombre}</h2>
                    <p className="text-sm text-gray-500">Se le deben {dinero(proveedor.saldo)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {([["caja", "Desde la caja"], ["externo", "Fuera de caja"]] as const).map(([valorOrigen, texto]) => (
                        <button key={valorOrigen} type="button" onClick={() => setOrigen(valorOrigen)}
                            disabled={valorOrigen === "caja" && !turnoAbierto}
                            className={`h-12 rounded-lg border text-sm font-medium disabled:opacity-40 ${origen === valorOrigen ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                            {texto}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500">{origen === "caja"
                    ? "Sale de la gaveta del turno abierto y aparece en el cuadre."
                    : "Pagado desde el banco u otra cuenta: no toca la caja."}</p>

                <FormField label="Aplicar a">
                    <select className={inputClass} value={cuentaId ?? ""} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">Las compras más antiguas primero</option>
                        {pendientes.map((c) => (
                            <option key={c.id} value={c.id}>{c.compra}{c.documento ? ` · ${c.documento}` : ""} · debe {dinero(c.saldo)}</option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Monto" required hint={`Máximo ${dinero(maximo)}`}>
                    <MoneyInput prefix="$" value={monto} onChange={setMonto} />
                </FormField>
                {valor > maximo + 0.001 && <p className="text-sm text-red-600">El monto supera {dinero(maximo)}</p>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Forma de pago">
                        <select className={inputClass} value={metodoId ?? ""} onChange={(e) => setMetodoId(Number(e.target.value))}>
                            {metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </FormField>
                    {origen === "externo" && (
                        <FormField label="Fecha">
                            <input type="date" className={inputClass} value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} />
                        </FormField>
                    )}
                </div>
                <FormField label="Referencia" required={metodo?.requiere_referencia}>
                    <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} placeholder="N.º de transferencia o cheque" />
                </FormField>

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !valido}
                        className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {guardando ? "Registrando..." : `Pagar ${valor > 0 ? dinero(valor) : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
