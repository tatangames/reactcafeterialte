import { type ReactNode } from "react";
import LoadingModal from "../../../components/Loading/LoadingModal";
import PageHeader from "../../../components/common/PageHeader";
import FormField, { inputClass } from "../../../components/form/FormField";
import { useFelHook } from "../../../hooks/configuracion/useFelHook";

const selectClass = inputClass + " pr-8";

function Seccion({ titulo, descripcion, acciones, children }: { titulo: string; descripcion?: string; acciones?: ReactNode; children: ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
                    {descripcion && <p className="text-xs text-gray-500">{descripcion}</p>}
                </div>
                {acciones}
            </div>
            {children}
        </div>
    );
}

const fecha = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const dos = (n: number) => String(n).padStart(2, "0");
    return `${dos(d.getDate())}-${dos(d.getMonth() + 1)}-${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

export default function ConfiguracionFel() {
    const {
        form, config, catalogos, loading, isSaving, probando,
        handleChange, agregarActividad, quitarActividad, cambiarActividad, toggleTipoDte,
        copiarDeNegocio, handleSubmit, probarConexion,
    } = useFelHook();

    const municipios = catalogos?.departamentos[form.departamento]?.municipios ?? {};
    const distritos = municipios[form.municipio]?.distritos ?? [];
    const esHacienda = form.proveedor === "hacienda";

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando configuración..." />
            <LoadingModal isOpen={isSaving} text="Guardando..." />

            <div className="p-6">
                <PageHeader
                    title="Facturación electrónica"
                    subtitle="Documentos tributarios electrónicos (DTE) del Ministerio de Hacienda de El Salvador"
                    actions={
                        <button type="button" onClick={handleSubmit} disabled={isSaving || loading}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50">
                            Guardar cambios
                        </button>
                    }
                />

                {/* Estado */}
                <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${form.activo ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                    <label className="flex cursor-pointer items-center gap-3">
                        <button type="button" role="switch" aria-checked={form.activo}
                            onClick={() => handleChange("activo", !form.activo)}
                            className={`relative h-7 w-12 shrink-0 rounded-full transition ${form.activo ? "bg-green-600" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${form.activo ? "left-[22px]" : "left-0.5"}`} />
                        </button>
                        <span>
                            <span className="block text-sm font-semibold text-gray-800">Activar facturación electrónica</span>
                            <span className="block text-xs text-gray-600">
                                {form.activo
                                    ? "Activa: al guardar se exigen todos los datos obligatorios (*)."
                                    : "Inactiva: las ventas siguen con ticket normal. Puede ir llenando los datos y activarla cuando Hacienda autorice al negocio."}
                            </span>
                        </span>
                    </label>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200">
                        Ambiente: {catalogos?.ambientes[form.ambiente] ?? form.ambiente}
                    </span>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        {/* Emisor */}
                        <Seccion titulo="Datos del emisor" descripcion="Tal como están inscritos en Hacienda"
                            acciones={
                                <button type="button" onClick={copiarDeNegocio}
                                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                                    Copiar de «Datos del negocio»
                                </button>
                            }>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField label="NIT" required hint="14 dígitos, sin guiones">
                                    <input type="text" inputMode="numeric" value={form.nit} maxLength={17}
                                        onChange={(e) => handleChange("nit", e.target.value)} className={inputClass} placeholder="06142803901121" />
                                </FormField>
                                <FormField label="NRC" required hint="Sin guion">
                                    <input type="text" inputMode="numeric" value={form.nrc} maxLength={10}
                                        onChange={(e) => handleChange("nrc", e.target.value)} className={inputClass} placeholder="1234567" />
                                </FormField>
                                <FormField label="Nombre comercial">
                                    <input type="text" value={form.nombre_comercial} maxLength={150}
                                        onChange={(e) => handleChange("nombre_comercial", e.target.value)} className={inputClass} />
                                </FormField>
                                <div className="md:col-span-3">
                                    <FormField label="Razón social" required>
                                        <input type="text" value={form.razon_social} maxLength={250}
                                            onChange={(e) => handleChange("razon_social", e.target.value)} className={inputClass} />
                                    </FormField>
                                </div>
                            </div>
                        </Seccion>

                        {/* Establecimiento */}
                        <Seccion titulo="Configuración comercial" descripcion="Establecimiento, punto de venta y dirección">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField label="Tipo de establecimiento" required>
                                    <select value={form.tipo_establecimiento} onChange={(e) => handleChange("tipo_establecimiento", e.target.value)} className={selectClass}>
                                        <option value="">Sin seleccionar</option>
                                        {Object.entries(catalogos?.tipos_establecimiento ?? {}).map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Código establecimiento MH" hint="Lo asigna Hacienda (ej. M001)">
                                    <input type="text" value={form.cod_establecimiento_mh} maxLength={4}
                                        onChange={(e) => handleChange("cod_establecimiento_mh", e.target.value.toUpperCase())} className={inputClass} />
                                </FormField>
                                <FormField label="Código establecimiento interno">
                                    <input type="text" value={form.cod_establecimiento} maxLength={10}
                                        onChange={(e) => handleChange("cod_establecimiento", e.target.value)} className={inputClass} />
                                </FormField>
                                <FormField label="Punto de venta MH" hint="Ej. P001">
                                    <input type="text" value={form.cod_punto_venta_mh} maxLength={4}
                                        onChange={(e) => handleChange("cod_punto_venta_mh", e.target.value.toUpperCase())} className={inputClass} />
                                </FormField>
                                <FormField label="Punto de venta interno">
                                    <input type="text" value={form.cod_punto_venta} maxLength={15}
                                        onChange={(e) => handleChange("cod_punto_venta", e.target.value)} className={inputClass} />
                                </FormField>
                                <div className="hidden md:block" />
                                <FormField label="Departamento" required>
                                    <select value={form.departamento} onChange={(e) => handleChange("departamento", e.target.value)} className={selectClass}>
                                        <option value="">Sin seleccionar</option>
                                        {Object.entries(catalogos?.departamentos ?? {}).map(([c, d]) => <option key={c} value={c}>{d.nombre}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Municipio" required>
                                    <select value={form.municipio} disabled={!form.departamento} onChange={(e) => handleChange("municipio", e.target.value)} className={selectClass + " disabled:bg-gray-100"}>
                                        <option value="">Sin seleccionar</option>
                                        {Object.entries(municipios).map(([c, m]) => <option key={c} value={c}>{m.nombre}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Distrito" required>
                                    <select value={form.distrito} disabled={!form.municipio} onChange={(e) => handleChange("distrito", e.target.value)} className={selectClass + " disabled:bg-gray-100"}>
                                        <option value="">Sin seleccionar</option>
                                        {distritos.map((d) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </FormField>
                                <div className="md:col-span-3">
                                    <FormField label="Dirección (complemento)" required hint="Colonia, calle, número de local">
                                        <input type="text" value={form.direccion} maxLength={200}
                                            onChange={(e) => handleChange("direccion", e.target.value)} className={inputClass} />
                                    </FormField>
                                </div>
                                <FormField label="Teléfono" required>
                                    <input type="tel" value={form.telefono} maxLength={30}
                                        onChange={(e) => handleChange("telefono", e.target.value)} className={inputClass} />
                                </FormField>
                                <div className="md:col-span-2">
                                    <FormField label="Correo" required hint="Hacienda y los clientes verán este correo en el DTE">
                                        <input type="email" value={form.correo} maxLength={100}
                                            onChange={(e) => handleChange("correo", e.target.value)} className={inputClass} />
                                    </FormField>
                                </div>
                            </div>
                        </Seccion>

                        {/* Actividades */}
                        <Seccion titulo="Actividad económica" descripcion="La primera es la actividad principal que va en el DTE (catálogo CAT-019)">
                            <datalist id="fel-actividades">
                                {catalogos?.actividades.map((a) => <option key={a.codigo} value={a.descripcion}>{a.codigo}</option>)}
                            </datalist>
                            {form.actividades.length === 0 && (
                                <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">Sin actividades. Agregue la registrada en Hacienda.</p>
                            )}
                            <div className="space-y-3">
                                {form.actividades.map((a, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_7rem_auto] items-end gap-3">
                                        <FormField label={i === 0 ? "Actividad económica (principal)" : "Actividad económica"} required>
                                            <input type="text" list="fel-actividades" value={a.descripcion} maxLength={150}
                                                onChange={(e) => cambiarActividad(i, "descripcion", e.target.value)}
                                                placeholder="Escriba o elija de la lista" className={inputClass} />
                                        </FormField>
                                        <FormField label="Código" required>
                                            <input type="text" inputMode="numeric" value={a.codigo} maxLength={6}
                                                onChange={(e) => cambiarActividad(i, "codigo", e.target.value.replace(/\D/g, ""))} className={inputClass} />
                                        </FormField>
                                        <button type="button" onClick={() => quitarActividad(i)} title="Quitar"
                                            className="h-[42px] w-[42px] rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={agregarActividad}
                                className="px-4 py-2 text-sm font-medium text-white bg-slate-500 hover:bg-slate-600 rounded-lg transition">
                                + Agregar
                            </button>
                        </Seccion>
                    </div>

                    <div className="space-y-6">
                        {/* Credenciales */}
                        <Seccion titulo="Credenciales del certificador" descripcion="Las contraseñas se guardan cifradas y nunca se muestran">
                            <FormField label="Certificador" required>
                                <select value={form.proveedor} onChange={(e) => handleChange("proveedor", e.target.value)} className={selectClass}>
                                    {Object.entries(catalogos?.proveedores ?? {}).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Ambiente" required hint="Use Pruebas hasta que Hacienda apruebe las pruebas técnicas">
                                <select value={form.ambiente} onChange={(e) => handleChange("ambiente", e.target.value)} className={selectClass}>
                                    {Object.entries(catalogos?.ambientes ?? {}).map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}
                                </select>
                            </FormField>
                            {!esHacienda && (
                                <FormField label="URL de la API" required>
                                    <input type="url" value={form.api_url} maxLength={300} placeholder="https://api.certificador.com"
                                        onChange={(e) => handleChange("api_url", e.target.value)} className={inputClass} />
                                </FormField>
                            )}
                            <FormField label={esHacienda ? "Usuario API" : "Usuario"} hint={esHacienda ? "Normalmente el NIT; vacío = usa el NIT del emisor" : undefined}>
                                <input type="text" value={form.api_usuario} maxLength={100} autoComplete="off"
                                    onChange={(e) => handleChange("api_usuario", e.target.value)} className={inputClass} />
                            </FormField>
                            <FormField label="Contraseña API" required={esHacienda}
                                hint={config?.tiene_api_password ? "Guardada. Déjela vacía para no cambiarla." : "Se genera en el portal de Hacienda"}>
                                <input type="password" value={form.api_password} maxLength={200} autoComplete="new-password"
                                    placeholder={config?.tiene_api_password ? "••••••••" : ""}
                                    onChange={(e) => handleChange("api_password", e.target.value)} className={inputClass} />
                            </FormField>
                            {esHacienda && (
                                <>
                                    <FormField label="URL del firmador" required hint="Firmador oficial del MH (Docker) donde está el certificado">
                                        <input type="url" value={form.firmador_url} maxLength={300} placeholder={catalogos?.firmador_url_defecto}
                                            onChange={(e) => handleChange("firmador_url", e.target.value)} className={inputClass} />
                                    </FormField>
                                    <FormField label="Contraseña de la llave privada" required
                                        hint={config?.tiene_clave_privada ? "Guardada. Déjela vacía para no cambiarla." : "La que definió al generar el certificado"}>
                                        <input type="password" value={form.clave_privada} maxLength={200} autoComplete="new-password"
                                            placeholder={config?.tiene_clave_privada ? "••••••••" : ""}
                                            onChange={(e) => handleChange("clave_privada", e.target.value)} className={inputClass} />
                                    </FormField>
                                </>
                            )}

                            <div className="border-t border-gray-100 pt-4 space-y-2">
                                <button type="button" onClick={probarConexion} disabled={probando}
                                    className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50">
                                    {probando ? "Probando..." : "Probar conexión"}
                                </button>
                                <p className="text-xs text-gray-500">Guarde primero los cambios; la prueba usa lo guardado.</p>
                                {config?.ultima_prueba_at && (
                                    <p className={`rounded-lg px-3 py-2 text-xs ${config.ultima_prueba_ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                                        <b>{config.ultima_prueba_ok ? "Conexión correcta" : "Falló"}</b> · {fecha(config.ultima_prueba_at)}<br />
                                        {config.ultima_prueba_mensaje}
                                    </p>
                                )}
                            </div>
                        </Seccion>

                        {/* Documentos */}
                        <Seccion titulo="Documentos a emitir" descripcion="Tipos de DTE que usará el negocio">
                            <div className="space-y-2">
                                {Object.entries(catalogos?.tipos_dte ?? {}).map(([c, n]) => (
                                    <label key={c} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50">
                                        <input type="checkbox" checked={form.tipos_dte.includes(c)} onChange={() => toggleTipoDte(c)} className="h-4 w-4 accent-blue-600" />
                                        <span className="text-sm text-gray-800"><span className="font-mono text-gray-500">{c}</span> · {n}</span>
                                    </label>
                                ))}
                            </div>
                        </Seccion>
                    </div>
                </div>
            </div>
        </>
    );
}
