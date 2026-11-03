import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { useAuth } from "../../context/AuthContext";
import { guardarCliente } from "../../services/clientes";
import { mensajeError } from "../../utils/formato";
import { ClienteInterface } from "../../types/clientes";

interface Props {
    isOpen: boolean;
    cliente?: ClienteInterface | null; // null = nuevo
    nombreInicial?: string;            // al crearlo desde la búsqueda del POS
    onClose: () => void;
    onSaved: (cliente: ClienteInterface) => void;
}

const vacio = {
    nombre: "", documento: "", telefono: "", correo: "", direccion: "",
    limite_credito: "", dias_credito: "30", notas: "", activo: true,
};

// Alta y edición de clientes (desde la pantalla de clientes o desde el POS)
export default function ClienteFormModal({ isOpen, cliente, nombreInicial, onClose, onSaved }: Props) {
    const { hasPermission } = useAuth();
    const puedeCredito = hasPermission("cuentas_cobrar.gestionar");
    const [form, setForm] = useState(vacio);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(cliente ? {
            nombre: cliente.nombre,
            documento: cliente.documento ?? "",
            telefono: cliente.telefono ?? "",
            correo: cliente.correo ?? "",
            direccion: cliente.direccion ?? "",
            limite_credito: cliente.limite_credito ? String(cliente.limite_credito) : "",
            dias_credito: String(cliente.dias_credito),
            notas: cliente.notas ?? "",
            activo: cliente.activo,
        } : { ...vacio, nombre: nombreInicial ?? "" });
    }, [isOpen, cliente, nombreInicial]);

    if (!isOpen) return null;

    const set = (campo: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [campo]: e.target.value }));

    const guardar = async () => {
        setGuardando(true);
        try {
            const res = await guardarCliente({
                nombre: form.nombre.trim(),
                documento: form.documento.trim() || null,
                telefono: form.telefono.trim() || null,
                correo: form.correo.trim() || null,
                direccion: form.direccion.trim() || null,
                notas: form.notas.trim() || null,
                ...(puedeCredito ? { limite_credito: Number(form.limite_credito || 0), dias_credito: Number(form.dias_credito || 0) } : {}),
                ...(cliente ? { activo: form.activo } : {}),
            }, cliente?.id);
            toast.success(res.message);
            onSaved(res.cliente);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo guardar el cliente"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
                <h2 className="text-lg font-semibold">{cliente ? "Editar cliente" : "Nuevo cliente"}</h2>

                <FormField label="Nombre" required>
                    <input className={inputClass} value={form.nombre} onChange={set("nombre")} maxLength={200} autoFocus />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="DUI o NIT">
                        <input className={inputClass} value={form.documento} onChange={set("documento")} maxLength={30} />
                    </FormField>
                    <FormField label="Teléfono">
                        <input className={inputClass} value={form.telefono} onChange={set("telefono")} maxLength={30} inputMode="tel" />
                    </FormField>
                </div>
                <FormField label="Correo">
                    <input className={inputClass} value={form.correo} onChange={set("correo")} maxLength={100} type="email" />
                </FormField>
                <FormField label="Dirección">
                    <input className={inputClass} value={form.direccion} onChange={set("direccion")} maxLength={300} />
                </FormField>

                {puedeCredito && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3">
                        <FormField label="Límite de crédito" hint="0 o vacío: no se le vende al crédito">
                            <MoneyInput prefix="$" value={form.limite_credito} onChange={(v) => setForm((f) => ({ ...f, limite_credito: v }))} />
                        </FormField>
                        <FormField label="Plazo (días)">
                            <MoneyInput decimals={0} placeholder="30" value={form.dias_credito} onChange={(v) => setForm((f) => ({ ...f, dias_credito: v }))} />
                        </FormField>
                    </div>
                )}

                <FormField label="Notas">
                    <textarea value={form.notas} onChange={set("notas")} rows={2} maxLength={500}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                </FormField>

                {cliente && (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.activo} onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))} className="h-4 w-4" />
                        Activo
                    </label>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={guardando} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                    <button type="button" onClick={guardar} disabled={guardando || !form.nombre.trim()}
                        className="px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {guardando ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
