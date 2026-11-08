import { useState, type ReactNode } from "react";
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
    /** Explicación con ejemplos que se despliega con el botón «?» */
    ayuda?: ReactNode;
}

function Interruptor({ checked, onChange, titulo, descripcion, ayuda }: InterruptorProps) {
    const [verAyuda, setVerAyuda] = useState(false);
    return (
        // Con la explicación abierta ocupa todo el renglón para que los ejemplos se lean cómodos
        <div className={`rounded-lg border border-gray-200 transition hover:bg-gray-50 ${verAyuda ? 'md:col-span-2' : ''}`}>
            <label className="flex cursor-pointer items-start justify-between gap-4 p-4">
                <span>
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        {titulo}
                        {ayuda && (
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVerAyuda(v => !v); }}
                                aria-expanded={verAyuda}
                                aria-label={`Qué hace: ${titulo}`}
                                title="Ver explicación con ejemplos"
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                                    verAyuda ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600'
                                }`}
                            >?</button>
                        )}
                    </span>
                    <span className="block text-xs text-gray-500">{descripcion}</span>
                </span>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                />
            </label>
            {ayuda && verAyuda && (
                <div className="mx-4 mb-4 space-y-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900">
                    {ayuda}
                </div>
            )}
        </div>
    );
}

// Bloque de ejemplo dentro de la explicación
function Ejemplo({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <div className="rounded-md border border-blue-100 bg-white/70 px-3 py-2">
            <p className="font-semibold">{titulo}</p>
            <div className="mt-1 space-y-1">{children}</div>
        </div>
    );
}

const AYUDA_STOCK_NEGATIVO = (
    <>
        <p>Decide qué pasa cuando el sistema dice que ya no queda un producto pero alguien lo quiere vender, o sacar del inventario como merma o consumo interno.</p>
        <Ejemplo titulo="Ejemplo: el sistema marca 0 conchas pero en la vitrina hay 3">
            <p><b>Apagado:</b> la concha sale «Agotado» en la venta y en las mesas y no se puede agregar. Primero hay que registrar la producción o ajustar el inventario.</p>
            <p><b>Encendido:</b> se vende igual y la existencia queda en −1, −2, −3. El sistema avisa, y el negativo se corrige después con la producción o un ajuste.</p>
        </Ejemplo>
        <Ejemplo titulo="Ejemplo: un plato con receta (desayuno con 2 huevos y pan)">
            <p>Si quedan 3 huevos, solo alcanzan 1 desayuno. <b>Apagado:</b> el segundo desayuno ya no se deja agregar. <b>Encendido:</b> se vende y los huevos quedan en −1.</p>
        </Ejemplo>
        <p><b>Recomendado:</b> apagado, para que el inventario sea confiable. Enciéndalo solo si todavía no registran la producción a tiempo y no quieren detener ventas.</p>
    </>
);

const AYUDA_AVISO_CAMBIO = (
    <>
        <p>Antes de registrar un cobro en efectivo, el sistema compara el cambio que hay que dar con el efectivo que debería haber en la gaveta (fondo + ventas en efectivo + ingresos − egresos − gastos de caja).</p>
        <Ejemplo titulo="Ejemplo: en la gaveta hay $20 y el cliente paga $0.30 con un billete de $100">
            <p><b>Encendido:</b> el cambio ($99.70) sale en naranja y, al tocar Cobrar, pregunta: <b>Cobrar igual</b>, <b>Cambiar el pago</b> (otro billete, tarjeta o pago mixto) o <b>Cancelar la venta</b>.</p>
            <p><b>Apagado:</b> se cobra directo, sin aviso.</p>
        </Ejemplo>
        <p><b>Con el cierre ciego encendido</b> el aviso no les sale a los cajeros, porque revelaría cuánto hay en la gaveta. Sí les sale a quienes tienen el permiso «Ver historial de cierres».</p>
        <p><b>Nunca bloquea la venta:</b> si alguien trae el cambio, se cobra igual y ese dinero se registra como ingreso de caja.</p>
    </>
);

const AYUDA_CIERRE_CIEGO = (
    <>
        <p>Sirve para que el conteo de la gaveta sea honesto: quien cuenta no sabe cuánto «debería» haber, así que escribe lo que de verdad tiene en la mano.</p>
        <Ejemplo titulo="Ejemplo: el turno abrió con $50 de fondo, vendió $320 en efectivo y pagó un gasto de $20">
            <p>El sistema calcula que en la gaveta debería haber <b>$350</b>. Al contar, el cajero encuentra <b>$340</b>.</p>
            <p><b>Apagado:</b> en la pantalla del turno y al contar se ve «Efectivo esperado $350». El cajero sabe cuánto falta antes de escribir su conteo.</p>
            <p><b>Encendido:</b> el cajero no ve los $350. Cuenta billetes y monedas, escribe $340 y, al cerrar el turno, aparece «Faltante $10».</p>
        </Ejemplo>
        <Ejemplo titulo="Ejemplo: arqueo a media jornada">
            <p>Si hacen un arqueo (contar la gaveta sin cerrar el turno), con el cierre ciego encendido el cajero tampoco ve la diferencia. Queda guardada para el administrador.</p>
        </Ejemplo>
        <p><b>Quién sí lo ve:</b> los usuarios con el permiso «Ver historial de cierres» (el administrador) siempre ven el esperado y la diferencia, aunque esté encendido.</p>
        <p><b>Recomendado:</b> encendido cuando la caja la cuenta un empleado; apagado si la cuenta el mismo dueño.</p>
    </>
);

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
                                    <input type="text" value={form.razon_social} maxLength={200} placeholder=""
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
                                    ayuda={AYUDA_STOCK_NEGATIVO}
                                />
                                <Interruptor
                                    checked={form.cierre_ciego}
                                    onChange={(v) => handleChange("cierre_ciego", v)}
                                    titulo="Cierre de caja ciego"
                                    descripcion="El cajero cuenta la gaveta sin ver cuánto debería haber; la diferencia aparece al cerrar"
                                    ayuda={AYUDA_CIERRE_CIEGO}
                                />
                                <Interruptor
                                    checked={form.aviso_cambio}
                                    onChange={(v) => handleChange("aviso_cambio", v)}
                                    titulo="Avisar si no alcanza el cambio"
                                    descripcion="Al cobrar en efectivo, avisa cuando el cambio es mayor que lo que hay en la gaveta"
                                    ayuda={AYUDA_AVISO_CAMBIO}
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
