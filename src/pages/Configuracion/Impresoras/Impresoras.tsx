import { useState } from "react";

import LoadingModal from "../../../components/Loading/LoadingModal";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import FormField, { inputClass } from "../../../components/form/FormField";
import ConfirmDeleteModal from "../../../components/modal/ConfirmDeleteModal";
import { useImpresoras } from "../../../hooks/configuracion/useImpresorasHook";
import { ImpresoraInterface, UsoImpresora } from "../../../types/interfaces";
import { fechaHora } from '../../../utils/formato';

const USOS: Record<UsoImpresora, { titulo: string; descripcion: string }> = {
    ticket:  { titulo: "Tickets", descripcion: "Comprobante del cliente y cierres de caja" },
    comanda: { titulo: "Comandas", descripcion: "Lista de preparación de sus categorías (sin precios)" },
    ambos:   { titulo: "Tickets y comandas", descripcion: "Una sola impresora para todo" },
};

const CAJON = { ninguno: "Sin cajón", pin2: "Cajón en pin 2", pin5: "Cajón en pin 5" };

export default function Impresoras() {
    const {
        data, loading, isModalOpen, isEditing, isSaving, form, setForm,
        abrirModalNuevo, abrirModalEditar, cerrarModal, handleGuardar, handleEliminar,
        probando, probandoProduccion, resultadoPrueba, handleProbar, trabajos, reintentando, handleReintentar, handleEliminarTrabajo, handleEliminarTodos,
    } = useImpresoras();

    const [eliminando, setEliminando] = useState<ImpresoraInterface | null>(null);

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando impresoras..." />

            <ConfirmDeleteModal
                isOpen={!!eliminando}
                onClose={() => setEliminando(null)}
                onConfirm={async () => { if (eliminando) await handleEliminar(eliminando.id); setEliminando(null); }}
                title="Eliminar impresora"
                description="Las cajas que la usaban pasarán a la impresora predeterminada."
                itemName={eliminando?.alias ?? ""}
            />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-xl w-full max-w-xl shadow-xl max-h-[92vh] flex flex-col">
                        <h2 className="px-6 pt-6 pb-3 text-lg font-semibold">{isEditing ? "Editar impresora" : "Nueva impresora"}</h2>
                        <div className="overflow-y-auto px-6 space-y-4">
                            <FormField label="Nombre" required>
                                <input type="text" value={form.alias} maxLength={200} autoFocus placeholder="Ej. Mostrador, Horno"
                                    onChange={(e) => set("alias", e.target.value)} className={inputClass} />
                            </FormField>

                            <FormField label="Conexión" required>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                    {([["dispositivo", "Desde la tablet (Wi-Fi)"], ["red", "Desde el servidor (red local)"], ["windows", "USB en el servidor (Windows)"]] as const).map(([v, t]) => (
                                        <button key={v} type="button" onClick={() => set("conexion", v)}
                                            className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${form.conexion === v ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-700"}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </FormField>

                            {form.conexion === "dispositivo" && (
                                <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                                    Para el servidor en la nube: el ticket queda en una cola y lo manda a la impresora la tablet que tiene activado «Esta tablet imprime» (Ajustes → Impresoras en la tablet). Desde este navegador se imprime con el respaldo del navegador.
                                </p>
                            )}
                            {form.conexion !== "windows" ? (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="col-span-2">
                                        <FormField label="IP de la impresora" required hint="La imprime la propia impresora al encenderla con el botón FEED">
                                            <input type="text" value={form.ip_impresora} inputMode="decimal" placeholder="192.168.1.50"
                                                onChange={(e) => set("ip_impresora", e.target.value)} className={inputClass} />
                                        </FormField>
                                    </div>
                                    <FormField label="Puerto">
                                        <input type="text" value={form.puerto} inputMode="numeric" placeholder="9100"
                                            onChange={(e) => set("puerto", e.target.value.replace(/\D/g, ""))} className={inputClass} />
                                    </FormField>
                                </div>
                            ) : (
                                <FormField label="Nombre en Windows" required hint="Tal como aparece en Configuración → Impresoras de la computadora del servidor">
                                    <input type="text" value={form.nombre_windows} maxLength={200} placeholder="Ej. POS-80"
                                        onChange={(e) => set("nombre_windows", e.target.value)} className={inputClass} />
                                </FormField>
                            )}

                            <FormField label="Modelo" hint="Las Star TSP100 / TSP143 no tienen letras propias: el ticket se les manda como imagen">
                                <select value={form.tipo_impresion} onChange={(e) => set("tipo_impresion", e.target.value as typeof form.tipo_impresion)} className={inputClass}>
                                    <option value="escpos">ESC/POS (Epson, Xprinter, 3nStar y la mayoría)</option>
                                    <option value="star_raster">Star TSP100 / TSP143 (raster)</option>
                                </select>
                            </FormField>

                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Papel">
                                    <select value={form.ancho_caracteres} onChange={(e) => set("ancho_caracteres", Number(e.target.value))} className={inputClass}>
                                        <option value={48}>80 mm (48 caracteres)</option>
                                        <option value={42}>80 mm (42 caracteres)</option>
                                        <option value={32}>58 mm (32 caracteres)</option>
                                    </select>
                                </FormField>
                                <FormField label="Cajón de dinero">
                                    <select value={form.cash_drawer} onChange={(e) => set("cash_drawer", e.target.value as typeof form.cash_drawer)} className={inputClass}>
                                        {Object.entries(CAJON).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                    </select>
                                </FormField>
                            </div>

                            <FormField label="Uso" required>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {(Object.keys(USOS) as UsoImpresora[]).map((u) => (
                                        <button key={u} type="button" onClick={() => set("uso", u)}
                                            className={`rounded-lg border px-3 py-2 text-left ${form.uso === u ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}>
                                            <span className="block text-sm font-medium text-gray-800">{USOS[u].titulo}</span>
                                            <span className="block text-xs text-gray-500">{USOS[u].descripcion}</span>
                                        </button>
                                    ))}
                                </div>
                            </FormField>

                            {form.uso !== "ticket" && (
                                <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                                    Qué comandas recibe se elige por área en Configuración › Mesas y cocina › Áreas
                                    (cada categoría pertenece a un área, como Cocina o Barra).
                                </p>
                            )}

                            <div className="space-y-2 pb-2">
                                {form.uso !== "comanda" && (
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={form.predeterminada} onChange={(e) => set("predeterminada", e.target.checked)} className="h-4 w-4 accent-blue-600" />
                                        Predeterminada para tickets (la usan las cajas sin impresora asignada)
                                    </label>
                                )}
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={form.cortar_papel} onChange={(e) => set("cortar_papel", e.target.checked)} className="h-4 w-4 accent-blue-600" />
                                    Cortar el papel al terminar
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4 accent-green-600" />
                                    Activa
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-6 pt-4">
                            <button type="button" onClick={cerrarModal} disabled={isSaving} className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button type="button" onClick={handleGuardar} disabled={isSaving}
                                className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                                {isSaving ? "Guardando..." : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                <PageHeader
                    title="Impresoras"
                    subtitle="Impresoras térmicas de tickets y comandas (ESC/POS)"
                    actions={
                        <button type="button" onClick={abrirModalNuevo}
                            className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg">
                            + Nueva impresora
                        </button>
                    }
                />

                {data.length === 0 && !loading && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                        No hay impresoras. Mientras tanto, los tickets se imprimen desde el navegador.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.map((imp) => {
                        const prueba = resultadoPrueba[imp.id];
                        return (
                            <div key={imp.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-gray-800">{imp.alias}</p>
                                        <p className="text-sm text-gray-500">
                                            {imp.conexion === "windows" ? `Windows · ${imp.nombre_windows}` : `${imp.conexion === "dispositivo" ? "Tablet" : "Red"} · ${imp.ip_impresora}:${imp.puerto}`}
                                            {" · "}{imp.ancho_caracteres >= 42 ? "80 mm" : "58 mm"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {imp.predeterminada && <StatusBadge tone="info">Predeterminada</StatusBadge>}
                                        <StatusBadge tone={imp.activo ? "success" : "neutral"}>{imp.activo ? "Activa" : "Inactiva"}</StatusBadge>
                                    </div>
                                </div>

                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                    <div><dt className="text-xs text-gray-400">Uso</dt><dd className="text-gray-700">{USOS[imp.uso].titulo}</dd></div>
                                    <div><dt className="text-xs text-gray-400">Cajón</dt><dd className="text-gray-700">{CAJON[imp.cash_drawer]}</dd></div>
                                    {imp.uso !== "ticket" && (
                                        <div className="col-span-2"><dt className="text-xs text-gray-400">Comandas de</dt>
                                            <dd className="text-gray-700">{imp.areas.join(", ") || "Áreas sin impresora propia"}</dd></div>
                                    )}
                                    {imp.cajas.length > 0 && (
                                        <div className="col-span-2"><dt className="text-xs text-gray-400">Asignada a</dt><dd className="text-gray-700">{imp.cajas.join(", ")}</dd></div>
                                    )}
                                </dl>

                                {prueba && (
                                    <p className={`rounded-lg px-3 py-2 text-sm ${prueba.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                        {prueba.ok ? "✓ " : "✕ "}{prueba.mensaje}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2 pt-1">
                                    <button type="button" onClick={() => handleProbar(imp.id)} disabled={probando === imp.id}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
                                        {probando === imp.id && !probandoProduccion ? "Enviando..." : "Imprimir prueba"}
                                    </button>
                                    <button type="button" onClick={() => handleProbar(imp.id, true)} disabled={probando === imp.id}
                                        title="Imprime una comanda de ejemplo (Mesa 1, Ice latte) con el formato de cocina y barra"
                                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50">
                                        {probando === imp.id && probandoProduccion ? "Enviando..." : "Prueba producción"}
                                    </button>
                                    <button type="button" onClick={() => abrirModalEditar(imp)} className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">Editar</button>
                                    <button type="button" onClick={() => setEliminando(imp)} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Eliminar</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trabajos que fallaron */}
                <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-800">Impresiones con error</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">{trabajos.length}</span>
                            {trabajos.length > 1 && (
                                <button type="button" onClick={handleEliminarTodos} className="text-sm font-medium text-red-600 hover:underline">Eliminar todos</button>
                            )}
                        </div>
                    </div>
                    {trabajos.length === 0 && <p className="px-5 py-6 text-sm text-gray-500">Sin errores de impresión 👍</p>}
                    <div className="divide-y divide-gray-100">
                        {trabajos.map((t) => (
                            <div key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-800">
                                        {t.tipo_texto}{t.documento_tipo === "venta" && t.documento_id ? ` · venta #${t.documento_id}` : ""} · {t.impresora ?? "sin impresora"}
                                    </p>
                                    <p className="text-xs text-red-600">{t.error}</p>
                                    <p className="text-xs text-gray-400">{fechaHora(t.fecha)} · {t.intentos} intento(s){t.usuario ? ` · ${t.usuario}` : ""}</p>
                                </div>
                                {data.filter((i) => i.activo && i.id !== t.impresora_id).length > 0 && (
                                    <select defaultValue="" disabled={reintentando === t.id}
                                        onChange={(e) => { if (e.target.value) handleReintentar(t, Number(e.target.value)); }}
                                        className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm">
                                        <option value="">Enviar a otra…</option>
                                        {data.filter((i) => i.activo && i.id !== t.impresora_id).map((i) => <option key={i.id} value={i.id}>{i.alias}</option>)}
                                    </select>
                                )}
                                <button type="button" onClick={() => handleReintentar(t)} disabled={reintentando === t.id}
                                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-50">
                                    {reintentando === t.id ? "Enviando..." : "Reintentar"}
                                </button>
                                <button type="button" onClick={() => handleEliminarTrabajo(t)} disabled={reintentando === t.id}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                                    Eliminar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
