import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { guardarProveedor } from "../../services/compras";
import { mensajeError } from "../../utils/formato";
import { ProveedorInterface } from "../../types/compras";

interface Props {
    isOpen: boolean;
    proveedor?: ProveedorInterface | null; // null = nuevo
    onClose: () => void;
    onSaved: (proveedor: ProveedorInterface) => void;
}

const vacio = {
    nombre: "", nit: "", nrc: "", contacto: "", telefono: "", correo: "", direccion: "", dias_credito: "0", notas: "", activo: true,
};

// Alta y edición de proveedores
export default function ProveedorFormModal({ isOpen, proveedor, onClose, onSaved }: Props) {
    const [form, setForm] = useState(vacio);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(proveedor ? {
            nombre: proveedor.nombre, nit: proveedor.nit ?? "", nrc: proveedor.nrc ?? "", contacto: proveedor.contacto ?? "",
            telefono: proveedor.telefono ?? "", correo: proveedor.correo ?? "", direccion: proveedor.direccion ?? "",
            dias_credito: String(proveedor.dias_credito), notas: proveedor.notas ?? "", activo: proveedor.activo,
        } : vacio);
    }, [isOpen, proveedor]);

    if (!isOpen) return null;

    const campo = (clave: keyof typeof vacio, max: number, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <input className={inputClass} value={form[clave] as string} maxLength={max} {...extra}
            onChange={(e) => setForm((f) => ({ ...f, [clave]: e.target.value }))} />
    );

    const guardar = async () => {
        setGuardando(true);
        try {
            const vacioANull = (v: string) => v.trim() || null;
            const res = await guardarProveedor({
                nombre: form.nombre.trim(),
                nit: vacioANull(form.nit), nrc: vacioANull(form.nrc), contacto: vacioANull(form.contacto),
                telefono: vacioANull(form.telefono), correo: vacioANull(form.correo), direccion: vacioANull(form.direccion),
                notas: vacioANull(form.notas), dias_credito: Number(form.dias_credito || 0),
                ...(proveedor ? { activo: form.activo } : {}),
            }, proveedor?.id);
            toast.success(res.message);
            onSaved(res.proveedor);
        } catch (e) {
            toast.error(mensajeError(e, "No se pudo guardar el proveedor"));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
                <h2 className="text-lg font-semibold">{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</h2>
                <FormField label="Nombre" required>{campo("nombre", 200, { autoFocus: true })}</FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="NIT">{campo("nit", 30)}</FormField>
                    <FormField label="NRC">{campo("nrc", 30)}</FormField>
                    <FormField label="Contacto">{campo("contacto", 100)}</FormField>
                    <FormField label="Teléfono">{campo("telefono", 30, { inputMode: "tel" })}</FormField>
                </div>
                <FormField label="Correo">{campo("correo", 100, { type: "email" })}</FormField>
                <FormField label="Dirección">{campo("direccion", 300)}</FormField>
                <FormField label="Plazo de crédito (días)" hint="0: se le compra de contado">
                    <MoneyInput decimals={0} placeholder="0" value={form.dias_credito} onChange={(v) => setForm((f) => ({ ...f, dias_credito: v }))} />
                </FormField>
                <FormField label="Notas">
                    <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} maxLength={1000}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none" />
                </FormField>
                {proveedor && (
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
