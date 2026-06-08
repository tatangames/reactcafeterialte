import { useNavigate } from "react-router-dom";

import LoadingModal from "../../components/Loading/LoadingModal";
import { useProductoEditarHook } from "../../hooks/productos/useProductoEditarHook";

export default function ProductoEditar() {
    const navigate = useNavigate();
    const {
        form,
        unidades,
        categorias,
        previewImagen,
        activo,
        setActivo,
        loading,
        isSaving,
        handleChange,
        handleImagenChange,
        toggleCategoria,
        handleSubmit,
    } = useProductoEditarHook();

    return (
        <>
            <LoadingModal isOpen={loading} text="Cargando producto..." />

            <div className="p-6">
                {/* Encabezado */}
                <div className="mb-6 flex items-center gap-3">
                    <button
                        onClick={() => navigate("/admin/productos/index")}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Editar Producto</h1>
                        <p className="text-sm text-gray-500">Modifica la información del producto</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna izquierda */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Información general</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) => handleChange("nombre", e.target.value)}
                                    maxLength={300}
                                    placeholder="Nombre del producto"
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SKU
                                </label>
                                <input
                                    type="text"
                                    value={form.sku}
                                    onChange={(e) => handleChange("sku", e.target.value)}
                                    maxLength={100}
                                    placeholder="PRD-001"
                                    className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={(e) => handleChange("descripcion", e.target.value)}
                                    rows={3}
                                    placeholder="Descripción del producto"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition resize-none"
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Detalles y costos</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.tipo}
                                        onChange={(e) => handleChange("tipo", e.target.value)}
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white"
                                    >
                                        <option value="bien">Bien</option>
                                        <option value="servicio">Servicio</option>
                                        <option value="bien_servicio">Bien y Servicio</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unidad de medida <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.unidad_medida_id}
                                        onChange={(e) => handleChange("unidad_medida_id", e.target.value)}
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition bg-white"
                                    >
                                        <option value="">Selecciona...</option>
                                        {unidades.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Costo unitario <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.costo_unitario}
                                        onChange={(e) => handleChange("costo_unitario", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full h-[42px] rounded-lg border border-gray-300 px-4 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition"
                                    />
                                </div>
                            </div>

                            {/* Estado activo (solo en edición) */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    id="activo"
                                    type="checkbox"
                                    checked={activo}
                                    onChange={(e) => setActivo(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                <label htmlFor="activo" className="text-sm text-gray-700">
                                    Producto activo
                                </label>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Categorías</h2>
                            {categorias.length === 0 ? (
                                <p className="text-sm text-gray-500">No hay categorías activas disponibles</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {categorias.map((c) => {
                                        const selected = form.categorias.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => toggleCategoria(c.id)}
                                                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                                                    selected
                                                        ? "bg-blue-600 text-white border-blue-600"
                                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                {c.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna derecha: imagen */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800">Imagen</h2>

                            <div className="aspect-square w-full rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                                {previewImagen ? (
                                    <img
                                        src={previewImagen}
                                        alt="Vista previa"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">Sin imagen</span>
                                )}
                            </div>

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) =>
                                    handleImagenChange(e.target.files?.[0] || null)
                                }
                                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition"
                            />
                            <p className="text-xs text-gray-400">
                                JPG o PNG, máx. 5MB. Deja vacío para conservar la imagen actual.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        onClick={() => navigate("/admin/productos/index")}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition disabled:opacity-50"
                    >
                        {isSaving ? "Actualizando..." : "Actualizar Producto"}
                    </button>
                </div>
            </div>
        </>
    );
}