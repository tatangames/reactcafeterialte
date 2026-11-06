import { useEffect, useState } from "react";
import FechaInput from "../form/FechaInput";
import toast from "react-hot-toast";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { useCaja } from "../../context/CajaContext";
import { getProveedores } from "../../services/compras";
import { CategoriaGastoInterface, GastoInterface, registrarGasto } from "../../services/gastos";
import { nuevoUuid } from "../../utils/cajaDispositivo";
import { dinero, hoyLocal, mensajeError } from "../../utils/formato";
import { ProveedorInterface } from "../../types/compras";

interface Props {
    isOpen: boolean;
    categorias: CategoriaGastoInterface[];
    onClose: () => void;
    onSaved: (gasto: GastoInterface) => void;
}

// Registro de un gasto: desde la caja del turno o pagado fuera de caja, con comprobante opcional
export default function GastoModal({ isOpen, categorias, onClose, onSaved }: Props) {
    const { cajaId, catalogos, actual, refrescar } = useCaja();
    const metodos = (catalogos?.metodos_pago ?? []).filter((m) => m.tipo !== "credito");
    const turnoAbierto = !!actual?.turno;

    const [proveedores, setProveedores] = useState<ProveedorInterface[]>([]);
    const [categoriaId, setCategoriaId] = useState<number | null>(null);
    const [descripcion, setDescripcion] = useState("");
    const [monto, setMonto] = useState("");
    const [fecha, setFecha] = useState(hoyLocal());
    const [origen, setOrigen] = useState<"caja" | "externo">("caja");
    const [metodoId, setMetodoId] = useState<number | null>(null);
    const [referencia, setReferencia] = useState("");
    const [documento, setDocumento] = useState("");
    const [proveedorId, setProveedorId] = useState("");
    const [archivo, setArchivo] = useState<File | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [uuid, setUuid] = useState(nuevoUuid);

    useEffect(() => {
        if (!isOpen) return;
        setUuid(nuevoUuid());
        setCategoriaId(null);
        setDescripcion("");
        setMonto("");
        setFecha(hoyLocal());
        setOrigen(turnoAbierto ? "caja" : "externo");
        setMetodoId(metodos.find((m) => m.tipo === "efectivo")?.id ?? metodos[0]?.id ?? null);
        setReferencia("");
        setDocumento("");
        setProveedorId("");
        setArchivo(null);
        getProveedores().then(setProveedores).catch(() => setProveedores([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const metodo = metodos.find((m) => m.id === metodoId);
    const valor = Number(monto || 0);
    const archivoValido = !archivo || archivo.size <= 5 * 1024 * 1024;
    const valido = !!categoriaId && descripcion.trim() !== "" && valor > 0 && !!metodo && archivoValido
        && (!metodo.requiere_referencia || referencia.trim() !== "") && (origen === "externo" || turnoAbierto);

    const guardar = async () => {
        if (!categoriaId) return;
        setGuardando(true);
        try {
            const res = await registrarGasto({
                uuid, fecha, categoria_id: categoriaId, descripcion: descripcion.trim(), monto: valor, origen,
                caja_id: origen === "caja" ? cajaId : null, metodo_pago_id: metodoId,
                proveedor_id: proveedorId ? Number(proveedorId) : null,
                referencia: referencia.trim(), numero_documento: documento.trim(), comprobante: archivo,
            });
            toast.success(res.message);
            refrescar();
            onSaved(res.gasto);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo registrar el gasto"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[94vh] overflow-y-auto">
                <h2 className="text-lg font-semibold">Registrar gasto</h2>

                <FormField label="Categoría" required>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {categorias.map((c) => (
                            <button key={c.id} type="button" onClick={() => setCategoriaId(c.id)}
                                className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-medium ${categoriaId === c.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                                {c.nombre}
                            </button>
                        ))}
                    </div>
                </FormField>
                <FormField label="Descripción" required>
                    <input className={inputClass} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={300} placeholder="Ej.: cilindro de gas de 100 lb" />
                </FormField>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Monto" required>
                        <MoneyInput prefix="$" value={monto} onChange={setMonto} />
                    </FormField>
                    <FormField label="Fecha">
                        <FechaInput className={inputClass} value={fecha} max={hoyLocal()} onChange={(v) => setFecha(v)} />
                    </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {([["caja", "Desde la caja"], ["externo", "Fuera de caja"]] as const).map(([v, t]) => (
                        <button key={v} type="button" onClick={() => setOrigen(v)} disabled={v === "caja" && !turnoAbierto}
                            className={`h-11 rounded-lg border text-sm font-medium disabled:opacity-40 ${origen === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                            {t}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500">{origen === "caja"
                    ? "Sale de la gaveta del turno abierto y aparece en el cuadre como gasto."
                    : turnoAbierto ? "Pagado con banco, tarjeta del negocio u otra cuenta: no toca la caja." : "No hay turno abierto: solo se puede registrar como pagado fuera de caja."}</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Forma de pago">
                        <select className={inputClass} value={metodoId ?? ""} onChange={(e) => setMetodoId(Number(e.target.value))}>
                            {metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Referencia" required={metodo?.requiere_referencia}>
                        <input className={inputClass} value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={100} />
                    </FormField>
                    <FormField label="Proveedor (opcional)">
                        <select className={inputClass} value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
                            <option value="">—</option>
                            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </FormField>
                    <FormField label="N.º de factura o recibo">
                        <input className={inputClass} value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={50} />
                    </FormField>
                </div>

                <FormField label="Comprobante (foto o PDF)" hint="Opcional, hasta 5 MB">
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment"
                        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium hover:file:bg-gray-200" />
                </FormField>
                {!archivoValido && <p className="text-sm text-red-600">El archivo pesa más de 5 MB</p>}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !valido}
                        className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {guardando ? "Registrando..." : `Registrar ${valor > 0 ? dinero(valor) : ""}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
