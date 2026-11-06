import LoadingModal from "../../../components/Loading/LoadingModal";
import PageHeader from "../../../components/common/PageHeader";
import FormField, { inputClass } from "../../../components/form/FormField";
import MoneyInput from "../../../components/form/MoneyInput";
import { useNegocioHook } from "../../../hooks/configuracion/useNegocioHook";

interface InterruptorProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    titulo: string;
    descripcion: string;
}

function Interruptor({ checked, onChange, titulo, descripcion }: InterruptorProps) {
    return (
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition">
            <span>
                <span className="block text-sm font-medium text-gray-800">{titulo}</span>
                <span className="block text-xs text-gray-500">{descripcion}</span>
            </span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
            />
        </label>
    );
}

export default function ConfiguracionNegocio() {
    const { form, previewLogo, loading, isSaving, handleChange, handleLogoChange, handleSubmit } = useNegocioHook();

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando configuración..." />
            <LoadingModal isOpen={isSaving} text="Guardando..." />

            <div className="p-6">
                <PageHeader
                    title="Datos del negocio"
                    subtitle="Información del ticket y reglas generales del sistema"
                    actions={
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                        >
                            Guardar cambios
                        </button>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Datos generales */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Datos generales</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Nombre comercial" required>
                                    <input type="text" value={form.nombre} maxLength={200}
                                        onChange={(e) => handleChange("nombre", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Razón social (sale grande arriba del recibo)">
                                    <input type="text" value={form.razon_social} maxLength={200} placeholder="FLAVIOS SAS DE CV"
                                        onChange={(e) => handleChange("razon_social", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="NIT">
                                    <input type="text" value={form.nit} maxLength={30}
                                        onChange={(e) => handleChange("nit", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="NRC">
                                    <input type="text" value={form.nrc} maxLength={30}
                                        onChange={(e) => handleChange("nrc", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Actividad económica">
                                    <input type="text" value={form.actividad_economica} maxLength={200} placeholder="Elaboración de productos de panadería"
                                        onChange={(e) => handleChange("actividad_economica", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Tipo de establecimiento">
                                    <input type="text" value={form.tipo_establecimiento} maxLength={100} placeholder="Sucursal / Agencia"
                                        onChange={(e) => handleChange("tipo_establecimiento", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Teléfono">
                                    <input type="tel" value={form.telefono} maxLength={30}
                                        onChange={(e) => handleChange("telefono", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Correo">
                                    <input type="email" value={form.correo} maxLength={100}
                                        onChange={(e) => handleChange("correo", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Dirección">
                                    <input type="text" value={form.direccion} maxLength={300}
                                        onChange={(e) => handleChange("direccion", e.target.value)} className={inputClass} />
                                </FormField>
                            </div>
                        </div>

                        {/* Ventas */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Ventas</h2>

                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                                <FormField label="Moneda" required>
                                    <input type="text" value={form.moneda} maxLength={3}
                                        onChange={(e) => handleChange("moneda", e.target.value.toUpperCase())} className={inputClass} />
                                </FormField>
                                <FormField label="Símbolo" required>
                                    <input type="text" value={form.simbolo_moneda} maxLength={5}
                                        onChange={(e) => handleChange("simbolo_moneda", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Descuento máx." required hint="Sin ser administrador">
                                    <MoneyInput value={form.descuento_max_sin_autorizacion} suffix="%"
                                        onChange={(v) => handleChange("descuento_max_sin_autorizacion", v)} placeholder="10" />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Interruptor
                                    checked={form.permitir_stock_negativo}
                                    onChange={(v) => handleChange("permitir_stock_negativo", v)}
                                    titulo="Permitir stock negativo"
                                    descripcion="Vender o sacar productos aunque el sistema marque cero existencias"
                                />
                                <Interruptor
                                    checked={form.cierre_ciego}
                                    onChange={(v) => handleChange("cierre_ciego", v)}
                                    titulo="Cierre de caja ciego"
                                    descripcion="El cajero cuenta la gaveta sin ver cuánto debería haber; la diferencia aparece al cerrar"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ticket */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Ticket</h2>

                            <div className="flex flex-col items-center gap-3">
                                <div className="h-32 w-32 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {previewLogo
                                        ? <img src={previewLogo} alt="Logo" className="h-full w-full object-contain" />
                                        : <span className="text-xs text-gray-400">Sin logo</span>}
                                </div>
                                <label className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                                    Cambiar logo
                                    <input type="file" accept="image/png,image/jpeg" className="hidden"
                                        onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)} />
                                </label>
                                <p className="text-xs text-gray-500">JPG o PNG, máximo 2MB</p>
                            </div>

                            <FormField label="Mensaje al pie del ticket">
                                <textarea value={form.mensaje_ticket} maxLength={500} rows={3}
                                    onChange={(e) => handleChange("mensaje_ticket", e.target.value)}
                                    placeholder="¡Gracias por su compra!"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition resize-none" />
                            </FormField>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
