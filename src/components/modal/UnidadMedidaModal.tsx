import { useEffect, useState } from "react";

import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import { TipoUnidad, UnidadMedidaFormInterface, UnidadMedidaInterface } from "../../types/interfaces";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (datos: UnidadMedidaFormInterface) => Promise<void> | void;
    isLoading: boolean;
    unidad?: UnidadMedidaInterface | null; // con unidad = edición
}

// Unidad base de cada tipo, contra la que se expresa la equivalencia
const BASE: Record<TipoUnidad, { nombre: string; abrev: string }> = {
    unidad:  { nombre: "unidades", abrev: "u" },
    masa:    { nombre: "gramos", abrev: "g" },
    volumen: { nombre: "mililitros", abrev: "ml" },
};

const vacio: UnidadMedidaFormInterface = { nombre: "", abreviatura: "", tipo: "unidad", factor_base: "1", estado: true };

export default function UnidadMedidaModal({ isOpen, onClose, onConfirm, isLoading, unidad }: Props) {
    const [form, setForm] = useState<UnidadMedidaFormInterface>(vacio);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) return;
        setError("");
        setForm(unidad
            ? {
                nombre: unidad.nombre,
                abreviatura: unidad.abreviatura ?? "",
                tipo: unidad.tipo,
                factor_base: String(Number(unidad.factor_base)),
                estado: unidad.estado,
            }
            : vacio);
    }, [isOpen, unidad]);

    if (!isOpen) return null;

    const set = <K extends keyof UnidadMedidaFormInterface>(k: K, v: UnidadMedidaFormInterface[K]) =>
        setForm((prev) => ({ ...prev, [k]: v }));

    const guardar = () => {
        if (!form.nombre.trim()) return setError("El nombre es obligatorio");
        if (!form.factor_base || Number(form.factor_base) <= 0) return setError("La equivalencia debe ser mayor a 0");
        setError("");
        onConfirm({ ...form, nombre: form.nombre.trim(), abreviatura: form.abreviatura.trim() });
    };

    const base = BASE[form.tipo];

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
                <h2 className="text-lg font-semibold">{unidad ? "Editar Unidad de Medida" : "Nueva Unidad de Medida"}</h2>

                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <FormField label="Nombre" required>
                            <input type="text" value={form.nombre} maxLength={100} autoFocus placeholder="Ej. Libra"
                                onChange={(e) => set("nombre", e.target.value)} className={inputClass} />
                        </FormField>
                    </div>
                    <FormField label="Abreviatura">
                        <input type="text" value={form.abreviatura} maxLength={10} placeholder="lb"
                            onChange={(e) => set("abreviatura", e.target.value)} className={inputClass} />
                    </FormField>
                </div>

                <FormField label="Tipo" hint="Solo se convierten entre sí las unidades del mismo tipo">
                    <select value={form.tipo} className={inputClass}
                        onChange={(e) => {
                            set("tipo", e.target.value as TipoUnidad);
                            set("factor_base", "1");
                        }}>
                        <option value="unidad">Por unidad (pieza, docena, caja...)</option>
                        <option value="masa">Peso (g, kg, lb, quintal...)</option>
                        <option value="volumen">Volumen (ml, litro, galón...)</option>
                    </select>
                </FormField>

                <FormField label="Equivalencia" required>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="whitespace-nowrap">1 {form.abreviatura || form.nombre || "unidad"} =</span>
                        <MoneyInput value={form.factor_base} decimals={6} suffix={base.abrev} placeholder="1"
                            onChange={(v) => set("factor_base", v)} className="flex-1" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Cuántos {base.nombre} tiene una {form.nombre || "unidad"}.</p>
                </FormField>

                {unidad && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={form.estado} onChange={(e) => set("estado", e.target.checked)}
                            className="h-4 w-4 accent-green-600" />
                        Activa
                    </label>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} disabled={isLoading}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={guardar} disabled={isLoading}
                        className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50">
                        {isLoading ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
