import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AyudaClases from "./AyudaClases";
import FormField, { inputClass } from "../form/FormField";
import MoneyInput from "../form/MoneyInput";
import SelectBuscador from "../form/SelectBuscador";
import OrdenPosCampo from "./OrdenPosCampo";
import { getOrdenPos } from "../../services/ordenPos";
import { CategoriasInterface, ClaseProducto, ProductoFormInterface, UnidadMedidaInterface } from "../../types/interfaces";
import { CLASES_PRODUCTO, cantidad, dinero } from "../../utils/formato";
import { COLORES_POS, defaultsPorClase, margen } from "../../utils/productoForm";

type OnChange = <K extends keyof ProductoFormInterface>(field: K, value: ProductoFormInterface[K]) => void;

interface Props {
    form: ProductoFormInterface;
    unidades: UnidadMedidaInterface[];
    categorias: CategoriasInterface[];
    previewImagen: string | null;
    onChange: OnChange;
    onImagenChange: (file: File | null) => void;
    onToggleCategoria: (id: number) => void;
    puedeEditarPrecios: boolean;
    productoId?: number;          // Solo en edición: muestra stock actual y enlace al kardex
    stockActual?: number | null;
    extraGeneral?: ReactNode;     // Ej. el check "Producto activo" en edición
    ayudaImagen?: string;
}

interface InterruptorProps {
    checked: boolean;
    onChange: (v: boolean) => void;
    titulo: string;
    descripcion: string;
    disabled?: boolean;
}

function Interruptor({ checked, onChange, titulo, descripcion, disabled }: InterruptorProps) {
    return (
        <label className={`flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3 transition ${disabled ? "opacity-50" : "cursor-pointer hover:bg-gray-50"}`}>
            <span>
                <span className="block text-sm font-medium text-gray-800">{titulo}</span>
                <span className="block text-xs text-gray-500">{descripcion}</span>
            </span>
            <input type="checkbox" checked={checked} disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600" />
        </label>
    );
}

// Campos del producto compartidos por "Nuevo producto" y "Editar producto"
export default function ProductoFormulario({
    form,
    unidades,
    categorias,
    previewImagen,
    onChange,
    onImagenChange,
    onToggleCategoria,
    puedeEditarPrecios,
    productoId,
    stockActual,
    extraGeneral,
    ayudaImagen = "JPG o PNG, máx. 5MB",
}: Props) {
    const unidadSel = unidades.find((u) => String(u.id) === form.unidad_medida_id);
    const abrev = unidadSel?.abreviatura ?? unidadSel?.nombre ?? "";
    const m = margen(form.costo_unitario, form.precio_venta);
    const [verAyudaClase, setVerAyudaClase] = useState(false);
    // Colores propios que ya usan otros productos (elegidos con «Otro color»), para repetirlos con un toque
    const [usados, setUsados] = useState<string[]>([]);
    useEffect(() => {
        getOrdenPos()
            .then((d) => setUsados([...new Set(d.productos.map((p) => p.color_pos?.toUpperCase()).filter((c): c is string => !!c))]))
            .catch(() => null);
    }, []);
    const actual = form.color_pos.toUpperCase();
    // La paleta fija, los ya usados y el que tiene este producto (aunque nadie más lo use)
    const propios = [...usados, ...(actual ? [actual] : [])].filter((c, i, a) => !COLORES_POS.includes(c) && a.indexOf(c) === i);

    const cambiarClase = (clase: ClaseProducto) => {
        Object.entries(defaultsPorClase(clase)).forEach(([k, v]) =>
            onChange(k as keyof ProductoFormInterface, v as never));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800">Información general</h2>

                    <FormField label="Nombre" required>
                        <input type="text" value={form.nombre} maxLength={300} placeholder="Ej. Pan francés"
                            onChange={(e) => onChange("nombre", e.target.value)} className={inputClass} />
                    </FormField>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="SKU" hint={productoId ? undefined : "Opcional, se genera automáticamente"}>
                            <input type="text" value={form.sku} maxLength={100} placeholder="PRD-001"
                                onChange={(e) => onChange("sku", e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Código de barras" hint="Para buscarlo con el lector en el POS">
                            <input type="text" value={form.codigo_barras} maxLength={50} inputMode="numeric"
                                onChange={(e) => onChange("codigo_barras", e.target.value)} className={inputClass} />
                        </FormField>
                    </div>

                    <FormField label="Descripción">
                        <textarea value={form.descripcion} rows={2} placeholder="Descripción del producto"
                            onChange={(e) => onChange("descripcion", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition resize-none" />
                    </FormField>

                    {extraGeneral}
                </div>

                {/* Clasificación */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-gray-800">Clasificación</h2>
                        <button type="button" onClick={() => setVerAyudaClase((v) => !v)} aria-expanded={verAyudaClase}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                                verAyudaClase ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600"
                            }`}>
                            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold">?</span>
                            ¿Qué clase elijo?
                        </button>
                    </div>
                    {verAyudaClase && (
                        <AyudaClases form={form}
                            onElegir={(a) => (Object.entries(a) as [keyof ProductoFormInterface, never][]).forEach(([k, v]) => onChange(k, v))} />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Clase" required>
                            <select value={form.clase} onChange={(e) => cambiarClase(e.target.value as ClaseProducto)} className={inputClass}>
                                {Object.entries(CLASES_PRODUCTO).map(([valor, texto]) => (
                                    <option key={valor} value={valor}>{texto}</option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Unidad de medida" required hint="En la que se cuenta el inventario">
                            <SelectBuscador value={form.unidad_medida_id ? Number(form.unidad_medida_id) : null}
                                onChange={(v) => onChange("unidad_medida_id", v ? String(v) : "")}
                                placeholder="Buscar unidad..."
                                opciones={unidades.map((u) => ({ value: u.id, label: `${u.nombre}${u.abreviatura ? ` (${u.abreviatura})` : ""}` }))} />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        <Interruptor checked={form.se_vende} onChange={(v) => onChange("se_vende", v)}
                            titulo="Se vende" descripcion="Aparece en el punto de venta" />
                        <Interruptor checked={form.controla_stock} onChange={(v) => onChange("controla_stock", v)}
                            titulo="Lleva inventario" descripcion="Descuenta existencias al venderse o usarse" />
                        <Interruptor checked={form.permite_fraccion} onChange={(v) => onChange("permite_fraccion", v)}
                            titulo="Admite decimales" descripcion="Por peso o volumen (ej. 2.5 lb)" />
                        {form.controla_stock && (
                            <Interruptor checked={form.permite_sin_existencia} onChange={(v) => onChange("permite_sin_existencia", v)}
                                titulo="Permitir vender sin existencia" descripcion="Para productos simples (Coca-Cola, golosinas): se vende aunque marque 0 y queda en negativo, aunque el negocio no permita stock negativo" />
                        )}
                        <Interruptor checked={form.consumo_interno} onChange={(v) => onChange("consumo_interno", v)}
                            titulo="Consumo interno" descripcion="Cena del personal o cortesía: sale a $0.00, no entra a caja y solo descuenta su receta" />
                        {form.se_vende && (
                            <Interruptor checked={form.imprime_comanda} onChange={(v) => onChange("imprime_comanda", v)}
                                titulo="Imprime comanda" descripcion="Apágalo si se entrega directo (coca en lata, pan de vitrina): no manda comanda a cocina ni a barra aunque su categoría tenga área" />
                        )}
                    </div>
                    {!form.controla_stock && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                            Sin inventario propio: si le creas una receta en Producción → Recetas, al venderlo se descuentan sus insumos
                            (limonada → limones, servicio de mañanitas → pastel y gorro).
                        </p>
                    )}
                </div>

                {/* Costos y precio */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-gray-800">Costo y precio</h2>
                        {!puedeEditarPrecios && (
                            <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-3 py-1">
                                Solo un administrador puede cambiar precios y costos
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        <FormField label="Costo unitario" required hint={productoId ? "Se recalcula con cada entrada con costo" : `Por ${abrev || "unidad"}`}>
                            <MoneyInput value={form.costo_unitario} prefix="$" decimals={4} disabled={!puedeEditarPrecios}
                                onChange={(v) => onChange("costo_unitario", v)} />
                        </FormField>
                        <FormField label="Precio de venta" required={form.se_vende}>
                            <MoneyInput value={form.consumo_interno ? "0" : form.precio_venta} prefix="$" disabled={!puedeEditarPrecios || form.consumo_interno}
                                onChange={(v) => onChange("precio_venta", v)} />
                        </FormField>
                        <div>
                            <span className="block text-sm font-medium text-gray-700 mb-1">Margen</span>
                            <div className={`h-[42px] flex items-center rounded-lg px-4 text-sm font-medium ${
                                !m ? "bg-gray-50 text-gray-400" : m.monto < 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                            }`}>
                                {m ? `${dinero(m.monto, "$", 2)} · ${m.porcentaje.toFixed(1)}%` : "—"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventario */}
                {form.controla_stock && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Inventario</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField label="Stock mínimo" hint="Al llegar a esta cantidad se muestra una alerta. 0 = sin alerta">
                                <MoneyInput value={form.stock_minimo} suffix={abrev} placeholder="0"
                                    decimals={form.permite_fraccion ? 4 : 0}
                                    onChange={(v) => onChange("stock_minimo", v)} />
                            </FormField>
                            {productoId !== undefined && (
                                <div>
                                    <span className="block text-sm font-medium text-gray-700 mb-1">Existencia actual</span>
                                    <div className="h-[42px] flex items-center justify-between rounded-lg bg-gray-50 px-4 text-sm">
                                        <span className="font-semibold text-gray-800">{cantidad(stockActual ?? 0, abrev)}</span>
                                        <Link to={`/admin/inventario/kardex/${productoId}`} className="text-blue-600 hover:underline">
                                            Ver kardex
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Categorías */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800">Categorías</h2>
                    {categorias.length === 0 ? (
                        <p className="text-sm text-gray-500">No hay categorías activas disponibles</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {categorias.map((c) => {
                                const selected = form.categorias.includes(c.id);
                                return (
                                    <button key={c.id} type="button" onClick={() => onToggleCategoria(c.id)}
                                        className={`px-3 py-1.5 text-sm rounded-full border transition ${
                                            selected
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                        }`}>
                                        {c.nombre}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* El área de la comanda viene de la categoría; sin área se entrega directo */}
                    {form.se_vende && (() => {
                        const area = categorias.find((c) => form.categorias.includes(c.id) && c.area)?.area;
                        return area
                            ? <p className="text-sm text-gray-600">Comanda: <span className="font-semibold text-gray-800">{area.nombre}</span></p>
                            : form.categorias.length === 0
                                ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                    Sin categoría: elige una arriba para que aparezca en su pestaña del punto de venta.
                                  </p>
                                : <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                    Sin comanda: se entrega directo y solo sale el ticket de venta (pan, postres de vitrina, bebidas embotelladas).
                                    Si hay que prepararlo, asigna un área a su categoría en Configuración › Mesas y cocina › Áreas.
                                  </p>;
                    })()}
                </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800">Imagen</h2>

                    <div className="aspect-square w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                        {previewImagen
                            ? <img src={previewImagen} alt="Vista previa" className="w-full h-full object-cover" />
                            : <span className="text-sm text-gray-400">Sin imagen</span>}
                    </div>

                    <input type="file" accept="image/jpeg,image/png,image/jpg"
                        onChange={(e) => onImagenChange(e.target.files?.[0] || null)}
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition" />
                    {form.imagen && (
                        <button type="button" onClick={() => onImagenChange(null)} className="text-sm text-red-600 hover:underline">
                            Quitar imagen
                        </button>
                    )}
                    <p className="text-xs text-gray-400">{ayudaImagen}</p>
                </div>

                {form.se_vende && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Botón en el POS</h2>

                        {/* Vista previa del botón */}
                        <div className="flex justify-center">
                            <div className="w-36 overflow-hidden rounded-xl border border-gray-200 shadow-sm"
                                style={{ borderTop: `6px solid ${form.color_pos || "#E5E7EB"}` }}>
                                <div className="h-20 bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {previewImagen
                                        ? <img src={previewImagen} alt="" className="h-full w-full object-cover" />
                                        : <span className="text-2xl" style={{ color: form.color_pos || "#9CA3AF" }}>●</span>}
                                </div>
                                <div className="p-2">
                                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{form.nombre || "Nombre"}</p>
                                    <p className="text-sm font-semibold text-blue-700">{dinero(form.precio_venta || 0)}</p>
                                </div>
                            </div>
                        </div>

                        <FormField label="Color">
                            <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => onChange("color_pos", "")} title="Sin color"
                                    className={`h-8 w-8 rounded-full border-2 bg-white text-xs text-gray-400 ${!form.color_pos ? "border-gray-800" : "border-gray-200"}`}>
                                    ✕
                                </button>
                                {[...COLORES_POS, ...propios].map((c) => (
                                    <button key={c} type="button" onClick={() => onChange("color_pos", c)} title={c}
                                        className={`h-8 w-8 rounded-full border-2 ${actual === c ? "border-gray-800" : "border-white"}`}
                                        style={{ backgroundColor: c }} />
                                ))}
                                <input type="color" value={form.color_pos || "#ffffff"} title="Otro color"
                                    onChange={(e) => onChange("color_pos", e.target.value.toUpperCase())}
                                    className="h-8 w-8 cursor-pointer rounded-full border border-gray-200 bg-white p-0" />
                            </div>
                        </FormField>

                        <OrdenPosCampo valor={form.orden_pos} nombre={form.nombre} categorias={form.categorias}
                            productoId={productoId} onChange={(v) => onChange("orden_pos", v)} />
                    </div>
                )}
            </div>
        </div>
    );
}
